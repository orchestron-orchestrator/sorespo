const DEFAULT_API_ORIGIN = 'http://localhost:15000';

function canHaveBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

async function readProxyBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (!canHaveBody(request.method)) {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

export function getApiOrigin(): string {
  return process.env.STRATOWEAVE_API_ORIGIN ?? DEFAULT_API_ORIGIN;
}

export async function proxyRequest(request: Request, targetPath: string, search = ''): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');

  const body = await readProxyBody(request);
  const targetUrl = new URL(targetPath.startsWith('/') ? targetPath : `/${targetPath}`, getApiOrigin());
  targetUrl.search = search;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'follow'
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('connection');
    responseHeaders.delete('content-length');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Failed to reach upstream API'
      },
      {
        status: 502
      }
    );
  }
}
