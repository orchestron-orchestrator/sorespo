const DEFAULT_API_ORIGIN = 'http://localhost:15000';

function canHaveBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

export function getApiOrigin(): string {
  return process.env.ORCHESTRON_API_ORIGIN ?? DEFAULT_API_ORIGIN;
}

export async function proxyRequest(request: Request, targetPath: string, search = ''): Promise<Response> {
  const targetUrl = new URL(targetPath.startsWith('/') ? targetPath : `/${targetPath}`, getApiOrigin());
  targetUrl.search = search;

  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: canHaveBody(request.method) ? request.body : undefined,
    redirect: 'manual'
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('connection');
  responseHeaders.delete('content-length');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}
