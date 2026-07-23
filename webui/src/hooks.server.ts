import type { Handle } from '@sveltejs/kit';

import { proxyRequest } from '$lib/core/restconf/server';

// Server-side proxy for the orchestrator API and its RESTCONF interface.
// The raw (still percent-encoded) pathname is forwarded rather than decoded
// route params, so encoded list-key characters (%2F, %2C, %25, ...) reach
// the upstream API intact.
//
// This lives in the handle hook rather than routes/api/**/+server.ts because
// the demo build's hash router forbids server-only route files, while hooks
// are simply absent from a static build. Behavior under adapter-node is
// unchanged: every method on /api/* is forwarded verbatim.
export const handle: Handle = async ({ event, resolve }) => {
  const { request, url } = event;

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    return proxyRequest(request, url.pathname.replace(/^\/api/, ''), url.search);
  }

  return resolve(event);
};
