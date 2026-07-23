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

## Demo build

`bun run build:demo` produces a fully static, self-contained demo of the UI
(no backend, no Node at runtime): every `/api/*` call is answered by an
in-memory mock with sample data modeled on the quicklab-srl lab, and a guided
tour introduces each page. The build uses `@sveltejs/adapter-static` with
SvelteKit's hash router, so the output in `build/` can be served from any
static host and any subdirectory — this is what powers the interactive demo
on [stratoweave.org](https://www.stratoweave.org/tutorials/exploring-the-webui/).

`PUBLIC_DEMO=1 bun run dev` runs the same demo mode on the dev server, which
is the fastest way to iterate on the mock data (`src/lib/demo/`) or the tour
(`src/lib/demo/tour/steps.ts`). Normal builds contain none of the demo code
(the entry points are stubbed out in `vite.config.ts`).

## Route Areas

- `/devices`
- `/operations/config-queue`
- `/services`

## API Integration

The browser only talks to same-origin paths under `/api/*`, which the server
side (the `handle` hook in `src/hooks.server.ts`) proxies upstream.

- `/api/*` proxies to the StratoWeave backend
- `/api/restconf/*` proxies to the backend RESTCONF interface

The upstream origin is read from `STRATOWEAVE_API_ORIGIN`. The lab Makefile
discovers the sweave container's host port via `docker port` and sets this
automatically. If the variable is unset (e.g. lab not running), requests fail
with a 502 explaining what's missing.
