// Make the adapter-static fallback page servable from any subdirectory.
//
// SvelteKit already computes the runtime base from `location` (hash router +
// relative paths), but the fallback page's <link> tags and boot import()
// URLs are emitted root-absolute (`/_app/...`) because the page's depth is
// unknown at build time. The demo is served from exactly one place — the
// directory holding this index.html — so rewriting them to `./_app/...`
// makes the page relocatable (e.g. under /demo/webui/ on stratoweave.org).
import { readFileSync, writeFileSync } from 'node:fs';

const page = new URL('../build/index.html', import.meta.url);

const html = readFileSync(page, 'utf8');
const patched = html.replaceAll('"/_app/', '"./_app/');

if (patched.includes('"/_app/')) {
  console.error('patch-demo-fallback: root-absolute /_app/ references remain');
  process.exit(1);
}

writeFileSync(page, patched);
console.log('patch-demo-fallback: rewrote /_app/ references to ./_app/ in build/index.html');
