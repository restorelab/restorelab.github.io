---
title: CLI reference
sidebar:
  order: 4
---

<!-- Generated from `restorelab --help` in github.com/restorelab/restorelab. Do not edit here. -->

Every command of the `restorelab` binary, with its own `--help` output.

## restorelab

```text
RestoreLab restores your backups into an isolated environment, boots the
workloads, validates the services, measures your real recovery time, and
cleans everything up.

Usage:
  restorelab [command]

Available Commands:
  backups     List the restore points available for a workload
  cleanup     Destroy temporary workloads left behind by a drill
  completion  Generate the autocompletion script for the specified shell
  connect     Connect a Proxmox cluster, creating RestoreLab's own service account
  db          Inspect and migrate the drill history database
  doctor      Check that everything a recovery drill needs is in place
  help        Help about any command
  init        Create the configuration file and the master key
  key         Manage the master key used to seal provider secrets
  network     Manage the isolated recovery network
  plan        Manage the stored recovery plans
  provider    Manage Proxmox VE and Proxmox Backup Server connections
  recovery    Run recovery drills
  runs        Inspect the history of past recovery drills
  schedule    See the drills stored plans queue for themselves
  serve       Serve the HTTP API and execute the drills it queues
  token       Manage the API tokens `restorelab serve` accepts
  version     Print the version
  workloads   Inspect the workloads a provider knows about

Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
  -h, --help                     help for restorelab
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
      --version                  version for restorelab

Use "restorelab [command] --help" for more information about a command.
```

## restorelab backups

```text
List the restore points available for a workload

Usage:
  restorelab backups <workload-id> [flags]

Aliases:
  backups, backup

Flags:
  -h, --help              help for backups
      --provider string   backup provider to query (default: the configured default)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab cleanup

Destroy temporary workloads left behind by a drill

```text
Destroys a temporary workload RestoreLab created, for example after a run
that was interrupted or that used --keep.

Only workloads carrying RestoreLab's ownership metadata can be destroyed: the
provider refuses anything else, so this command cannot touch production.

It destroys through worker.Cleanup, the same call POST /api/v1/cleanup makes,
so that there is exactly one destruction path in the product and no way for
the CLI and the API to drift apart on what they will agree to remove.

Usage:
  restorelab cleanup [workload-id] [flags]

Flags:
      --all               destroy every temporary workload RestoreLab created
  -h, --help              help for cleanup
      --provider string   provider to clean up
  -y, --yes               do not ask for confirmation

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab connect

Connect a Proxmox cluster, creating RestoreLab's own service account

```text
Connects RestoreLab to a Proxmox VE cluster in one command.

It asks for an administrator's credentials once, uses them in memory to create
a dedicated service account with the minimal privileges RestoreLab needs, and
throws them away. Only the resulting API token is stored, sealed with your
master key.

Start read-only, which is enough for discovery and dry runs:

    restorelab connect https://pve.example.com:8006 --read-only

Then widen it when you are ready to run a real drill:

    restorelab connect https://pve.example.com:8006 --token-name drills-rw

The administrator password can be typed at the prompt, read from a file with
--admin-password-file, or supplied through $RESTORELAB_ADMIN_PASSWORD.

Usage:
  restorelab connect <endpoint> [flags]

Flags:
      --admin-password string        administrator password (prefer the prompt or --admin-password-file)
      --admin-password-file string   read the administrator password from a file, or '-' for stdin
      --admin-user string            administrator used once to create the service account (default "root@pam")
      --bridge string                bridge to create (default: the isolated network profile's bridge)
      --ca-cert string               PEM file of the cluster's CA (see /etc/pve/pve-root-ca.pem)
      --create-bridge                also create the isolated bridge drills restore onto
      --dry-run                      show what would be created, change nothing
  -h, --help                         help for connect
      --id string                    provider id RestoreLab will store this cluster under (default "proxmox-main")
      --insecure                     skip TLS certificate verification
      --no-apply                     write the bridge configuration without activating it
      --no-pool                      grant destructive rights on all VMs instead of a pool (not recommended)
      --node string                  restrict node access to this node (default: every node)
      --pool string                  resource pool the destructive rights are scoped to (default "restorelab")
      --read-only                    discovery and --dry-run only: cannot restore, start or destroy anything
      --role string                  role name to create (default: RestoreLabDrill, or RestoreLabRead with --read-only)
      --storage stringArray          storage the restores write to (repeatable); needed for a real drill
      --token-name string            API token name to create (default "drills")
      --user string                  service account to create (default "restorelab@pve")
  -y, --yes                          do not ask for confirmation

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab db

```text
Inspect and migrate the drill history database

