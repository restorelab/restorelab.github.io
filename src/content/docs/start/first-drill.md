---
title: Your first drill
description: A recovery drill commented phase by phase, from backup discovery to cleanup.
sidebar:
  order: 3
---

A drill restores a workload's latest backup into an isolated environment, boots
it, runs the requested checks, measures the recovery time, and destroys the
temporary workload. Nothing about the production workload is touched.

```bash
bin/restorelab recovery test 101
```

With no `--check`, a TCP check on port 22 is used: it proves the guest booted,
configured its network, and started a service.

```text
[✓] Connected to Proxmox
[✓] VM 101 found
[✓] Backup found
[✓] Restore started
[✓] Temporary VM created
[✓] VM booted
[✓] TCP/22 reachable
[✓] VM removed

Recovery successful
RTO: 2m17s
```

## What happens, phase by phase

The engine is a linear state machine with one guarantee: from the moment a
temporary workload might exist, cleanup runs: on success, on failure, on
timeout, on cancellation, on panic.

```text
QUEUED
  ↓ discover_backup        resolve latest/specific, enforce max_age
DISCOVERING_BACKUP
  ↓ prepare_environment    verify isolation, verify capacity, allocate temp ID
PREPARING_ENVIRONMENT
  ↓ restore                create temp workload, wait for the task,
RESTORING                    then harden it (network rewrite, limits, metadata)
  ↓ start
STARTING
  ↓ wait_for_guest         poll status until powered on and addressable
WAITING_FOR_GUEST
  ↓ run_checks             ping / tcp / http / dns, with retries
RUNNING_CHECKS
  ↓ generate_report
GENERATING_REPORT
  ↓ cleanup                stop + delete, on a detached context
CLEANING_UP
  ↓
SUCCESS | DEGRADED | FAILED | CLEANUP_FAILED
```

Line by line, against the output above:

**`Connected to Proxmox`**: the provider RestoreLab was configured with
answered. If several are configured, `--provider` picks one.

**`VM 101 found`**: the workload id you passed resolves to a real workload on
the cluster. This is the production VM, and it is read, never written.

**`Backup found`**: `discover_backup`. The latest restore point is resolved,
and its age is checked against the plan's `max_age`. A backup older than the
plan allows fails the run here, before anything is created. That is the point:
a drill that quietly restored a three-week-old snapshot would report a recovery
that nobody could actually use.

**`Restore started`**: `prepare_environment` has already run at this point.
Isolation is verified, capacity is verified, and a temporary id is allocated
from the reserved range, `9000–9999` by default. A run is refused when isolation
cannot be verified; see [network isolation](/guides/network-isolation/).

**`Temporary VM created`**: `restore` finished, and the temporary workload was
hardened: the network configuration inherited from the backup is rewritten onto
the isolated bridge, CPU and memory limits are applied, and the
`restorelab_managed=true` metadata is stamped on. That metadata is what lets
delete refuse anything RestoreLab did not create.

**`VM booted`**: `start`, then `wait_for_guest`: the status is polled until the
workload is powered on and addressable.

**`TCP/22 reachable`**: `run_checks`. Each check is retried on its own schedule
before it is called failed, because a service that needs eleven seconds to bind
is a service that came back.

**`VM removed`**: `cleanup`. Stop, then delete, on a detached context, so a
cancelled or timed-out run still cleans up after itself. A cleanup that fails
settles the run as `CLEANUP_FAILED`, with the node and the id in the error: a
loud orphan rather than a silent one.

**`Recovery successful` / `RTO: 2m17s`**: the verdict. RTO is measured from the
start of the run to the end of the checks. Cleanup and report generation are
excluded: they are RestoreLab's housekeeping, not part of the recovery a
business would experience.

## How a drill is graded

| Verdict | When |
| --- | --- |
| `SUCCESS` | every critical check passed and the RTO target was met |
| `DEGRADED` | recovered, but a non-critical check failed or the RTO target was exceeded |
| `FAILED` | a step failed, or a critical check failed |

A drill is destructive and not idempotent, so nothing is ever replayed. A run
whose worker died is settled as failed and cleaned up, never retried: running it
again would allocate a second temporary id, restore a second time, and orphan
the first workload.

## Checking more than a port

`--check` is repeatable, and one of the check types needs no route into the
isolated network at all:

```bash
bin/restorelab recovery test 101 \
  --check 'cmd:systemctl is-active postgresql' \
  --check tcp:22 \
  --check 'http://{{ .ip }}:8080/health'
```

A `cmd:` check runs inside the restored guest through the QEMU guest agent, so
it needs no network route into the isolated recovery network. The interpreter is
chosen from the guest's own OS (`cmd` on Windows, `/bin/sh` elsewhere), so the
same `--check` works on either.

Useful flags while you are finding your footing:

| Flag | What it does |
| --- | --- |
| `--dry-run` | resolve the backup and validate the plan without restoring anything |
| `--keep` | keep the temporary workload instead of destroying it (debugging) |
| `--report <path>` | write the report to a file: `.json`, `.html` or `.txt` by extension |
| `--node`, `--storage`, `--pool`, `--network` | override where the restore lands |

## After the drill

Every drill is recorded. `restorelab runs list` shows past drills, most recent
first, and `restorelab runs show <run-id>` replays one in full: the same history
the dashboard reads, and the same history the recovery confidence score is
computed from.

Once the shape of a drill is settled, write it down as a recovery plan instead
of passing flags: see [recovery plans](/guides/recovery-plans/) for the plan
format and every check type.

