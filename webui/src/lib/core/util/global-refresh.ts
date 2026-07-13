/**
 * Subscribe to the header ⟳ Refresh broadcast. Returns the unsubscribe
 * function, so `onMount(() => onGlobalRefresh(handler))` is enough.
 */
export function onGlobalRefresh(handler: () => void): () => void {
  window.addEventListener('global-refresh', handler);
  return () => window.removeEventListener('global-refresh', handler);
}
