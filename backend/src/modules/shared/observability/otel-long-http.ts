import type { IncomingMessage } from 'node:http';

function pathnameOnly(url: string | undefined): string {
  if (url === undefined || url === '') {
    return '';
  }
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/**
 * Returns true if the incoming request should be skipped by HTTP server auto-instrumentation.
 * Long-lived SSE streams hold a root span open for the whole connection, which buffers child
 * spans and increases RSS on small instances.
 */
export function shouldIgnoreLongRunningIncomingRequest(req: IncomingMessage): boolean {
  const method = req.method ?? '';
  const path = pathnameOnly(req.url);

  if (method === 'POST' && (path === '/topics' || path === '/quizzes')) {
    return true;
  }

  if (method === 'GET' && /^\/topics\/[^/]+\/events$/.test(path)) {
    return true;
  }

  return false;
}
