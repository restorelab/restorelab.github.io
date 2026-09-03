/**
 * A stand-in Proxmox VE API, for screenshots only.
 *
 * RestoreLab keeps no inventory of its own: `/api/v1/workloads` and
 * `/api/v1/doctor` ask the hypervisor every time they are called. Three of
 * the five screens we photograph are therefore blank — or worse, an error
 * banner — unless something answers as a cluster.
 *
 * That something must not be the author's cluster: the images are published.
 * So this module answers the handful of read-only PVE endpoints RestoreLab
 * actually calls, out of `demo-data.mjs`. It restores nothing, starts
 * nothing, and refuses anything that is not a GET.
 */

import { createServer } from "node:http"
import {
  NETWORK_INTERFACES,
  NODES,
  STORAGES,
  WORKLOADS,
  buildBackupVolumes,
} from "./demo-data.mjs"

/** The port the demonstration cluster answers on. */
export const PVE_PORT = 8091

/** The endpoint the demonstration RestoreLab config points at. */
export const PVE_ENDPOINT = `http://127.0.0.1:${PVE_PORT}`

function clusterResources() {
  return WORKLOADS.map((w) => ({
    id: `${w.type}/${w.vmid}`,
    type: w.type,
    vmid: w.vmid,
    name: w.name,
    node: w.node,
    status: "running",
    template: 0,
    tags: w.tags,
    maxcpu: w.maxcpu,
    cpu: 0.08,
    maxmem: w.maxmem,
    mem: Math.round(w.maxmem * 0.42),
    maxdisk: w.maxdisk,
    disk: Math.round(w.maxdisk * 0.36),
    uptime: 19 * 24 * 3600,
  }))
}

function nodeStatus(node) {
  const n = NODES.find((x) => x.node === node) ?? NODES[0]
  return {
    uptime: n.uptime,
    cpu: n.cpu,
    cpuinfo: { cpus: n.maxcpu, model: "Generic x86_64" },
    memory: { total: n.maxmem, used: n.mem, free: n.maxmem - n.mem },
    rootfs: { total: n.maxdisk, used: n.disk, free: n.maxdisk - n.disk },
  }
}

function workloadStatus(vmid) {
  const w = WORKLOADS.find((x) => String(x.vmid) === String(vmid))
  if (!w) return null
  return {
    vmid: w.vmid,
    name: w.name,
    status: "running",
    qmpstatus: "running",
    uptime: 19 * 24 * 3600,
    cpu: 0.08,
    cpus: w.maxcpu,
    maxmem: w.maxmem,
    mem: Math.round(w.maxmem * 0.42),
    maxdisk: w.maxdisk,
    agent: 1,
  }
}

/**
 * Routes one PVE path to its answer.
 *
 * Returns `undefined` for anything unknown, which the server turns into a
 * 501 rather than an empty 200: a silent empty answer would show up as an
 * empty screen and cost an hour to explain.
 */
function route(pathname, query, volumes) {
  const p = pathname.replace(/^\/api2\/json/, "")
  const parts = p.split("/").filter(Boolean)

  if (p === "/version") {
    return { version: "9.0.6", release: "9.0", repoid: "demo0000" }
  }
  if (p === "/nodes") return NODES
  if (p === "/cluster/resources") return clusterResources()
  if (p === "/cluster/nextid") return "9101"
  if (p === "/access/permissions") return {}

  // /nodes/{node}/...
  if (parts[0] === "nodes" && parts.length >= 2) {
    const node = parts[1]
    const rest = parts.slice(2)

    if (rest.length === 0) return {}
    if (rest[0] === "status") return nodeStatus(node)
    if (rest[0] === "network") return NETWORK_INTERFACES
    if (rest[0] === "tasks") return []

    if (rest[0] === "storage" && rest.length === 1) return STORAGES
    if (rest[0] === "storage" && rest[2] === "content") {
      const storage = rest[1]
      const wanted = query.get("content")
      const vmid = query.get("vmid")
      return volumes.filter(
        (v) =>
          v.storage === storage &&
          (!wanted || v.content === wanted) &&
          (!vmid || String(v.vmid) === String(vmid)),
      )
    }

    // /nodes/{node}/{qemu|lxc}/{vmid}/...
    if ((rest[0] === "qemu" || rest[0] === "lxc") && rest.length >= 2) {
      const vmid = rest[1]
      const tail = rest.slice(2).join("/")
      if (tail === "status/current") return workloadStatus(vmid)
      if (tail === "config") {
        const w = WORKLOADS.find((x) => String(x.vmid) === String(vmid))
        return w ? { name: w.name, cores: w.maxcpu, memory: w.maxmem / 1024 / 1024, net0: "virtio,bridge=vmbr0" } : {}
      }
      if (tail === "snapshot") return []
    }
  }

  return undefined
}

/**
 * Starts the stand-in cluster on loopback.
 *
 * Resolves to a handle with `close()` and the list of paths it was asked for
 * but did not know — useful when a new screen starts calling a new endpoint.
 */
export function startFakeProxmox({ port = PVE_PORT, log = () => {} } = {}) {
  const volumes = buildBackupVolumes()
  const unknown = []

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`)

    // Read-only by construction. Nothing here can create, start or destroy
    // anything, and a write attempt is a bug worth failing loudly on.
    if (req.method !== "GET") {
      res.writeHead(405, { "content-type": "application/json" })
      res.end(JSON.stringify({ data: null, errors: { method: "read-only demo cluster" } }))
      log(`fake-pve: refused ${req.method} ${url.pathname}`)
      return
    }

    const data = route(url.pathname, url.searchParams, volumes)
    if (data === undefined) {
      unknown.push(url.pathname)
      res.writeHead(501, { "content-type": "application/json" })
      res.end(JSON.stringify({ data: null, errors: { path: "not implemented by the demo cluster" } }))
      log(`fake-pve: 501 ${url.pathname}`)
      return
    }

    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ data }))
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", () => {
      log(`fake-pve: listening on http://127.0.0.1:${port}`)
      resolve({
        unknown,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections?.()
            server.close(() => done())
          }),
      })
    })
  })
}