Usage:
  restorelab db [command]

Available Commands:
  migrate     Apply pending schema migrations
  status      Show which database holds the drill history

Flags:
  -h, --help   help for db

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab db [command] --help" for more information about a command.
```

## restorelab db migrate

Apply pending schema migrations

```text
Applies pending schema migrations.

The embedded SQLite database migrates itself whenever RestoreLab opens it, so
this command is mostly for a PostgreSQL history — which is deliberately never
migrated as a side effect of running a command, because a shared database may
serve more than this instance.

Usage:
  restorelab db migrate [flags]

Flags:
  -h, --help   help for migrate

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab db status

```text
Show which database holds the drill history

Usage:
  restorelab db status [flags]

Flags:
  -h, --help   help for status

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab doctor

Check that everything a recovery drill needs is in place

```text
Inspects the configured provider and reports what is ready and what is not:
credentials, node reachability, storages holding backups, an isolated network
to restore onto, and whether workloads have a guest agent and recent backups.

It changes nothing.

Usage:
  restorelab doctor [flags]

Flags:
  -h, --help              help for doctor
      --provider string   provider to inspect
      --raw               print raw API responses (implies --verbose); for reporting a discovery bug
      --workload string   also inspect one workload in detail

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab init

Create the configuration file and the master key

```text
Creates ~/.restorelab/config.yaml with a starter isolated network profile,
and generates the master key used to seal provider secrets.

The master key is never written into the configuration file. Back it up
separately: losing it means every stored provider token must be re-entered.

Usage:
  restorelab init [flags]

Flags:
      --force   overwrite an existing configuration file
  -h, --help    help for init

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab key

```text
Manage the master key used to seal provider secrets

Usage:
  restorelab key [command]

Available Commands:
  generate    Print a new master key without storing it
  path        Show where the master key is loaded from

Flags:
  -h, --help   help for key

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab key [command] --help" for more information about a command.
```

## restorelab key generate

Print a new master key without storing it

```text
Prints a fresh 32-byte master key, base64 encoded, and stores nothing.

Use it to deploy RestoreLab in a container or a CI job:

    export RESTORELAB_MASTER_KEY=$(restorelab key generate)

Secrets sealed under one key cannot be opened with another.

Usage:
  restorelab key generate [flags]

Flags:
  -h, --help   help for generate

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab key path

```text
Show where the master key is loaded from

Usage:
  restorelab key path [flags]

Flags:
  -h, --help   help for path

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab network

```text
Manage the isolated recovery network

Usage:
  restorelab network [command]

Aliases:
  network, net

Available Commands:
  create      Create the isolated bridge recovery drills restore onto

Flags:
  -h, --help   help for network

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab network [command] --help" for more information about a command.
```

## restorelab network create

Create the isolated bridge recovery drills restore onto

```text
Creates a Linux bridge with no ports and no gateway on a Proxmox node: a
switch that goes nowhere, which is what keeps a restored production clone from
reaching anything.

This needs administrator credentials, not RestoreLab's service token — the
token is deliberately not allowed to reconfigure your node's network. The
password is used once, in memory, and never stored.

Applying network configuration reloads the node's networking. Adding a
portless bridge touches no existing interface, but the change is real: use
--no-apply to write the configuration without activating it, and it will take
effect at the next reboot.

Usage:
  restorelab network create [flags]

