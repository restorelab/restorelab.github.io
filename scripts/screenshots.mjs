/**
 * Photographs the real dashboard against the demonstration database.
 *
 * The pipeline, end to end:
 *   1. `lib/fake-proxmox.mjs` answers on 127.0.0.1:8091 as a two-node cluster;
 *   2. `seed-demo.mjs` builds `.restorelab-demo/` and hands back a read token;
 *   3. the real `restorelab serve` runs on 127.0.0.1:8090 against that
 *      database, with no worker — nothing may execute a drill here;
 *   4. Chromium opens the dashboard twice, once light and once dark, and
 *      writes ten PNGs into `public/img/dashboard/`.
 *
 * Port 8090 rather than 8080: 8080 is taken on the development machine.
 * Loopback rather than a hostname: the session endpoint requires TLS
 * everywhere else, and loopback is the documented exception.
 *
 * The server is killed in a `finally`, including when a capture throws.
 */

import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "..")
const OUT_DIR = join(ROOT, "public", "img", "dashboard")

const LISTEN = "127.0.0.1:8090"
const BASE = `http://${LISTEN}`

const VIEWPORT = { width: 1440, height: 900 }
const SCALE = 2

/**
 * The five screens, in the order the landing page shows them.
 *
 * `expect` is not decoration: it is the check that turns "a PNG exists" into
 * "the PNG shows what it claims to". A sign-in form or an error banner has
 * none of these strings on it, so the capture fails instead of shipping.
 */
const SCREENS = [
  { name: "overview", path: () => "/", expect: ["postgres-prod", "Overview"] },
  { name: "history", path: () => "/runs", expect: ["web-frontend", "redis-cache"] },
  {
    name: "drill",
    path: (ctx) => `/runs/${ctx.featuredRunID}`,
    expect: ["postgres-prod", "restore"],
  },
  { name: "workloads", path: () => "/workloads", expect: ["api-gateway", "pve02"] },
  { name: "diagnostics", path: () => "/doctor", expect: ["vmbr99", "node(s)"] },
]

const THEMES = ["light", "dark"]

const note = (msg) => process.stderr.write(`${msg}\n`)

/** Polls the health endpoint until the API answers, or gives up. */
async function waitForHealth(timeoutMS = 30_000) {
  const deadline = Date.now() + timeoutMS
  let lastErr
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/v1/health`)
      if (res.ok) return await res.json()
      lastErr = new Error(`health answered ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`the API never became healthy on ${BASE}: ${lastErr?.message ?? "timeout"}`)
}

/** Starts `restorelab serve`, with no worker: this process executes nothing. */
function startServer({ bin, configPath, keyPath }) {
  const child = spawn(
    bin,
    [
      "--config",
      configPath,
      "--master-key-file",
      keyPath,
      "--no-color",
      "serve",
      "--listen",
      LISTEN,
      // The demonstration database holds one drill frozen mid-flight. A
      // worker would try to finish it — against a cluster that does not
      // exist. Nothing here may execute anything.
      "--no-worker",
      "--worker-elsewhere",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  )
  child.stdout.on("data", (d) => note(`  serve: ${String(d).trimEnd()}`))
  child.stderr.on("data", (d) => note(`  serve: ${String(d).trimEnd()}`))
  return child
}

/** Ends the server for good, children included. */
function stopServer(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
  } else {
    child.kill("SIGTERM")
  }
}

/**
 * Opens a browser context already signed in and already themed.
 *
 * The theme is not a media query alone. `useTheme` reads
 * `localStorage["restorelab.theme"]` first and only falls back to
 * `prefers-color-scheme`, then toggles the `dark` class on <html>. Seeding
 * the key before any script runs is what makes the choice deterministic;
 * emulateMedia is set as well so that anything reading the media query
 * directly agrees with it.
 */
async function openContext(browser, { theme, token }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: theme,
    reducedMotion: "reduce",
    baseURL: BASE,
    // The dashboard formats its dates with the browser's locale and zone.
    // Left to the machine, the same screen comes out "1 sept. 2026" here and
    // "Sep 1, 2026" in CI — pinned so a regenerated PNG differs only where
    // the dashboard did.
    locale: "en-US",
    timezoneId: "UTC",
  })
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        /* a context without storage still gets the media query */
      }
    },
    ["restorelab.theme", theme],
  )

  const page = await context.newPage()
  await page.goto("/login", { waitUntil: "domcontentloaded" })

  // Exchanged from inside the page: the session endpoint refuses a
  // cookie-setting POST whose Origin is not the host it is serving.
  const status = await page.evaluate(async (secret) => {
    const res = await fetch("/api/v1/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: secret }),
    })
    return res.status
  }, token)
  if (status !== 200 && status !== 201) {
    throw new Error(`POST /api/v1/session answered ${status}`)
  }
  await page.close()
  return context
}

