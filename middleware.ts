import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/organizations/:path*', '/plans/:path*', '/settings/:path*', '/subscriptions/:path*', '/database/:path*'],
};
