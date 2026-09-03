/**
 * Builds the demonstration database the dashboard screenshots are taken
 * against.
 *
 * Why a demonstration database at all: the screenshots are published on
 * restorelab.github.io. A capture taken against the author's own cluster
 * would put six real VM names, a real node name and a real endpoint on a
 * public page. So the binary is real, the dashboard is real, the rendering
 * is real — and every byte of data behind it is invented here.
 *
 * What it does, in order:
 *   1. wipes and recreates `.restorelab-demo/` (git-ignored);
 *   2. writes an isolated RestoreLab configuration there, with its own master
 *      key, its own SQLite history at `demo.db`, and one provider pointing at
 *      the stand-in cluster of `lib/fake-proxmox.mjs`;
 *   3. runs `restorelab db migrate` — the schema comes from the binary, never
 *      from CREATE TABLE statements copied into this file;
 *   4. inserts four workloads' worth of drill history with `node:sqlite`;
 *   5. creates a read-only API token and prints it on stdout.
 *
 * Everything else it says goes to stderr, so `node scripts/seed-demo.mjs`
 * pipes cleanly into a variable.
 *
 * Nothing here touches a real cluster: no `connect`, no `recovery test`, no
 * `cleanup`. The only commands run are `init`, `provider add --no-test`,
 * `db migrate` and `token create`.
 */

import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import YAML from "yaml"

import { PVE_ENDPOINT } from "./lib/fake-proxmox.mjs"
import { WORKLOADS, buildRuns, formatTime, planYAML } from "./lib/demo-data.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, "..")
export const DEMO_DIR = join(ROOT, ".restorelab-demo")
export const CONFIG_PATH = join(DEMO_DIR, "config.yaml")
export const KEY_PATH = join(DEMO_DIR, "master.key")
export const DB_PATH = join(DEMO_DIR, "demo.db")

/** The provider id the demonstration config uses. */
const PROVIDER_ID = "demo-pve"

/**
 * Where the binary lives.
 *
 * `$RESTORELAB_BIN` wins, so the script works from a checkout laid out any
 * way; the default is the sibling clone this repository is developed beside.
 */
export function restorelabBin() {
  if (process.env.RESTORELAB_BIN) return process.env.RESTORELAB_BIN
  const exe = process.platform === "win32" ? "restorelab.exe" : "restorelab"
  return resolve(ROOT, "..", "RestoreLab", "bin", exe)
}

const note = (msg) => process.stderr.write(`${msg}\n`)

/** Runs the binary, failing loudly with its own output. */
function restorelab(args, { env = {}, quiet = false } = {}) {
  const bin = restorelabBin()
  const r = spawnSync(bin, ["--config", CONFIG_PATH, "--master-key-file", KEY_PATH, "--no-color", ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  })
  if (r.error) {
    throw new Error(`could not run ${bin}: ${r.error.message}`)
  }
  if (r.status !== 0) {
    throw new Error(
      `restorelab ${args.join(" ")} failed (exit ${r.status})\n${r.stdout ?? ""}${r.stderr ?? ""}`,
    )
  }
  if (!quiet && r.stderr?.trim()) note(r.stderr.trim())
  return r.stdout ?? ""
}

/** Starts from nothing, so a rerun cannot inherit yesterday's history. */
function resetDemoDir() {
  if (existsSync(DEMO_DIR)) {
    rmSync(DEMO_DIR, { recursive: true, force: true })
  }
  mkdirSync(DEMO_DIR, { recursive: true })
}

/**
 * Adds what `init` does not: the defaults a drill needs, and the history
 * database's location.
 *
 * Written through the YAML parser rather than by hand because the file
 * already holds the provider's sealed secret, and that value must survive
 * untouched — RestoreLab refuses a config whose secret is not sealed.
 */
function completeConfig() {
  const doc = YAML.parse(readFileSync(CONFIG_PATH, "utf8"))
  doc.defaults = {
    provider: PROVIDER_ID,
    backup_provider: PROVIDER_ID,
    network: "isolated",
    node: "pve01",
    storage: "local-lvm",
  }
  // A URL rather than $RESTORELAB_DATABASE_URL, so that every command and the
  // server itself agree on the database by reading one file.
  doc.database = { url: `sqlite://${DB_PATH.replace(/\\/g, "/")}` }
  writeFileSync(CONFIG_PATH, YAML.stringify(doc), "utf8")
}

