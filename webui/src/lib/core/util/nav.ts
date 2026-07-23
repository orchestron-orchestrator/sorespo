import { PUBLIC_DEMO } from '$env/static/public';

/**
 * True in demo builds (`bun run build:demo`). The literal comparison lets
 * Vite replace the flag at build time, so demo-only branches are provably
 * dead in normal builds and get tree-shaken.
 */
export const DEMO = PUBLIC_DEMO === '1';

/**
 * App-internal href for the active router mode.
 *
 * Normal builds (pathname router) pass the path through unchanged. Demo
 * builds use SvelteKit's hash router, where a plain `/devices` href has a
 * different pathname than the current page and is treated as an external
 * navigation (full page load). The internal form is `?#/devices`: same
 * pathname, logical route in the fragment. The query must precede the `#`
 * because loaders only see search params outside the fragment (the
 * `?clone=` flow relies on this), and the `?` is always emitted so a stale
 * query is cleared by the next navigation.
 */
export function appHref(path: string): string {
  if (!DEMO) {
    return path;
  }

  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) {
    return `?#${path}`;
  }

  return `${path.slice(queryIndex)}#${path.slice(0, queryIndex)}`;
}

/**
 * Logical app pathname: under the demo hash router `url.pathname` is the
 * physical location (e.g. `/demo/webui/`), so the route is derived from the
 * fragment instead.
 */
export function appPathname(url: Pick<URL, 'pathname' | 'hash'>): string {
  if (!DEMO) {
    return url.pathname;
  }

  const route = url.hash.replace(/^#/, '').split('?')[0];
  return route || '/';
}
