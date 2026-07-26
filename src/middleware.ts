import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/companies', '/documents', '/messages', '/backups', '/settings', '/portal'];
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function publicRedirectUrl(path: string, request: NextRequest): URL {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(path, configured);
    } catch {
      // Fallback abaixo mantém o middleware operacional em ambiente local mal configurado.
    }
  }
  return new URL(path, request.url);
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && mutatingMethods.has(request.method)) {
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite === 'cross-site') return new NextResponse('Requisição entre sites não permitida', { status: 403 });
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return new NextResponse('Origem não permitida', { status: 403 });
      } catch {
        return new NextResponse('Origem inválida', { status: 403 });
      }
    }
  }

  if (protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path)) && !request.cookies.has('sst_session')) {
    return NextResponse.redirect(publicRedirectUrl('/login', request));
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/activate')) response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
