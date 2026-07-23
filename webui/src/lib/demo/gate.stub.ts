// Substituted for $lib/demo/gate in non-demo builds (see vite.config.ts) so
// the mock handlers and fixture data never enter the normal bundle graph.
export const demoFetch: typeof fetch | null = null;
