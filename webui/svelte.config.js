import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// PUBLIC_DEMO=1 (`bun run build:demo`) builds the standalone demo: a static,
// hash-routed SPA served from any subdirectory with all /api data answered by
// the in-memory mock in src/lib/demo. Normal builds keep the Node adapter and
// the server-side /api proxy.
const demo = process.env.PUBLIC_DEMO === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: demo ? adapterStatic({ fallback: 'index.html' }) : adapterNode(),
    ...(demo ? { router: { type: 'hash' } } : {})
  }
};

export default config;
