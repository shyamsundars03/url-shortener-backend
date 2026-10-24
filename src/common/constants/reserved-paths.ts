/** Paths that must not be treated as short-link codes. */
export const RESERVED_PATHS = new Set([
  'health',
  'register',
  'login',
  'logout',
  'google',
  'link',
  'auth',
  'callback',
  'count',
  'api',
  '404',
]);

export function isReservedPath(segment: string): boolean {
  return RESERVED_PATHS.has(segment.toLowerCase());
}
