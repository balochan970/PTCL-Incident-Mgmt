import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = ['/login', '/active-faults'];

// List of protected routes that require authentication
const protectedRoutes = [
  '/',
  '/home',
  '/single-fault',
  '/multiple-faults', 
  '/gpon-faults',
  '/reports',
  '/gpon-reports',
  '/knowledgebase',
  '/fault-locations'
];

// Helper function to clear auth cookies
const clearAuthCookies = (response: NextResponse) => {
  response.cookies.delete('auth');
  return response;
};

// Helper function to verify authentication
const verifyAuthentication = (authCookie: { value: string } | undefined): boolean => {
  if (!authCookie?.value) return false;
  
  try {
    const authData = JSON.parse(authCookie.value);
    const now = new Date().getTime();
    const timestamp = authData.timestamp || 0;
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (
      authData.isAuthenticated && 
      authData.username && 
      authData.role &&
      (now - timestamp <= expiryTime)
    );
  } catch {
    return false;
  }
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { searchParams } = request.nextUrl;

  // Check if the path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Get auth cookie and verify authentication
  const authCookie = request.cookies.get('auth');
  const isAuthenticated = verifyAuthentication(authCookie);

  // For active-faults page, add a source parameter to track where the request came from
  if (pathname === '/active-faults') {
    // Check if this is a direct navigation (not from login or navbar)
    const referer = request.headers.get('referer') || '';
    const isFromLogin = referer.includes('/login');
    
    // If not already in the URL and not a direct navigation from login, add source=navbar
    if (!searchParams.has('source')) {
      const newUrl = new URL(request.url);
      newUrl.searchParams.set('source', isFromLogin ? 'login' : 'navbar');
      return NextResponse.redirect(newUrl);
    }
    
    return NextResponse.next();
  }

  // Handle protected routes
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      return clearAuthCookies(response);
    }
    return NextResponse.next();
  }

  // Handle login route
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Handle public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For any other routes, redirect to login if not authenticated
  if (!isAuthenticated) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    return clearAuthCookies(response);
  }

  return NextResponse.next();
}

// Configure paths that should be protected
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder
     * 5. public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|public|assets).*)',
  ],
}; 