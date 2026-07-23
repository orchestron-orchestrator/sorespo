import { PUBLIC_DEMO } from '$env/static/public';

import { createDemoFetch } from '$lib/demo/handlers';

/**
 * Non-null only in demo builds (PUBLIC_DEMO=1): a fetch-compatible function
 * that answers every /api/* request from the in-memory demo dataset. The
 * data clients use `(demoFetch ?? fetchFn)` so the mock also wins over the
 * SvelteKit load `fetch` passed in by route loaders.
 *
 * The literal comparison lets Vite statically replace the flag, so in normal
 * builds this folds to `null` and the whole $lib/demo subtree is tree-shaken
 * out of the bundle.
 */
export const demoFetch: typeof fetch | null = PUBLIC_DEMO === '1' ? createDemoFetch() : null;