/** Writes the fabricated history into the migrated database. */
async function insertHistory() {
  const { DatabaseSync } = await import("node:sqlite")
  const db = new DatabaseSync(DB_PATH)
  try {
    db.exec("BEGIN")

    const now = new Date()
    const insertPlan = db.prepare(
      `INSERT INTO plans (id, name, description, workload_id, provider_id, plan_yaml, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const planIDs = new Map()
    WORKLOADS.forEach((w, i) => {
      const id = `plan-000${i + 1}-4a2e-9c11-b7d0e5f4a10${i + 1}`
      planIDs.set(w.name, id)
      const created = formatTime(new Date(now.getTime() - 47 * 24 * 3600 * 1000))
      insertPlan.run(
        id,
        w.plan,
        `Weekly recovery drill for ${w.name}`,
        String(w.vmid),
        PROVIDER_ID,
        planYAML(w),
        1,
        created,
        created,
      )
    })

    const insertRun = db.prepare(
      `INSERT INTO runs (
         id, plan_name, plan_snapshot, plan_id, plan_version,
         provider_id, backup_provider_id,
         source_workload_id, source_name, temp_workload_id, temp_name, node,
         backup, state, result, started_at, completed_at,
         rto_ms, rto_target_ms, cleanup_done, err,
         queued_at, lease_owner, lease_expires_at, proof_level
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insertStep = db.prepare(
      `INSERT INTO run_steps (run_id, seq, name, state, status, started_at, completed_at, duration_ms, message, err, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insertCheck = db.prepare(
      `INSERT INTO run_checks (run_id, seq, name, type, status, started_at, completed_at, duration_ms, attempts, message, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insertEvent = db.prepare(
      `INSERT INTO run_events (run_id, seq, at, state, step, status, message, check_result, err)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    const runs = buildRuns(now)
    for (const run of runs) {
      const workload = WORKLOADS.find((w) => String(w.vmid) === run.source_workload_id)
      insertRun.run(
        run.id,
        run.plan_name,
        run.plan_snapshot,
        planIDs.get(workload.name),
        1,
        run.provider_id,
        run.backup_provider_id,
        run.source_workload_id,
        run.source_name,
        run.temp_workload_id,
        run.temp_name,
        run.node,
        run.backup,
        run.state,
        run.result,
        run.started_at,
        run.completed_at,
        run.rto_ms,
        run.rto_target_ms,
        run.cleanup_done,
        run.err,
        run.queued_at,
        run.lease_owner,
        run.lease_expires_at,
        run.proof_level,
      )
      run.steps.forEach((s, seq) =>
        insertStep.run(
          run.id,
          seq,
          s.name,
          s.state,
          s.status,
          s.started_at,
          s.completed_at,
          s.duration_ms,
          s.message,
          s.err,
          s.details,
        ),
      )
      run.checks.forEach((c, seq) =>
        insertCheck.run(
          run.id,
          seq,
          c.name,
          c.type,
          c.status,
          c.started_at,
          c.completed_at,
          c.duration_ms,
          c.attempts,
          c.message,
          c.details,
        ),
      )
      run.events.forEach((e, seq) =>
        insertEvent.run(
          run.id,
          seq,
          e.at,
          e.state,
          e.step,
          e.status,
          e.message,
          e.check_result,
          e.err,
        ),
      )
    }

    db.exec("COMMIT")
    return runs
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  } finally {
    db.close()
  }
}

/**
 * Picks the drill the "drill detail" screenshot opens.
 *
 * The degraded one: it is the only run whose screen shows the whole story at
 * once — every phase done, one check red, and an RTO past its target.
 */
export function featuredRunID(runs) {
  return (
    runs.find((r) => r.result === "DEGRADED")?.id ??
    runs.find((r) => r.state === "SUCCESS")?.id ??
    runs[0].id
  )
}

/** Builds the whole demonstration environment. Returns the token and paths. */
export async function seedDemo({ operate = false } = {}) {
  note("seed: resetting .restorelab-demo/")
  resetDemoDir()

  note("seed: writing the configuration and the master key")
  restorelab(["init", "--force"], { quiet: true })

  // The secret is fictional, but it still goes through a file rather than the
  // command line: the binary warns about the latter, and rightly so.
  const secretFile = join(DEMO_DIR, "token.secret")
  writeFileSync(secretFile, "demonstration-only-not-a-credential\n", "utf8")
  restorelab(
    [
      "provider",
      "add",
      "proxmox",
      "--id",
      PROVIDER_ID,
      "--endpoint",
      PVE_ENDPOINT,
      "--token-id",
      "restorelab@pve!drills",
      "--token-secret-file",
      secretFile,
      "--node",
      "pve01",
      "--backup-storage",
      "pbs-demo",
      // The stand-in cluster is not running yet, and the seed must not depend
      // on it: the connection is exercised by screenshots.mjs instead.
      "--no-test",
    ],
    { quiet: true },
  )
  rmSync(secretFile, { force: true })
  completeConfig()

  note("seed: applying migrations")
  note(`  ${restorelab(["db", "migrate"], { quiet: true }).trim()}`)

  note("seed: inserting the drill history")
  const runs = await insertHistory()
  const finished = runs.filter((r) => r.completed_at)
  note(
    `  ${runs.length} runs (${finished.length} finished, ` +
      `${runs.filter((r) => r.result === "FAILED").length} failed, ` +
      `${runs.filter((r) => r.result === "DEGRADED").length} degraded)`,
  )

  note("seed: creating the API token")
  const out = restorelab(["token", "create", "dashboard", ...(operate ? ["--operate"] : [])], {
    quiet: true,
  })
  const token = out.match(/\brl_[A-Za-z0-9_-]+/)?.[0]
  if (!token) {
    throw new Error(`could not find the token in:\n${out}`)
  }

  return {
    token,
    configPath: CONFIG_PATH,
    keyPath: KEY_PATH,
    dbPath: DB_PATH,
    featuredRunID: featuredRunID(runs),
    runs,
  }
}

/**
 * node:sqlite is behind a flag on Node 22, and this script is also run by
 * hand. Re-exec once with the flag rather than making the caller remember it.
 */
async function main() {
  try {
    await import("node:sqlite")
  } catch {
    const r = spawnSync(
      process.execPath,
      ["--experimental-sqlite", "--no-warnings=ExperimentalWarning", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      { stdio: "inherit" },
    )
    process.exit(r.status ?? 1)
  }

  const operate = process.argv.includes("--operate")
  const { token, featuredRunID: featured } = await seedDemo({ operate })
  note(`seed: featured drill ${featured}`)
  // stdout carries the token and nothing else.
  process.stdout.write(`${token}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`${err.stack ?? err}\n`)
    process.exit(1)
  })
}
