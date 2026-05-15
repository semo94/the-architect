import type { FastifyRequest } from 'fastify';

/**
 * Split a request URL for access logs: pathname only (no query) so OAuth
 * `code` / `state` and other secrets in query strings are never written.
 */
export function splitUrlForAccessLog(rawUrl: string): { urlPath: string; queryPresent: boolean } {
  try {
    const u = new URL(rawUrl, 'http://internal');
    return {
      urlPath: u.pathname || '/',
      queryPresent: u.search.length > 1,
    };
  } catch {
    return { urlPath: '[unparseable]', queryPresent: false };
  }
}

/** Same redaction as access logs, for middleware fields. */
export function accessLogUrlFromRequest(request: FastifyRequest): {
  urlPath: string;
  queryPresent: boolean;
} {
  return splitUrlForAccessLog(request.url);
}

/**
 * Absolute URL for outbound telemetry/logs: protocol + host + pathname only
 * (no query — e.g. Brave subscription token in query string).
 */
export function urlWithoutQueryForLog(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '[unparseable-url]';
  }
}
