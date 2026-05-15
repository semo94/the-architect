/** Strip accidental `uptrace-dsn=` prefix from copied Uptrace config snippets. */
export function normalizeUptraceDsn(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  let s = String(value).trim();
  if (!s) {
    return undefined;
  }

  if (/^uptrace-dsn=/i.test(s)) {
    s = s.replace(/^uptrace-dsn=/i, '').trim();
  }

  return s || undefined;
}