/** Waits until the screen has finished arriving, then proves it is the right one. */
async function settle(page, screen) {
  // The dashboard polls every 5s, so "no request in flight" is reachable but
  // never permanent. A failure here is not fatal on its own — the assertions
  // below are what actually gate the capture.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

  // The diagnostic screen is the one that renders a skeleton while it waits.
  await page
    .waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, null, {
      timeout: 15_000,
    })
    .catch(() => {})

  for (const needle of screen.expect) {
    await page.waitForFunction(
      (text) => (document.querySelector("body")?.innerText ?? "").includes(text),
      needle,
      { timeout: 15_000 },
    )
  }

  // Fonts and any last layout shift.
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(400)
}

/** Captures the five screens in one theme. */
async function captureTheme(browser, { theme, token, featuredRunID }) {
  const context = await openContext(browser, { theme, token })
  try {
    const page = await context.newPage()
    for (const screen of SCREENS) {
      const path = screen.path({ featuredRunID })
      await page.goto(path, { waitUntil: "domcontentloaded" })
      try {
        await settle(page, screen)
      } catch (err) {
        const body = await page.evaluate(() => document.body?.innerText?.slice(0, 400) ?? "")
        throw new Error(
          `${screen.name}-${theme}: ${path} never showed what it should.\n` +
            `${err.message}\n--- what the page showed ---\n${body}`,
        )
      }
      const file = join(OUT_DIR, `${screen.name}-${theme}.png`)
      await page.screenshot({ path: file })
      note(`  captured ${screen.name}-${theme}.png`)
    }
  } finally {
    await context.close()
  }
}

/** Refuses to call a run successful on the strength of a file existing. */
function verifyOutput() {
  const expected = SCREENS.flatMap((s) => THEMES.map((t) => `${s.name}-${t}.png`))
  const present = new Set(readdirSync(OUT_DIR))
  const missing = expected.filter((f) => !present.has(f))
  if (missing.length > 0) {
    throw new Error(`missing captures: ${missing.join(", ")}`)
  }
  for (const f of expected) {
    const size = statSync(join(OUT_DIR, f)).size
    if (size < 20_000) {
      throw new Error(`${f} is only ${size} bytes: that is not a rendered dashboard`)
    }
  }
  note(`\n${expected.length} captures in public/img/dashboard/`)
}

async function main() {
  // node:sqlite is behind a flag on Node 22 and the seed needs it.
  try {
    await import("node:sqlite")
  } catch {
    const r = spawnSync(
      process.execPath,
      [
        "--experimental-sqlite",
        "--no-warnings=ExperimentalWarning",
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
      ],
      { stdio: "inherit" },
    )
    process.exit(r.status ?? 1)
  }

  const { chromium } = await import("playwright")
  const { startFakeProxmox, PVE_PORT } = await import("./lib/fake-proxmox.mjs")
  const { seedDemo, restorelabBin } = await import("./seed-demo.mjs")

  mkdirSync(OUT_DIR, { recursive: true })

  let cluster
  let server
  let browser
  try {
    note(`starting the stand-in cluster on 127.0.0.1:${PVE_PORT}`)
    cluster = await startFakeProxmox({ log: note })

    // The session the captures use carries the operate scope, so the screens
    // show the buttons the README lists as done — launching a drill from the
    // browser, cancelling one, cleaning up after it. A read-only session
    // renders the same screens with those affordances silently absent, which
    // would make the landing page understate the product. `seed-demo.mjs`
    // still prints a read-only token when it is run on its own.
    const demo = await seedDemo({ operate: !process.argv.includes("--read-only") })

    note(`starting restorelab serve on ${LISTEN}`)
    server = startServer({
      bin: restorelabBin(),
      configPath: demo.configPath,
      keyPath: demo.keyPath,
    })
    server.on("exit", (code) => {
      if (code !== null && code !== 0) note(`  serve exited with ${code}`)
    })
    const health = await waitForHealth()
    note(`  ${health.version}`)

    browser = await chromium.launch()
    for (const theme of THEMES) {
      note(`capturing the ${theme} theme`)
      await captureTheme(browser, {
        theme,
        token: demo.token,
        featuredRunID: demo.featuredRunID,
      })
    }

    if (cluster.unknown.length > 0) {
      note(`note: the cluster stand-in did not implement ${[...new Set(cluster.unknown)].join(", ")}`)
    }
    verifyOutput()
  } finally {
    await browser?.close().catch(() => {})
    stopServer(server)
    await cluster?.close()
  }
}

main().catch((err) => {
  process.stderr.write(`${err.stack ?? err}\n`)
  process.exit(1)
})
