import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/active-faults',
  '/api/login'
];

// Define static asset patterns
const staticAssetPatterns = [
  /\.(jpg|jpeg|png|gif|svg|ico|webp)$/,
  /\.(css|js|json)$/,
  /^\/favicon\.ico$/,
  /^\/manifest\.json$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/api\/(?!auth)/
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }
  
  // Skip middleware for static assets
  if (staticAssetPatterns.some(pattern => pattern.test(pathname))) {
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const authCookie = request.cookies.get('auth-session');
  
  // If no auth cookie, redirect to login
  if (!authCookie) {
    // Check if we already have a redirect header to prevent loops
    const hasRedirectHeader = request.headers.get('x-middleware-redirect');
    if (hasRedirectHeader) {
      console.log('Middleware: Preventing redirect loop - already redirecting');
      return NextResponse.next();
    }
    
    // Check referer to avoid redirecting from login page back to itself
    const referer = request.headers.get('referer') || '';
    if (referer.includes('/login')) {
      console.log('Middleware: Skipping redirect - coming from login page');
      return NextResponse.next();
    }
    
    // Check for recent redirect cookie to prevent loops
    const recentRedirect = request.cookies.get('recent-redirect');
    if (recentRedirect) {
      // Clear the cookie and skip the redirect
      const response = NextResponse.next();
      response.cookies.delete('recent-redirect');
      return response;
    }
    
    // Construct redirect URL
    const encodedPathname = encodeURIComponent(pathname);
    const redirectUrl = new URL(`/login?redirect=${encodedPathname}`, request.url);
    
    // Create redirect response
    const response = NextResponse.redirect(redirectUrl);
    
    // Set a cookie to track recent redirects (expires in 3 seconds)
    response.cookies.set('recent-redirect', 'true', { 
      maxAge: 3,
      path: '/',
      httpOnly: true,
      sameSite: 'strict'
    });
    
    // Set headers to indicate this is a middleware redirect
    response.headers.set('x-middleware-redirect', 'true');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
  
  // User is authenticated, allow access
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /_next/* (Next.js internals)
     * 3. /_static/* (static files)
     * 4. /_vercel/* (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml, /robots.txt (common static files)
     */
    '/((?!_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}; 