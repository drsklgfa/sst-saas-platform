import { env } from '@/lib/env';

/**
 * Builds an absolute URL using the canonical public address configured for the app.
 * Reverse proxies may expose an internal host in Request.url, so redirects must not
 * derive their origin from the container address.
 */
export function publicAppUrl(path: string): URL {
  if (!path.startsWith('/')) throw new Error('O redirecionamento deve usar um caminho interno iniciado por /.');
  return new URL(path, env.APP_URL);
}
