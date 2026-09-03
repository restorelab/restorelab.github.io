/**
 * The demonstration cluster.
 *
 * Everything the screenshots show comes from here: a fictional two-node
 * Proxmox cluster, four workloads with generic names, and six weeks of drill
 * history. Nothing in this file describes any real infrastructure — no real
 * host name, no real VM name, no IP address at all. The screenshots go on a
 * public website, so that constraint is the whole point of the module.
 *
 * The data is deterministic: same input, same PNGs. Timestamps are the only
 * moving part, and they are anchored on the moment the seed runs so that
 * "3 days ago" keeps meaning three days ago.
 */

const GiB = 1024 ** 3
const MiB = 1024 ** 2

/** The nodes the fictional cluster runs on. */
export const NODES = [
  {
    node: "pve01",
    status: "online",
    maxcpu: 16,
    cpu: 0.17,
    maxmem: 64 * GiB,
    mem: 38 * GiB,
    maxdisk: 460 * GiB,
    disk: 121 * GiB,
    uptime: 61 * 24 * 3600,
  },
  {
    node: "pve02",
    status: "online",
    maxcpu: 16,
    cpu: 0.09,
    maxmem: 64 * GiB,
    mem: 21 * GiB,
    maxdisk: 460 * GiB,
    disk: 88 * GiB,
    uptime: 61 * 24 * 3600,
  },
]

/** The node RestoreLab talks to by default. */
export const DEFAULT_NODE = "pve01"

/** The storages every node advertises. */
export const STORAGES = [
  {
    storage: "local",
    type: "dir",
    content: "backup,iso,vztmpl",
    active: 1,
    enabled: 1,
    shared: 0,
    total: 420 * GiB,
    used: 96 * GiB,
  },
  {
    storage: "local-lvm",
    type: "lvmthin",
    content: "images,rootdir",
    active: 1,
    enabled: 1,
    shared: 0,
    total: 1800 * GiB,
    used: 640 * GiB,
  },
  {
    storage: "pbs-demo",
    type: "pbs",
    content: "backup",
    active: 1,
    enabled: 1,
    shared: 1,
    total: 4000 * GiB,
    used: 1180 * GiB,
  },
  // Deliberately down: a diagnostic screen where every line is green shows
  // nothing about what the diagnostic is for.
  {
    storage: "nfs-archive",
    type: "nfs",
    content: "backup",
    active: 0,
    enabled: 1,
    shared: 1,
    total: 8000 * GiB,
    used: 5100 * GiB,
  },
]

/** The network interfaces each node reports. */
export const NETWORK_INTERFACES = [
  { iface: "enp1s0", type: "eth", active: 1, autostart: 1 },
  {
    iface: "vmbr0",
    type: "bridge",
    active: 1,
    autostart: 1,
    bridge_ports: "enp1s0",
  },
  // The isolated bridge a drill restores onto: no ports, no gateway. This is
  // what makes the network finding come back green.
  {
    iface: "vmbr99",
    type: "bridge",
    active: 1,
    autostart: 1,
    bridge_ports: "",
  },
]

/** The isolated network profile the demonstration config declares. */
export const ISOLATED_BRIDGE = "vmbr99"

/**
 * The four workloads.
 *
 * `plan` and `rto` describe the drill history generated below rather than the
 * cluster itself; keeping them here is what makes one workload one entry.
 */
