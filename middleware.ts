import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/api/login'];

// Define the middleware function
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow access to public routes without authentication
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const authCookie = request.cookies.get('auth-session');
  
  // If no auth cookie is found, redirect to login
  if (!authCookie) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If auth cookie exists, allow access to protected routes
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
}; 