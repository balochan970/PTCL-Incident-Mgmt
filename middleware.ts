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
  
  // Check if this is a public route or static asset
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );
  
  const isStaticAsset = 
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon');
  
  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const authCookie = request.cookies.get('auth-session');
  
  // If no auth cookie is found, redirect to login
  if (!authCookie) {
    // Prevent redirect loops by checking if we're already redirecting
    const isRedirecting = 
      request.headers.get('x-middleware-rewrite') || 
      request.headers.get('x-middleware-next') ||
      request.headers.get('x-middleware-redirect') ||
      request.headers.get('x-auth-redirect');
                          
    if (isRedirecting) {
      // If we're already in a redirect, just continue to prevent loops
      console.log('Middleware: Preventing redirect loop');
      return NextResponse.next();
    }
    
    // Check if we're coming from the login page to prevent loops
    const referer = request.headers.get('referer') || '';
    if (referer.includes('/login')) {
      console.log('Middleware: Coming from login page, preventing redirect loop');
      return NextResponse.next();
    }
    
    const url = new URL('/login', request.url);
    // Encode the pathname to handle special characters
    url.searchParams.set('redirect', encodeURIComponent(pathname));
    
    const response = NextResponse.redirect(url);
    // Add headers to indicate this is a middleware redirect
    response.headers.set('x-middleware-redirect', 'true');
    response.headers.set('x-auth-redirect', 'true');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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