---
title: HTTP API
description: Auth and scopes, the event stream, and how a write actually happens.
sidebar:
  order: 3
---

RestoreLab exposes its drill history, the state of your fleet, and the drills
themselves over HTTP, under `/api/v1`. Reading needs a token; triggering,
cancelling and cleaning up need a token that was explicitly created with the
right to do so.

This page is the model behind the API. The endpoint-by-endpoint reference lives
in the [API reference](/api/), generated from the
[OpenAPI 3.1 document](/openapi.yaml).

## How a write actually happens

No handler in `internal/api` calls a mutating provider method — `Restore`,
`Start`, `Stop`, `Delete` or `AllocateWorkloadID`. That is still true now that
the API can trigger a drill, and it is not a promise kept by code review: the
fake provider the handler tests run against fails the test outright if any of
those methods is reached, and a second test greps the package for those names
outside `_test.go` files.

What `POST /recovery-runs` does instead is write one row. A worker — in the same
process by default, or on another machine — claims that row and runs the drill
through the same `recovery.Engine` the CLI uses, with every guard the engine
already carries. The API and the worker never call each other; they share a
database and nothing else, which is what makes splitting them a deployment
choice rather than a rewrite.

The single exception is `POST /cleanup/{vmid}`, which does end in a `Delete`. It
makes that call through `worker.Cleanup`, so the only package holding a mutating
provider method stays the one that carries the guards and the tests for them.

## Starting the server

```text
restorelab serve
restorelab serve --listen 127.0.0.1:9000
```

`serve` binds to `127.0.0.1:8080` by default. That is deliberate: a RestoreLab
that appeared on every interface the moment someone typed `serve` would be a
surprise, and surprises with API surfaces are how clusters end up readable by
strangers.

TLS is not handled by RestoreLab. Put a reverse proxy in front of it — nginx,
Caddy, whatever you already run:

```nginx
server {
    listen 443 ssl;
    server_name restorelab.example.com;

    ssl_certificate     /etc/letsencrypt/live/restorelab.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/restorelab.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;

        # Required, not cosmetic: the dashboard's CSRF guard compares Origin
        # against Host, so a proxy that rewrites Host makes every write a 403.
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The dashboard needs that TLS. A bearer client can talk to RestoreLab in the
clear on a trusted network; a browser cannot, because the session cookie is
`Secure`. See [deployment](/guides/deployment/).

Listening on anything but loopback requires at least one live API token. Without
one, `serve` refuses to start rather than expose an unauthenticated API:

```text
$ restorelab serve --listen 0.0.0.0:8080
error: refusing to listen on 0.0.0.0:8080 with no API token: create one with `restorelab token create <name>`
```

`serve` checks this once, at startup, by listing tokens and counting the live
ones — so a server that starts with a token and later has that token revoked
keeps running; nothing re-checks the binding on every request.

By default `serve` both answers requests and executes the drills those requests
queue. The two halves only ever talk through the database, so they can be
separated:

```text
restorelab serve --no-listen                        the worker alone
restorelab serve --no-worker --worker-elsewhere     the API alone
```

`--no-worker` on its own is refused, and the refusal is the point. A server that
accepts `POST /recovery-runs` with nobody draining the queue answers
`201 Created` to a caller that will then wait forever: the run is genuinely
queued, the response is genuinely correct, and the drill will never happen.
Nothing can verify from inside the process that a worker exists somewhere else —
a worker on another machine leaves no trace until it claims something — so the
honest design is to make the operator say it out loud rather than to guess.

## Scopes

A token holds one or more levels of access:

| Scope | What it allows |
| --- | --- |
| `read` | every `GET` route, including the live event stream and the plan catalogue |
| `operate` | `read`, plus triggering a drill, cancelling one, and cleaning up a temporary workload |
| `manage` | `read`, plus creating, changing and deleting stored plans |

`read` is the default and is implied by every token, including an `operate` one:
an account that could start a drill but not watch it would be a strange thing to
hand anyone.

**`operate` and `manage` do not imply each other**, in either direction, and
that is the whole reason `manage` exists as a separate scope rather than as more
room inside `operate`. Triggering a drill and deciding what a drill *is* are two
different powers. A token handed to a dashboard so it can launch and cancel has
no business rewriting the definition of what it launches — and a token given to
a CI job so it can `plan apply` from a git repository has no business restoring
backups by itself. A token can hold both; it has to say so.

A write attempted with a `read` token is **403, not 401**:

```json
{
  "type": "https://restorelab.dev/problems/insufficient-scope",
  "title": "This token may not do that",
  "status": 403,
  "detail": "this endpoint needs the \"operate\" scope; create a token with `restorelab token create <name> --operate`"
}
```

The distinction is not pedantry. A 401 means "we do not know who you are" and
sends the caller off to regenerate a token that was never broken; a 403 means
"we know exactly who you are, and this is not yours to do", which is the only
answer that points at the actual fix. Authentication runs first, so an anonymous
request still gets its 401.

## The browser session

A browser cannot hold a bearer token safely, and `EventSource` cannot set an
`Authorization` header at all. So the dashboard trades a token for a session
cookie once, with `POST /api/v1/session`, and the browser carries it from then
on.

A session **names a token and carries nothing of its own**. The scopes are read
from the token row on every single request, never copied into the session, which
is what makes `restorelab token revoke` close every session opened with that
token on the next request rather than in twelve hours' time. A cookie is a
different way to present the same credential, never a way to hold more of it.

The cookie is `__Host-` prefixed, `HttpOnly`, `Secure`, `SameSite=Strict`,
`Path=/`, with no `Domain`, and `Max-Age=43200` — twelve hours, absolute, never
extended. A sliding expiry would be more comfortable, since nobody would be
logged out mid-drill, but an open tab polling a listing would then hold a
session forever, and this one can destroy machines. Twelve hours covers a
working day; coming back tomorrow means logging in.

Two consequences worth knowing before you deploy:

- **Plain HTTP is refused off loopback.** Because the cookie is always `Secure`,
  a browser on `http://192.168.1.5:8080` would store nothing: the login would
  appear to succeed, every request afterwards would be anonymous, and no error
  anywhere would explain it. So the route refuses first, with a 400 that names
  the cause. Loopback is exempt, because browsers treat `localhost` as a
  trustworthy origin.
- **Every cookie-authenticated write must carry a matching `Origin`.**
  `SameSite=Strict` stops another *site*, but not a sibling subdomain, which is
  the same site to a cookie and a different origin to everything else. The
  reference is the request's own `Host` — the dashboard is served by this same
  binary, so the legitimate origin is by construction the one just reached, and
  a value to configure is a value to get wrong. That is why the reverse proxy
  above must pass the original `Host`: one that rewrites it makes every
  dashboard write a 403. The guard never applies to a bearer request, and `GET`,
  `HEAD` and `OPTIONS` are exempt whatever the credential.

## The endpoint reference

Every route, its parameters, its request and response schemas, and the scope it
requires are in the [API reference](/api/). The contract itself is published as
[`/openapi.yaml`](/openapi.yaml), so a client can be generated from it.
