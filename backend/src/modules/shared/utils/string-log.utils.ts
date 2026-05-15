/** Truncate free-text for logs (errors, previews, snippets). */
export function truncateForLog(value: string, maxLen: number): string {
  const t = value.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}
