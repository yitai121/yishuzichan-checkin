import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Extract subdomain from host
  // e.g., checkin.yishuzichan.cc -> checkin
  // e.g., admin.yishuzichan.cc -> admin
  const parts = hostname.split('.');
  let subdomain = '';
  
  if (parts.length >= 3) {
    // Check if it's a subdomain of yishuzichan.cc
    const domainParts = parts.slice(0, -2).join('.');
    if (parts.slice(-2).join('.') === 'yishuzichan.cc') {
      subdomain = domainParts;
    }
  }

  // Subdomain routing
  if (subdomain === 'checkin' || subdomain === 'sign' || subdomain === 'qr' || subdomain === 'qiandao') {
    // Scanning page - only allow root path
    if (pathname === '/' || pathname === '') {
      return NextResponse.next();
    }
    // Redirect other paths to root
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (subdomain === 'admin' || subdomain === 'manage' || subdomain === 'dash' || subdomain === 'qiandaoHT') {
    // Admin page - rewrite to /admin
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }
    // Allow /admin/* paths
    if (pathname.startsWith('/admin')) {
      return NextResponse.next();
    }
    // Rewrite other paths to /admin
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.rewrite(url);
  }

  // Default: no subdomain or unrecognized subdomain
  // Serve normal routing
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
