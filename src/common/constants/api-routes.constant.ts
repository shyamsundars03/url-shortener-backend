/**
 * Centralised route path constants for all NestJS controllers.
 * Use these in @Controller(), @Get(), @Post(), etc. decorators
 * instead of hardcoded strings.
 */

export const AUTH_ROUTES = {
  /** Controller base: /auth */
  BASE: 'auth',

  /** POST /auth/register */
  REGISTER: 'register',

  /** POST /auth/login */
  LOGIN: 'login',

  /** POST /auth/refresh */
  REFRESH: 'refresh',

  /** POST /auth/logout */
  LOGOUT: 'logout',

  /** GET /auth/google  — initiates Google OAuth */
  GOOGLE: 'google',

  /** GET /auth/google/callback  — Google OAuth callback */
  GOOGLE_CALLBACK: 'google/callback',

  /** GET /auth/callback  — internal redirect after OAuth */
  CALLBACK: 'callback',
} as const;

export const URL_ROUTES = {
  /** POST /link  — create short URL */
  LINK: 'link',

  /** GET /link/count  — count user's URLs (must be before :shortUrl) */
  LINK_COUNT: 'link/count',

  /** GET /:shortUrl  — redirect to original URL */
  SHORT_URL: ':shortUrl',
} as const;

export const APP_ROUTES = {
  /** GET /health */
  HEALTH: 'health',
} as const;
