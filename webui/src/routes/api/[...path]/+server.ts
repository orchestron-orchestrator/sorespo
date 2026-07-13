import { proxyRequest } from '$lib/core/restconf/server';

import type { RequestHandler } from './$types';

// Forward the raw (still percent-encoded) pathname rather than the decoded
// params.path, so encoded path segments reach the upstream API intact.
const handler: RequestHandler = async ({ request, url }) => {
  return proxyRequest(request, url.pathname.replace(/^\/api/, ''), url.search);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