export const WORKLOADS = [
  {
    vmid: 101,
    name: "postgres-prod",
    node: "pve01",
    type: "qemu",
    maxcpu: 8,
    maxmem: 16 * GiB,
    maxdisk: 512 * GiB,
    tags: "database;production",
    plan: "postgres-prod-nightly",
    // The slowest workload of the four, and the only one with a target tight
    // enough to be missed.
    rtoTargetMs: 180_000,
    rtoRangeMs: [148_000, 176_000],
    backupBytes: 41 * GiB,
    checks: [
      { name: "postgres port", type: "tcp", message: "port 5432 accepted a connection" },
      {
        name: "pg_isready",
        type: "command",
        message: "pg_isready reported: accepting connections",
      },
      {
        name: "row count",
        type: "command",
        message: "public.orders holds 4 812 397 rows",
      },
    ],
  },
  {
    vmid: 102,
    name: "api-gateway",
    node: "pve01",
    type: "qemu",
    maxcpu: 4,
    maxmem: 8 * GiB,
    maxdisk: 64 * GiB,
    tags: "api;production",
    plan: "api-gateway-weekly",
    rtoTargetMs: 300_000,
    rtoRangeMs: [54_000, 82_000],
    backupBytes: 6 * GiB,
    checks: [
      { name: "ssh", type: "tcp", message: "port 22 accepted a connection" },
      { name: "health endpoint", type: "http", message: "GET /healthz returned 200" },
      { name: "upstream probe", type: "http", message: "GET /v1/status returned 200" },
    ],
  },
  {
    vmid: 103,
    name: "redis-cache",
    node: "pve02",
    type: "lxc",
    maxcpu: 2,
    maxmem: 4 * GiB,
    maxdisk: 32 * GiB,
    tags: "cache;production",
    plan: "redis-cache-weekly",
    rtoTargetMs: 120_000,
    // The fastest of the four: a container with almost nothing on its disk.
    rtoRangeMs: [27_000, 41_000],
    backupBytes: 900 * MiB,
    checks: [
      { name: "redis port", type: "tcp", message: "port 6379 accepted a connection" },
      { name: "PING", type: "command", message: "redis-cli PING returned PONG" },
    ],
  },
  {
    vmid: 104,
    name: "web-frontend",
    node: "pve02",
    type: "qemu",
    maxcpu: 4,
    maxmem: 8 * GiB,
    maxdisk: 120 * GiB,
    tags: "web;production",
    plan: "web-frontend-weekly",
    rtoTargetMs: 300_000,
    rtoRangeMs: [92_000, 138_000],
    backupBytes: 14 * GiB,
    checks: [
      { name: "ssh", type: "tcp", message: "port 22 accepted a connection" },
      { name: "homepage", type: "http", message: "GET / returned 200" },
      { name: "asset bundle", type: "http", message: "GET /assets/app.js returned 200" },
    ],
  },
]

/** The workflow phases a drill goes through, as the engine names them. */
export const STEPS = [
  { name: "discover_backup", state: "DISCOVERING_BACKUP", share: 0.03 },
  { name: "prepare_environment", state: "PREPARING_ENVIRONMENT", share: 0.04 },
  { name: "restore", state: "RESTORING", share: 0.62 },
  { name: "start", state: "STARTING", share: 0.05 },
  { name: "wait_for_guest", state: "WAITING_FOR_GUEST", share: 0.17 },
  { name: "run_checks", state: "RUNNING_CHECKS", share: 0.09 },
]

/**
 * A small deterministic generator.
 *
 * Math.random would give a different history — and therefore different PNGs —
 * on every run, which makes reviewing a regenerated screenshot impossible.
 */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** RestoreLab's fixed-width timestamp format, as internal/store writes it. */
export function formatTime(date) {
  return `${date.toISOString().replace(/\.(\d{3})Z$/, ".$1000000Z")}`
}

/** A stable, uuid-shaped run id. Deterministic, so reruns keep the same ids. */
function runID(index) {
  const n = (index + 1).toString(16).padStart(4, "0")
  const block = (index * 2654435761) >>> 0
  const hex = block.toString(16).padStart(8, "0")
  return `${hex}-${n}-4d1c-9f${n.slice(0, 2)}-${hex}${n}00`
}

/** The plan document stored beside every run, and in the plan catalogue. */
export function planYAML(workload) {
  return [
    `name: ${workload.plan}`,
    `workload: "${workload.vmid}"`,
    "restore:",
    "  network: isolated",
    "  storage: local-lvm",
    "checks:",
    ...workload.checks.flatMap((c) => [
      `  - name: ${c.name}`,
      `    type: ${c.type}`,
      "    timeout: 60s",
    ]),
    `rto_target: ${Math.round(workload.rtoTargetMs / 1000)}s`,
    "cleanup:",
    "  always: true",
    "",
  ].join("\n")
}

/**
 * Six weeks of drill history.
 *
 * One drill per workload per week, oldest first, plus one still in flight.
 * The outcomes are not uniform on purpose: a screenshot of a dashboard where
 * every row is green says nothing about what the dashboard is for. Exactly
 * one drill failed outright and exactly one came back degraded, and both are
 * recent enough to appear on the overview's ten most recent rows.
 */