Flags:
      --admin-password string        administrator password (prefer the prompt or --admin-password-file)
      --admin-password-file string   read the administrator password from a file, or '-' for stdin
      --admin-user string            administrator used once to create the bridge (default "root@pam")
      --bridge string                bridge name (default: the isolated network profile's bridge)
      --ca-cert string               PEM file of the cluster's CA
      --dry-run                      show what would be done, change nothing
      --endpoint string              Proxmox endpoint (default: the provider's)
  -h, --help                         help for create
      --insecure                     skip TLS certificate verification
      --no-apply                     write the configuration without activating it
      --node string                  node to create the bridge on (default: the provider's node)
      --provider string              provider whose endpoint and node to use
  -y, --yes                          do not ask for confirmation

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab plan

Manage the stored recovery plans

```text
Manages the plans RestoreLab keeps in its database.

A stored plan is what the API triggers by name and what the scheduler will
reference. A plan file on disk still runs directly with
`restorelab recovery run <file>`: storing one is how it becomes
something other machines can name, not a condition for running it.

Every command here needs the history database except `plan validate`,
which only reads files.

Usage:
  restorelab plan [command]

Available Commands:
  apply       Store a plan file, creating it or updating it by name
  delete      Remove a stored plan
  list        List the stored plans
  show        Print a stored plan's document
  validate    Check that plan files parse and validate, without storing them

Flags:
  -h, --help   help for plan

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab plan [command] --help" for more information about a command.
```

## restorelab plan apply

Store a plan file, creating it or updating it by name

```text
Stores plan files, creating each one or replacing the plan that already
carries its name.

The name inside the document is the identity, so re-applying an edited file
updates the plan rather than adding a second one. Several files in one call:
a directory of plans under version control is the normal case.

    restorelab plan apply plans/*.yaml

A document that does not validate is refused and nothing is written for it.

Usage:
  restorelab plan apply <file.yaml>... [flags]

Flags:
  -h, --help   help for apply

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab plan delete

Remove a stored plan

```text
Removes a stored plan.

The runs it produced keep their name and the copy of the plan they actually
executed, so their reports and the confidence score are unchanged. Only the
link disappears.

Usage:
  restorelab plan delete <name|id> [flags]

Aliases:
  delete, rm

Flags:
  -h, --help   help for delete

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab plan list

```text
List the stored plans

Usage:
  restorelab plan list [flags]

Aliases:
  list, ls

Flags:
  -h, --help              help for list
      --workload string   only the plans for this workload

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab plan show

Print a stored plan's document

```text
Prints a stored plan's document exactly as it was applied, comments and key
order included.

The output is the file back: piping it to disk and re-applying it is a no-op.

Usage:
  restorelab plan show <name|id> [flags]

Flags:
  -h, --help   help for show

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab plan validate

Check that plan files parse and validate, without storing them

```text
Checks that plan files parse and validate, and stores nothing.

It needs no database and no configuration, so it runs in CI on a checkout:

    restorelab plan validate plans/*.yaml

The first file that does not validate stops the command.

Usage:
  restorelab plan validate <file.yaml>... [flags]

Flags:
  -h, --help   help for validate

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab provider

```text
Manage Proxmox VE and Proxmox Backup Server connections

Usage:
  restorelab provider [command]

Aliases:
  provider, providers

Available Commands:
  add         Add a provider
  list        List configured providers
  remove      Remove a provider from the configuration
  test        Check that a provider is reachable and the token works

Flags:
  -h, --help   help for provider

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab provider [command] --help" for more information about a command.
```

## restorelab provider add

Add a provider

```text
Adds a provider and seals its API token secret with the master key.

Avoid --token-secret on a shared machine: it lands in your shell history and in
the process list. Prefer --token-secret-file, '-' to read stdin, or the
RESTORELAB_TOKEN_SECRET environment variable.

Usage:
  restorelab provider add [command]

Available Commands:
  pbs         Add a Proxmox Backup Server
  proxmox     Add a Proxmox VE cluster

Flags:
  -h, --help   help for add

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab provider add [command] --help" for more information about a command.
```

## restorelab provider add pbs

```text
Add a Proxmox Backup Server

Usage:
  restorelab provider add pbs [flags]

Flags:
      --ca-cert string             PEM file of a private CA
      --datastore string           PBS datastore name (required)
      --endpoint string            base URL, e.g. https://pve.example.com:8006 (required)
      --fingerprint string         SHA-256 certificate fingerprint to pin (recommended for a self-signed PBS)
  -h, --help                       help for pbs
      --id string                  identifier plans refer to (required)
      --insecure                   skip TLS certificate verification
      --no-test                    skip the connection test before saving
      --pve-storage string         name this datastore is attached under in PVE (default: the datastore name)
      --token-id string            API token id, e.g. 'restorelab@pve!drills' (required)
      --token-secret string        API token secret (prefer --token-secret-file or $RESTORELAB_TOKEN_SECRET)
      --token-secret-file string   read the token secret from a file, or '-' for stdin

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab provider add proxmox

```text
Add a Proxmox VE cluster

Usage:
  restorelab provider add proxmox [flags]

Flags:
      --backup-storage string      storage holding backups (default: scan every backup-capable storage)
      --ca-cert string             PEM file of a private CA
      --endpoint string            base URL, e.g. https://pve.example.com:8006 (required)
  -h, --help                       help for proxmox
      --id string                  identifier plans refer to (required)
      --insecure                   skip TLS certificate verification
      --no-test                    skip the connection test before saving
      --node string                default node for API calls
      --temp-id-max int            highest VMID used for temporary workloads (default 9999)
      --temp-id-min int            lowest VMID used for temporary workloads (default 9000)
      --token-id string            API token id, e.g. 'restorelab@pve!drills' (required)
      --token-secret string        API token secret (prefer --token-secret-file or $RESTORELAB_TOKEN_SECRET)
      --token-secret-file string   read the token secret from a file, or '-' for stdin

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab provider list

```text
List configured providers

Usage:
  restorelab provider list [flags]

Aliases:
  list, ls

Flags:
  -h, --help   help for list

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab provider remove

```text
Remove a provider from the configuration

Usage:
  restorelab provider remove <provider-id> [flags]

Aliases:
  remove, rm

Flags:
  -h, --help   help for remove

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab provider test

```text
Check that a provider is reachable and the token works

Usage:
  restorelab provider test [provider-id] [flags]

Flags:
  -h, --help   help for test

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab recovery

```text
Run recovery drills

Usage:
  restorelab recovery [command]

Available Commands:
  run         Run a recovery drill from a plan file or a stored plan
  test        Run a one-off recovery drill on a workload

Flags:
  -h, --help   help for recovery

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab recovery [command] --help" for more information about a command.
```

## restorelab recovery run

Run a recovery drill from a plan file or a stored plan

```text
Runs a recovery drill from a plan.

The plan is either a file on disk, or one stored in the catalogue:

    restorelab recovery run plans/web-tier.yaml
    restorelab recovery run --plan web-tier

A file needs no database at all: a broken history never stops a drill. A
stored plan is read from the catalogue, and the run records which plan and
which version it came from, exactly as a drill triggered over HTTP does.

Usage:
  restorelab recovery run [plan.yaml] [flags]

Flags:
      --backup-provider string   backup provider to search for restore points
      --dry-run                  resolve the backup and validate the plan without restoring anything
  -h, --help                     help for run
      --keep                     keep the temporary workload instead of destroying it (debugging)
      --network string           network profile for the temporary workload (overrides the plan)
      --node string              node to restore on (overrides the plan)
      --plan string              run a stored plan by name or id
      --pool string              resource pool the temporary workload is created in (overrides the plan)
      --provider string          hypervisor provider to restore on
      --report string            write the report to a file (.json, .html or .txt by extension)
      --storage string           storage for the restored disks (overrides the plan)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab recovery test

Run a one-off recovery drill on a workload

```text
Restores a workload's latest backup into an isolated environment, boots it,
runs the requested checks, measures the recovery time, and destroys the
temporary workload.

Nothing about the production workload is touched.

Checks are given with --check, repeatable:

    --check ping
    --check tcp:22
    --check http://{{ .ip }}:8080/health
    --check dns:example.com
    --check 'cmd:systemctl is-active postgresql'

A cmd: check runs inside the restored guest through the QEMU guest agent, so
it needs no network route into the isolated recovery network at all. The
interpreter is chosen from the guest's own OS - cmd on Windows, /bin/sh
elsewhere - so the same --check works on either.

With no --check, RestoreLab runs 'cmd:hostname' inside the guest. It is a
small claim on purpose - the guest is running and can still fork a process -
but it is one that holds wherever RestoreLab is installed. Network checks
(tcp:, http:, dns:, ping) need a route into the isolated recovery network,
which most deployments deliberately do not have; when they cannot reach the
guest at all, the drill ends INCONCLUSIVE rather than claiming the backup
failed. Point a --check at the service that actually matters to you:

    --check 'cmd:systemctl is-active postgresql'

Usage:
  restorelab recovery test <workload-id> [flags]

Flags:
      --backup string              restore point: "latest" or a backup id (default "latest")
      --backup-provider string     backup provider to search for restore points
      --check stringArray          check to run (repeatable): ping, tcp:PORT, http://..., dns:NAME, cmd:COMMAND
      --check-interval duration    wait between check attempts (default 5s)
      --check-retries int          how many times to retry a check that has not passed yet (default 5)
      --cpu int                    cap the temporary workload's cores
      --dry-run                    resolve the backup and validate the plan without restoring anything
  -h, --help                       help for test
      --keep                       keep the temporary workload instead of destroying it (debugging)
      --memory int                 cap the temporary workload's memory, in MiB
      --network string             network profile for the temporary workload (overrides the plan)
      --no-start                   restore only: never boot the guest
      --node string                node to restore on (overrides the plan)
      --pool string                resource pool the temporary workload is created in (overrides the plan)
      --provider string            hypervisor provider to restore on
      --report string              write the report to a file (.json, .html or .txt by extension)
      --rto duration               recovery time objective the run is graded against
      --startup-timeout duration   how long to wait for the guest to become reachable (default 5m0s)
      --storage string             storage for the restored disks (overrides the plan)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab runs

Inspect the history of past recovery drills

```text
Inspects the drills RestoreLab has recorded.

History is kept automatically in ~/.restorelab/history.db. Nothing needs to be
installed or configured.

Usage:
  restorelab runs [command]

Available Commands:
  list        List past recovery drills, most recent first
  show        Show one recorded drill in full

Flags:
  -h, --help   help for runs

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab runs [command] --help" for more information about a command.
```

## restorelab runs list

List past recovery drills, most recent first

```text
Lists past recovery drills, most recent first.

    restorelab runs list
    restorelab runs list --workload 110 --since 30d
    restorelab runs list --result FAILED

Usage:
  restorelab runs list [flags]

Flags:
  -h, --help              help for list
      --limit int         how many to show (default 50)
      --result string     only drills with this verdict (SUCCESS, DEGRADED, FAILED)
      --since string      only drills started since then: 30d, 12h, or 2026-08-01
      --state string      only drills in this state (SUCCESS, FAILED, ...)
      --workload string   only drills of this workload

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab runs show

Show one recorded drill in full

```text
Shows a recorded drill: its timeline, its checks and its RTO.

The id may be shortened, the way git accepts a short sha:

    restorelab runs show 0aca8405

Usage:
  restorelab runs show <run-id> [flags]

Flags:
  -h, --help   help for show

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab schedule

See the drills stored plans queue for themselves

```text
Shows what the scheduler is going to do, and what it has done.

There is nothing to create here: a schedule lives in its plan, next to what
it drills, and is edited with `restorelab plan apply` or in the
dashboard. One place to look when a drill did not run.

Usage:
  restorelab schedule [command]

Available Commands:
  list        Scheduled plans and when each one drills next
  slots       The slots the scheduler has decided, skipped ones included

Flags:
  -h, --help   help for schedule

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab schedule [command] --help" for more information about a command.
```

## restorelab schedule list

```text
Scheduled plans and when each one drills next

Usage:
  restorelab schedule list [flags]

Aliases:
  list, ls

Flags:
  -h, --help   help for list

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab schedule slots

The slots the scheduler has decided, skipped ones included

```text
Lists the cron slots the scheduler has decided about.

A skipped slot is the answer to "why was this machine not tested", so they are
listed alongside the drills rather than hidden.

Usage:
  restorelab schedule slots [plan] [flags]

Flags:
  -h, --help        help for slots
      --limit int   how many slots to show

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab serve

Serve the HTTP API and execute the drills it queues

```text
Serves RestoreLab's HTTP API and executes the drills queued through it.

    restorelab serve
    restorelab serve --listen 127.0.0.1:9000

One process does both by default, because a queue nobody drains is a queue
nobody should be allowed to fill. The two halves talk to each other only
through the database, which makes splitting them a deployment choice rather
than a rewrite: the API in a DMZ, the worker on the administration network,
two processes, one history.

    restorelab serve --no-listen                        (the worker alone)
    restorelab serve --no-worker --worker-elsewhere     (the API alone)

A process that runs the worker also queues the drills stored plans schedule
for themselves. Use --no-scheduler to stop that for one night without
touching any plan; see `restorelab schedule list` for what is coming.

Listening anywhere but loopback needs at least one API token, created with
`restorelab token create <name>`. Put TLS in front of it with a
reverse proxy.

Usage:
  restorelab serve [flags]

Flags:
  -h, --help               help for serve
      --listen string      address to listen on (default "127.0.0.1:8080")
      --no-listen          execute drills without serving the API
      --no-scheduler       do not queue the drills stored plans schedule for themselves
      --no-worker          serve the API without executing drills (another process must run the worker)
      --worker-elsewhere   confirm that another process runs the worker against the same database (required with --no-worker)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab token

Manage the API tokens `restorelab serve` accepts

```text
Manages the tokens the HTTP API accepts.

A token is shown once, when it is created, and stored only as a hash: there
is no command that can print it again. Lose it and create another one.

Usage:
  restorelab token [command]

Available Commands:
  create      Create an API token and print it once
  list        List API tokens
  revoke      Revoke an API token

Flags:
  -h, --help   help for token

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab token [command] --help" for more information about a command.
```

## restorelab token create

Create an API token and print it once

```text
Creates an API token and prints it once.

A token is read only unless --operate or --manage is given. An operate token
can trigger drills, cancel them and destroy the workloads they leave behind:
it is a key that can destroy and recreate machines, not a key that reads a
dashboard.

A manage token writes the plan catalogue: it creates, changes and deletes the
stored plans. Neither scope implies the other. Triggering a drill and deciding
what a drill is are two different powers, and a token handed to a dashboard so
it can launch one has no business rewriting the definition of what it
launches.

Usage:
  restorelab token create <name> [flags]

Flags:
  -h, --help      help for create
      --manage    also allow writing the plan catalogue (create, change and delete plans)
      --operate   allow this token to trigger, cancel and clean up drills (default: read only)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab token list

```text
List API tokens

Usage:
  restorelab token list [flags]

Aliases:
  list, ls

Flags:
  -h, --help   help for list

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab token revoke

```text
Revoke an API token

Usage:
  restorelab token revoke <name> [flags]

Flags:
  -h, --help   help for revoke

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab version

```text
Print the version

Usage:
  restorelab version [flags]

Flags:
  -h, --help   help for version

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab workloads

```text
Inspect the workloads a provider knows about

Usage:
  restorelab workloads [command]

Aliases:
  workloads, workload, vms

Available Commands:
  list        List workloads that can be recovery-tested
  show        Show a workload, its status and its backups

Flags:
  -h, --help   help for workloads

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output

Use "restorelab workloads [command] --help" for more information about a command.
```

## restorelab workloads list

```text
List workloads that can be recovery-tested

Usage:
  restorelab workloads list [flags]

Aliases:
  list, ls

Flags:
      --backups           look up the latest backup of each workload (one API call per workload)
  -h, --help              help for list
      --provider string   provider to query (default: the configured default)
      --show-temporary    include workloads created by RestoreLab

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```

## restorelab workloads show

```text
Show a workload, its status and its backups

Usage:
  restorelab workloads show <workload-id> [flags]

Flags:
  -h, --help              help for show
      --provider string   provider to query (default: the configured default)

Global Flags:
      --config string            path to config.yaml (default: $RESTORELAB_CONFIG or ~/.restorelab/config.yaml)
      --master-key-file string   path to the master key file (default: ~/.restorelab/master.key; RESTORELAB_MASTER_KEY holds the key itself and wins over this)
      --no-color                 disable coloured output
  -v, --verbose                  verbose output
```
