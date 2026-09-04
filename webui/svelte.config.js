import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Deterministic, content-derived app version: identical sources produce an
// identical version (byte-reproducible builds for the embedded-assets
// pipeline), while any UI change produces a new one, so SvelteKit's
// version.json polling makes stale open tabs reload after an upgrade
// instead of failing on hashed chunks the new binary no longer serves.
const VERSION_INPUTS = ['src', 'static', 'package.json', 'bun.lock', 'svelte.config.js', 'vite.config.ts', 'tsconfig.json'];

function contentVersion() {
  const hash = createHash('sha256');
  const walk = (rel) => {
    const abs = fileURLToPath(new URL('./' + rel, import.meta.url));
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const name of readdirSync(abs).sort()) walk(rel + '/' + name);
      return;
    }
    hash.update(rel + '\0');
    hash.update(readFileSync(abs));
    hash.update('\0');
  };
  for (const input of VERSION_INPUTS) walk(input);
  return hash.digest('hex').slice(0, 12);
}

// Every build is a static SPA. Normal builds are embedded into the sorespo
// binary (make gen-webui) and served by the StratoWeave HTTP server with an
// index.html fallback for client-routed pages. PUBLIC_DEMO=1
// (`bun run build:demo`) builds the standalone demo: hash-routed so it can be
// served from any subdirectory, with all API data answered by the in-memory
// mock in src/lib/demo.
const demo = process.env.PUBLIC_DEMO === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapterStatic({ fallback: 'index.html' }),
    ...(demo ? { router: { type: 'hash' } } : {}),
    // The default version name is Date.now(), which lands in
    // _app/version.json AND in a content-hashed chunk, renaming every hashed
    // file on each rebuild — the embedded-assets pipeline (make gen-webui +
    // CI freshness check) needs byte-identical rebuilds instead.
    version: { name: contentVersion() }
  }
};

export default config;
