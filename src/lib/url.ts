/** Returns `path` with `key=value` set in its query string (other params kept). */
export function withParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}

/** Valid YYYY-MM-DD string, or undefined. */
export const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
