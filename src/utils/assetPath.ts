/**
 * Returns the Vite base path at runtime.
 * In production this is read from import.meta.env.BASE_URL (set by Vite's `base` config).
 * Ensures a trailing slash.
 */
export function getBasePath(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return base.endsWith('/') ? base : base + '/';
}

/**
 * Resolves an absolute public-asset path (e.g. "/assets/aistudio/foo.png")
 * so it works under any Vite `base` prefix.
 */
export function assetPath(path: string): string {
  const base = getBasePath();
  // Strip leading slash from the path so we don't double up
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${clean}`;
}