export function buildRuns(now = new Date()) {
  const rnd = mulberry32(0x5e5d)
  const runs = []
  let index = 0

  // week 5 is six weeks ago, week 0 is the most recent completed week.
  for (let week = 5; week >= 0; week--) {
    for (const workload of WORKLOADS) {
      const dayOffset = WORKLOADS.indexOf(workload) * 1.5
      const startedAt = new Date(
        now.getTime() - (week * 7 + dayOffset + 1.4) * DAY_MS - rnd() * 3 * 3600 * 1000,
      )

      // The two blemishes, placed where the overview will show them.
      const failed = workload.name === "web-frontend" && week === 0
      const degraded = workload.name === "postgres-prod" && week === 0

      const [lo, hi] = workload.rtoRangeMs
      let rtoMS = Math.round(lo + rnd() * (hi - lo))
      if (degraded) {
        // Over target, which is what makes the result degraded rather than a
        // clean success.
        rtoMS = workload.rtoTargetMs + 41_000
      }

      runs.push(
        buildRun({
          id: runID(index++),
          workload,
          startedAt,
          rtoMS,
          outcome: failed ? "FAILED" : degraded ? "DEGRADED" : "SUCCESS",
        }),
      )
    }
  }

  // One drill still going, so the overview has something in its "Running"
  // card and the history shows a live row.
  const live = WORKLOADS[1]
  runs.push(
    buildRun({
      id: runID(index++),
      workload: live,
      startedAt: new Date(now.getTime() - 47_000),
      rtoMS: 0,
      outcome: "RUNNING",
    }),
  )

  return runs
}

/** One drill: the row, its phases, its checks and its event stream. */
function buildRun({ id, workload, startedAt, rtoMS, outcome }) {
  const tempID = String(9000 + (workload.vmid % 100))
  const backupAt = new Date(startedAt.getTime() - 9 * 3600 * 1000)
  const backup = {
    ID: `pbs-demo:backup/vm/${workload.vmid}/${backupAt.toISOString().slice(0, 19)}Z`,
    WorkloadID: String(workload.vmid),
    ProviderID: "demo-pve",
    Datastore: "pbs-demo",
    Node: workload.node,
    CreatedAt: backupAt.toISOString(),
    SizeBytes: workload.backupBytes,
    Protected: false,
    Encrypted: true,
    Verified: "ok",
    Format: "pbs-vm",
    Notes: "",
  }

  const run = {
    id,
    plan_name: workload.plan,
    plan_snapshot: planYAML(workload),
    provider_id: "demo-pve",
    backup_provider_id: "demo-pve",
    source_workload_id: String(workload.vmid),
    source_name: workload.name,
    temp_workload_id: tempID,
    temp_name: `restorelab-${workload.vmid}`,
    node: workload.node,
    backup: JSON.stringify(backup),
    rto_target_ms: workload.rtoTargetMs,
    err: null,
    queued_at: formatTime(new Date(startedAt.getTime() - 2000)),
    lease_owner: null,
    lease_expires_at: null,
    steps: [],
    checks: [],
    events: [],
  }

  if (outcome === "RUNNING") {
    // A drill mid-flight: the phases before the checks are done, the checks
    // phase is running, and nothing after it exists yet.
    run.state = "RUNNING_CHECKS"
    run.result = null
    run.started_at = formatTime(startedAt)
    run.completed_at = null
    run.rto_ms = 0
    run.cleanup_done = 0
    run.lease_owner = "worker-01"
    run.lease_expires_at = formatTime(new Date(Date.now() + 25_000))

    let cursor = startedAt.getTime()
    const partial = [
      { step: STEPS[0], ms: 1_400 },
      { step: STEPS[1], ms: 2_100 },
      { step: STEPS[2], ms: 31_000 },
      { step: STEPS[3], ms: 2_600 },
      { step: STEPS[4], ms: 8_900 },
    ]
    for (const { step, ms } of partial) {
      run.steps.push(
        makeStep(step, "done", cursor, ms, stepMessage(step.name, workload, tempID, backup)),
      )
      run.events.push(makeEvent(step, "done", cursor + ms))
      cursor += ms
    }
    run.steps.push(makeStep(STEPS[5], "running", cursor, 0, ""))
    run.events.push(makeEvent(STEPS[5], "running", cursor))
    run.checks.push(
      makeCheck(workload.checks[0], "pass", cursor + 900, 1_200, 1),
    )
    return run
  }

  const durations = STEPS.map((s) => Math.max(700, Math.round(rtoMS * s.share)))
  let cursor = startedAt.getTime()

  const failingStep = outcome === "FAILED" ? 4 : -1

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    if (failingStep >= 0 && i > failingStep) break

    const ms = durations[i]
    if (i === failingStep) {
      run.steps.push(
        makeStep(
          step,
          "failed",
          cursor,
          ms,
          "",
          "the guest agent never answered within 180s",
        ),
      )
      run.events.push(makeEvent(step, "failed", cursor + ms))
      cursor += ms
      continue
    }

    run.steps.push(
      makeStep(step, "done", cursor, ms, stepMessage(step.name, workload, tempID, backup)),
    )
    run.events.push(makeEvent(step, "done", cursor + ms))
    cursor += ms
  }

  // The checks, when the workload got far enough to run any.
  if (outcome !== "FAILED") {
    let checkCursor = cursor - durations[5]
    workload.checks.forEach((check, i) => {
      // The degraded drill is degraded because one non-critical check came
      // back red while everything else passed.
      const failing = outcome === "DEGRADED" && i === workload.checks.length - 1
      const ms = 300 + i * 420
      run.checks.push(
        makeCheck(
          failing
            ? {
                ...check,
                message: "the replica lagged 42s behind at the end of the window",
              }
            : check,
          failing ? "fail" : "pass",
          checkCursor,
          ms,
          failing ? 3 : 1,
        ),
      )
      checkCursor += ms
    })
  }

  // Cleanup always runs, even after a failure: that is the point of it.
  const cleanupMS = 4_000 + Math.round(rtoMS * 0.02)
  run.steps.push(
    makeStep(
      { name: "cleanup", state: "CLEANING_UP" },
      "done",
      cursor,
      cleanupMS,
      `destroyed temporary workload ${tempID} on ${workload.node}`,
    ),
  )
  run.events.push(makeEvent({ name: "cleanup", state: "CLEANING_UP" }, "done", cursor + cleanupMS))
  const completedAt = new Date(cursor + cleanupMS)

  run.state = outcome === "FAILED" ? "FAILED" : "SUCCESS"
  run.result = outcome === "FAILED" ? "FAILED" : outcome === "DEGRADED" ? "DEGRADED" : "SUCCESS"
  run.started_at = formatTime(startedAt)
  run.completed_at = formatTime(completedAt)
  run.rto_ms = outcome === "FAILED" ? 0 : rtoMS
  run.cleanup_done = 1
  run.err =
    outcome === "FAILED"
      ? "wait_for_guest: the guest agent never answered within 180s"
      : null

  return run
}

