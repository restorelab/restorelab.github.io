---
title: Quick start
description: Build the binary, connect a cluster, and run a drill — from the browser or from a terminal.
sidebar:
  order: 2
---

:::note[Prerequisite]
Go 1.27+, until the first binary release.
:::

## Build and start

```bash
go build -o bin/restorelab ./cmd/restorelab
bin/restorelab serve
```

That is the whole of it. With nothing configured, `serve` starts anyway and
prints an address carrying a one-time setup token:

```text
! RestoreLab is not configured yet.
  Open this address to set it up. The token is printed once, and used once:

      http://127.0.0.1:8080/setup?token=rls_...
```

Open it and the browser asks for your cluster's address, an administrator's
password, and the storage drills restore onto. RestoreLab uses that password
once, in memory, to create its own least-privilege service account, then throws
it away — only the resulting token is stored, sealed with a master key it
generates for you. It offers to create the isolated bridge on the same screen,
saying plainly that no existing interface is touched and that the node's network
configuration will be reloaded.

When it finishes, the server restarts itself and the page you are already on
opens your session. You land on the dashboard, connected, without going back to
the terminal.

The token is printed on the console of the machine running the server, because
the person installing is the one sitting at it. It is spent by the first request
that uses it, whether that request succeeds or fails, and the setup page stops
existing entirely the moment a cluster is connected.

:::caution[A binary built without the front-end toolchain has no interface]
It says so instead of 404ing. `make ui` is what compiles the dashboard into the
binary.
:::

`serve` binds `127.0.0.1:8080` by default, and the same process runs the worker
that executes what the dashboard queues. Both are deliberate; see
[starting the server](/reference/http-api/#starting-the-server) for the bind
rules and for putting a reverse proxy in front.

## The same thing from a terminal

Every capability stays on the command line — it is what automation drives:

```bash
# Connect your cluster. Same password handling, same service account.
bin/restorelab connect https://pve.example.com:8006 --storage local-zfs

# see what can be recovery-tested
bin/restorelab workloads list --backups

# run a drill on VM 101, from its latest backup
bin/restorelab recovery test 101

# mint a token for the dashboard, then serve
bin/restorelab token create dashboard --operate
bin/restorelab serve
```

Start read-only if you would rather look before touching anything:
`connect --read-only` produces a token that cannot create or destroy, and is
enough for discovery and `recovery test --dry-run`.

A token minted with `token create` is printed exactly once; only its SHA-256 is
stored. `--operate` lets it trigger and cancel drills, `--manage` lets it write
the plan catalogue, and neither implies the other. The
[HTTP API reference](/reference/http-api/) has the rest.

## Next

[Your first drill](/start/first-drill/) walks through `recovery test 101` phase
by phase, and explains what each line of the output means.
