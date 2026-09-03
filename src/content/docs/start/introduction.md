---
title: Introduction
description: What RestoreLab does, and why backup verification is not enough.
sidebar:
  order: 1
---

RestoreLab automatically restores your backups into isolated environments, boots
the workloads, validates the services, measures your real recovery time, and
cleans everything up.

```text
Backup verification says:          RestoreLab says:

  ✓ Backup exists                    ✓ VM restored
  ✓ Checksum valid                   ✓ OS booted
                                     ✓ PostgreSQL started
                                     ✓ API returned HTTP 200
                                     ✓ Recovery completed in 2m06
```

A backup that restores is not the same thing as a service that comes back. The
VM boots but PostgreSQL does not start. The database starts but the schema is
inconsistent. The API answers but Redis was never restored. Recovery takes 45
minutes against a 15-minute RTO. RestoreLab tests the whole chain, on a
schedule, and proves it.

## The chain

```text
Backup exists → available → restore succeeds → guest boots → OS reachable
    → services start → application responds → dependencies usable → RTO measured
```

Every recovery drill runs against a temporary workload on an isolated network,
never against production, and every temporary resource RestoreLab creates is
stamped with ownership metadata so cleanup can never touch anything it did not
create.

That safety is not a side note; it is what makes the tool runnable against a
cluster you care about:

- **Isolated by default** — restores land on a dedicated bridge with no uplink,
  the network configuration inherited from the backup is rewritten, and a run is
  refused when isolation cannot be verified.
- **Never touches production** — every temporary resource is created by
  RestoreLab with `restorelab_managed=true` metadata, and delete refuses any
  workload that does not carry it.
- **Temporary IDs only** — restores go to a reserved VMID range (9000–9999 by
  default), never over an existing workload.
- **Cleanup always runs** — including after a failure, a timeout or a cancelled
  run; a failed cleanup is a loud, named alert, never a silent orphan.
- **An interrupted drill is never replayed** — a run whose worker died is failed
  and cleaned up, not retried. A drill is destructive and not idempotent, so
  re-running one would restore a second time and orphan the first temporary
  workload.
- **No plaintext secrets** — API tokens are sealed with AES-256-GCM under a
  master key that is never stored in the config file.
- **Least privilege by default** — `connect` creates a service account scoped to
  a dedicated resource pool, because a safe setup that takes one command is the
  one people actually deploy.

The full reasoning, including the threat model and what RestoreLab does not
protect against, is in the [security model](/reference/security/).

## Status

Alpha, under active development. The Proxmox recovery drill pipeline works end
to end behind the CLI and has been proven against a real cluster, drill history
is kept automatically, recovery plans live in the database, and the HTTP API
both serves that history and triggers new drills through a worker that drains a
queue.

The web interface is the priority, and its first half is here. The dashboard
runs the tool today: it shows what is running, what has run, what is protected
and whether the cluster is configured correctly, with a drill's phases filling
in live while it happens — and it starts drills, cancels them, destroys what
they leave behind, and writes the plan catalogue with the binary itself
validating each document as you type.

:::caution[Two things have never met real hardware]
**Proxmox Backup Server** discovery and the **network checks** are implemented
and unit-tested, but have never run against real infrastructure, because the
cluster this was built on has neither. The network checks need a route into the
isolated bridge — see [network isolation](/guides/network-isolation/).
Everything else has been driven against a live Proxmox VE 9 cluster.
:::

| Area | State |
| --- | --- |
| Proxmox VE provider (restore / harden / start / status / delete) | done |
| Proxmox Backup Server discovery | done, never run against a real PBS |
| Recovery engine (isolation, capacity, cleanup, RTO, grading) | done |
| Checks: ping, tcp, http/https, dns | done, never run against a real isolated bridge |
| In-guest checks through the QEMU guest agent (no network path needed) | done |
| CLI (`init`, `provider`, `workloads`, `backups`, `recovery`, `cleanup`) | done |
| Reports: terminal, JSON, self-contained HTML | done |
| One-command setup (`connect`) creating a least-privilege service account | done |
| `doctor` diagnostics and `network create` for the isolated bridge | done |
| Drill history, SQLite by default, PostgreSQL optional (`runs`, `db`) | done |
| HTTP API + token auth and scopes (`serve`, `token`) | done |
| Recovery confidence score, computed from the stored history | done |
| Triggering and cancelling drills over HTTP, worker, queue, live event stream | done |
| Recovery plans stored in the database, edited over HTTP or with `plan` | done |
| Browser session cookie, so a dashboard can authenticate and read the event stream | done |
| Web dashboard, served from the binary: overview, history, live drill, workloads, diagnostics | done |
| Launching and cancelling drills from the browser, and destroying what they leave behind | done |
| Writing the plan catalogue in the browser, validated by the binary as you type | done |
| First-run setup in the browser, replacing the install commands | done |
| Scheduled drills, SSH / PostgreSQL / MySQL checks, notifications | next |
| Remote probes, RBAC, OIDC | planned |

The package layout behind all of this, and the order the roadmap is being
built in, are in the [architecture reference](/reference/architecture/).

## Next

Build the binary and connect a cluster in the [quick start](/start/quick-start/).
