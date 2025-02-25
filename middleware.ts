import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login', 
  '/active-faults',
  '/api/login'
];

// Define the middleware function
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a public route or API route
  if (publicRoutes.some(route => pathname.startsWith(route)) || 
      pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const authCookie = request.cookies.get('auth-session');
  
  // If no auth cookie is found, redirect to login
  if (!authCookie) {
    // Prevent redirect loops by checking if we're already redirecting
    const isRedirecting = request.headers.get('x-middleware-rewrite') || 
                          request.headers.get('x-middleware-next') ||
                          request.headers.get('x-middleware-redirect');
                          
    if (isRedirecting) {
      // If we're already in a redirect, just continue to prevent loops
      return NextResponse.next();
    }
    
    const url = new URL('/login', request.url);
    // Encode the pathname to handle special characters
    url.searchParams.set('redirect', encodeURIComponent(pathname));
    
    const response = NextResponse.redirect(url);
    // Add a header to indicate this is a middleware redirect
    response.headers.set('x-middleware-redirect', 'true');
    return response;
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