# SORESPO Web UI

The SORESPO Web UI is a SvelteKit application built as a static SPA and
embedded into the `sorespo` binary: the StratoWeave HTTP server serves the UI
on the same port as the APIs (80 by default), with an `index.html` fallback
for client-routed pages. There is no separate Web UI container or server.

## Test Environments

Choose an environment under `test/` and run its Make targets from the
repository root. For example:

```bash
TESTENV=test/quicklab-srl
make -C "$TESTENV" start
```

The `sweave` container publishes the SORESPO HTTP port on
<http://localhost:3000>; the Web UI appears there as soon as SORESPO is
running inside `sweave` (`make -C "$TESTENV" tutorial` does all of it). Set
`WEBUI_PORT` to change the host port.

```bash
make -C "$TESTENV" stop
```

## Local Development

Install [Bun](https://bun.sh/) and the frontend dependencies:

```bash
cd webui
bun install --frozen-lockfile
cd ..
```

With the selected test environment running, start Vite:

```bash
make -C "$TESTENV" dev-webui
```

Vite serves <http://localhost:5173> (`WEBUI_DEV_PORT`), proxies API requests
to the running `sweave` container (`STRATOWEAVE_API_ORIGIN`), and reloads
changes under `webui/src`. The embedded UI at `WEBUI_PORT` is unaffected.

```bash
make -C "$TESTENV" stop-dev-webui
```

Run checks and builds from `webui/`:

```bash
bun run check
bun run build
```

## Embedded Assets

The production UI ships inside the sorespo binary. After changing the UI,
regenerate the embedded-assets module and commit it:

```bash
make gen-webui   # builds webui/ and rewrites src/sorespo/webui_assets.act
```

CI regenerates the module and fails on any diff, so the build must stay
deterministic (see `kit.version` in `svelte.config.js`). Only text assets can
be embedded (the HTTP server sends `str` bodies); binary files such as images
must be inlined into the bundle — the logo is imported in Svelte and inlined
as a data URI via `assetsInlineLimit` in `vite.config.ts`.

## Demo

The static demo uses in-memory sample data and does not require SORESPO:

```bash
cd webui
bun run build:demo
PUBLIC_DEMO=1 bun run dev
```

`build:demo` writes the deployable static site to `build/`. Demo mode powers
the [interactive tour](https://www.stratoweave.org/tutorials/exploring-the-webui/).
