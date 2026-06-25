import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Extract subdomain from host
  const parts = hostname.split('.');
  let subdomain = '';
  
  if (parts.length >= 3) {
    const domainParts = parts.slice(0, -2).join('.');
    if (parts.slice(-2).join('.') === 'yishuzichan.cc') {
      subdomain = domainParts;
    }
  }

  // Subdomain routing (case-insensitive)
  const subdomainLower = subdomain.toLowerCase();
  
  if (subdomainLower === 'checkin' || subdomainLower === 'sign' || subdomainLower === 'qr' || subdomainLower === 'qiandao') {
    if (pathname === '/' || pathname === '') {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }
    const url = new URL('/', request.url);
    const response = NextResponse.redirect(url);
    return addSecurityHeaders(response);
  }

  if (subdomainLower === 'admin' || subdomainLower === 'manage' || subdomainLower === 'dash' || subdomainLower === 'qiandaoht') {
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      const response = NextResponse.rewrite(url);
      return addSecurityHeaders(response);
    }
    if (pathname.startsWith('/admin')) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    const response = NextResponse.rewrite(url);
    return addSecurityHeaders(response);
  }

  // Default routing
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Permissions policy - restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=self, microphone=(), geolocation=(), payment=()'
  );
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Remove server identification
  response.headers.delete('X-Powered-By');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
