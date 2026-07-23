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

export default defineConfig({
  plugins: [demoStubs(), sveltekit()],
  server: {
    port: 3000,
    strictPort: true
  }
});
