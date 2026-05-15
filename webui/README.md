# StratoWeave Web UI

This frontend is now a SvelteKit application with an adapter-node build target.

## Setup

```bash
npm install
make start-webui
```

The app runs on `http://localhost:3000`.

## Route Areas

- `/devices`
- `/operations/config-queue`
- `/services`

## API Integration

The browser only talks to SvelteKit routes under `/api/*`.

- `/api/*` proxies to the existing StratoWeave backend on `http://localhost:15000`
- `/api/restconf/*` proxies to the backend RESTCONF interface

The upstream origin can be overridden with `STRATOWEAVE_API_ORIGIN`.

## Quicklab Workflow

For the lab environments, the StratoWeave backend is published on a fixed host port:

- `http://localhost:15000`

You can start the lab and the detached webui dev server together with:

```bash
make -C test/quicklab-srl start WEBUI=true
```

Or start the webui separately from the repo root:

```bash
make start-webui
```
