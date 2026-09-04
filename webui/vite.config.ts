import { fileURLToPath } from 'node:url';

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

// In non-demo builds the two demo entry points resolve to stubs, keeping the
// mock data layer, fixtures and tour completely out of the bundle graph (the
// dynamic import() of DemoShell would otherwise still emit dead chunks, and
// the unminified SSR bundle would retain the fixtures). The $lib alias is
// applied before this hook runs, so matching is on resolved absolute paths.
const demo = process.env.PUBLIC_DEMO === '1';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const GATE = here('./src/lib/demo/gate.ts');
const GATE_BARE = GATE.replace(/\.ts$/, '');
const GATE_STUB = here('./src/lib/demo/gate.stub.ts');
const SHELL = here('./src/lib/demo/DemoShell.svelte');
const SHELL_STUB = here('./src/lib/demo/DemoShell.stub.svelte');
function demoStubs(): Plugin {
  return {
    name: 'stratoweave-demo-stubs',
    enforce: 'pre',
    resolveId(source) {
      if (demo) return null;
      const clean = source.split('?')[0];
      if (clean === GATE || clean === GATE_BARE) return GATE_STUB;
      if (clean === SHELL) return SHELL_STUB;
      return null;
    }
  };
}

// Dev-mode API proxy: `vite dev` forwards the backend API prefixes to a
// running SORESPO (`make dev-webui` exports STRATOWEAVE_API_ORIGIN). Anchored
// regex keys so e.g. /device cannot swallow the UI's /devices route. The raw,
// still percent-encoded path is forwarded as-is, which RESTCONF list keys
// (%2F, %2C, %25, ...) depend on.
const API_PROXY_TARGET = process.env.STRATOWEAVE_API_ORIGIN ?? 'http://localhost:3000';
const API_PROXY_PREFIXES = [
  '^/device(/|$)',
  '^/config-queue(/|$)',
  '^/layer(/|$)',
  '^/restconf(/|$)',
  '^/tmf-api(/|$)',
  '^/\\.well-known(/|$)'
];

export default defineConfig({
  plugins: [demoStubs(), sveltekit()],
  build: {
    // Inline small imported assets (the logo PNG) as data URIs: the embedded
    // asset pipeline can only serve text files (str response bodies).
    assetsInlineLimit: 16384
  },
  server: {
    proxy: Object.fromEntries(
      API_PROXY_PREFIXES.map((prefix) => [prefix, { target: API_PROXY_TARGET }])
    )
  }
});
