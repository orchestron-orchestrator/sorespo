# StratoWeave Web UI

This frontend is a SvelteKit application with an adapter-node build target.

## Running

Install dependencies once (uses [bun](https://bun.sh/)):

```bash
cd webui && bun install
```

The webui only makes sense alongside a running StratoWeave backend, so its
lifecycle is owned by the lab Makefiles in `test/quicklab-*/`. Pick a lab and
start it together with the webui:

```bash
make -C test/quicklab-srl start WEBUI=true
```

`make start` prints the dynamic URL of the sweave backend; the webui dev
server itself listens on `http://localhost:3000` and proxies `/api/*` to that
backend.

Useful targets (run from inside any `test/quicklab-*/` directory):

- `make api-url`   — print the discovered backend URL
- `make start-webui` — start the webui dev server (lab must be running)
- `make stop-webui`  — stop the webui dev server

## Route Areas

- `/devices`
- `/operations/config-queue`
- `/services`

## API Integration

The browser only talks to SvelteKit routes under `/api/*`.

- `/api/*` proxies to the StratoWeave backend
- `/api/restconf/*` proxies to the backend RESTCONF interface

The upstream origin is read from `STRATOWEAVE_API_ORIGIN`. The lab Makefile
discovers the sweave container's host port via `docker port` and sets this
automatically. If the variable is unset (e.g. lab not running), requests fail
with a 502 explaining what's missing.
