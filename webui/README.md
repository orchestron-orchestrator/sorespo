# SORESPO Web UI

The SORESPO Web UI is a SvelteKit application. Each SORESPO test environment
runs it as a Containerlab node alongside the `sweave` application container.

## Test Environments

Choose an environment under `test/` and run its Make targets from the repository
root. For example:

```bash
TESTENV=test/quicklab-srl
make -C "$TESTENV" start
```

The Web UI is available at <http://localhost:3000> even when
SORESPO is not yet running inside `sweave`.

```bash
make -C "$TESTENV" stop
```

Set `WEBUI_PORT` to change the host port or `WEBUI_IMAGE` to use another image.

## Local Development

Install [Bun](https://bun.sh/) and the frontend dependencies:

```bash
cd webui
bun install --frozen-lockfile
cd ..
```

With the selected test environment running, replace its Web UI node with Vite:

```bash
make -C "$TESTENV" dev-webui
```

Vite serves <http://localhost:3000>, proxies API requests to the running
`sweave` container, and reloads changes under `webui/src`.

```bash
make -C "$TESTENV" stop-dev-webui
make -C "$TESTENV" restore-webui
```

`stop-dev-webui` stops Vite. `restore-webui` stops Vite and restarts the
Containerlab Web UI node.

Run checks and builds from `webui/`:

```bash
bun run check
bun run build
```

## Build a Local Image

Build and use the adapter-node image without publishing it:

```bash
docker build -t sorespo-webui:local webui
make -C "$TESTENV" start WEBUI_IMAGE=sorespo-webui:local
```

The default image is `ghcr.io/stratoweave/sorespo-webui:tip`. Images listen on
port 3000 and read the SORESPO backend URL from `STRATOWEAVE_API_ORIGIN`.

## Demo

The static demo uses in-memory sample data and does not require SORESPO:

```bash
cd webui
bun run build:demo
PUBLIC_DEMO=1 bun run dev
```

`build:demo` writes the deployable static site to `build/`. Demo mode powers
the [interactive tour](https://www.stratoweave.org/tutorials/exploring-the-webui/).

## API Proxy

The browser sends same-origin requests to `/api/*`. In normal builds,
`src/hooks.server.ts` forwards them to `STRATOWEAVE_API_ORIGIN`. The test
environment sets this variable for both the Web UI node and Vite server.
