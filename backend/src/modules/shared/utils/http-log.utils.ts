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
