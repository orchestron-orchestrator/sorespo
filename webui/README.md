# Orchestron Web UI

A Svelte-based web interface for managing Orchestron/SORESPO devices.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at http://localhost:3000

## Features

- Device list view with status indicators
- Individual device detail pages
- Device reconfiguration
- Real-time status updates

## API Integration

The UI expects the Orchestron API to be running on port 15000. The Vite dev server proxies `/api/*` requests to `http://localhost:15000`.

Currently using mock data - update the endpoints in `src/services/api.js` to connect to real Orchestron API endpoints.
