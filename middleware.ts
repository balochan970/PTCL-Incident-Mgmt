import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('auth');
  const isAuthenticated = auth ? JSON.parse(auth.value).isAuthenticated : false;
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/active-faults'];

  // Check if the path is public
  const isPublicPath = publicPaths.includes(path);

  // If the path is public and user is authenticated, redirect to home
  if (isPublicPath && isAuthenticated && path !== '/active-faults') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the path is not public and user is not authenticated, redirect to login
  if (!isPublicPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure paths that should be protected
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /fonts (inside public)
     * 4. /icons (inside public)
     * 5. all root files inside public (e.g. /favicon.ico)
     */
    '/((?!api|_next|fonts|icons|[\\w-]+\\.\\w+).*)',
  ],
}; 