function stepMessage(name, workload, tempID, backup) {
  switch (name) {
    case "discover_backup":
      return `latest backup is 9h00m00s old (${backup.Datastore})`
    case "prepare_environment":
      return `bridge ${ISOLATED_BRIDGE} verified isolated on ${workload.node}`
    case "restore":
      return `restored into workload ${tempID} on ${workload.node}`
    case "start":
      return `workload ${tempID} started`
    case "wait_for_guest":
      return "guest agent answered"
    case "run_checks":
      return ""
    default:
      return ""
  }
}

function makeStep(step, status, startMS, durationMS, message, err) {
  return {
    name: step.name,
    state: step.state,
    status,
    started_at: formatTime(new Date(startMS)),
    completed_at: status === "running" ? null : formatTime(new Date(startMS + durationMS)),
    duration_ms: status === "running" ? 0 : durationMS,
    message: message || null,
    err: err || null,
    details: null,
  }
}

function makeCheck(check, status, startMS, durationMS, attempts) {
  return {
    name: check.name,
    type: check.type,
    status,
    started_at: formatTime(new Date(startMS)),
    completed_at: formatTime(new Date(startMS + durationMS)),
    duration_ms: durationMS,
    attempts,
    message: check.message,
    details: null,
  }
}

function makeEvent(step, status, atMS) {
  return {
    at: formatTime(new Date(atMS)),
    state: step.state,
    step: step.name,
    status,
    message: null,
    check_result: null,
    err: null,
  }
}

/**
 * The backup volumes the fake cluster advertises.
 *
 * Seven daily restore points per workload on the PBS datastore, three weekly
 * ones on the local directory storage. `restorelab doctor` counts these.
 */
export function buildBackupVolumes(now = new Date()) {
  const out = []
  for (const workload of WORKLOADS) {
    for (let day = 0; day < 7; day++) {
      const at = new Date(now.getTime() - (day * DAY_MS + 9 * 3600 * 1000))
      out.push({
        storage: "pbs-demo",
        volid: `pbs-demo:backup/vm/${workload.vmid}/${at.toISOString().slice(0, 19)}Z`,
        content: "backup",
        vmid: workload.vmid,
        ctime: Math.floor(at.getTime() / 1000),
        size: workload.backupBytes,
        format: "pbs-vm",
        encrypted: 1,
        verification: { state: "ok" },
      })
    }
    for (let week = 1; week <= 3; week++) {
      const at = new Date(now.getTime() - week * 7 * DAY_MS)
      const stamp = at.toISOString().slice(0, 19).replace("T", "-").replace(/:/g, "_")
      out.push({
        storage: "local",
        volid: `local:backup/vzdump-${workload.type}-${workload.vmid}-${stamp}.vma.zst`,
        content: "backup",
        vmid: workload.vmid,
        ctime: Math.floor(at.getTime() / 1000),
        size: Math.round(workload.backupBytes * 0.92),
        format: "vma.zst",
      })
    }
  }
  return out
}
