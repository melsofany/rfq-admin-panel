import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('admin_access_token')?.value;

  const protectedPaths = ['/dashboard', '/organizations', '/plans', '/settings', '/subscriptions', '/database'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/organizations/:path*', '/plans/:path*', '/settings/:path*', '/subscriptions/:path*', '/database/:path*'],
};
