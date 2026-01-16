import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/faqs',
  '/how-it-works',
  '/how-tendering-works',
  '/privacy',
  '/terms',
  '/forgot-password',
  '/verify-business',
];

const PROTECTED_ROUTES = [
  '/dashboard',
  '/jobs',
  '/tenders',
  '/messages',
  '/notifications',
  '/profile',
  '/applications',
  '/subcontractors',
  '/admin',
  '/users',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/signup';
}

function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/image')
  );
}

function validateReturnUrl(url: string | null, fallback: string): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  
  const trimmed = url.trim();
  
  // Block unsafe patterns
  if (
    trimmed.includes('http:') ||
    trimmed.includes('https:') ||
    trimmed.includes('://') ||
    trimmed.startsWith('//') ||
    trimmed.includes('@') ||
    trimmed.toLowerCase().includes('javascript:') ||
    trimmed.toLowerCase().includes('data:') ||
    trimmed.toLowerCase().includes('file:') ||
    trimmed.toLowerCase().includes('blob:')
  ) {
    return fallback;
  }
  
  // Must be relative path
  if (!trimmed.startsWith('/')) {
    return fallback;
  }
  
  // Block auth routes as return URLs
  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) {
    return fallback;
  }
  
  return trimmed;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const fullPath = pathname + search;
    const loginUrl = new URL('/login', request.url);

    if (pathname !== '/dashboard') {
      const safeReturnUrl = validateReturnUrl(fullPath, '/dashboard');
      loginUrl.searchParams.set('returnUrl', safeReturnUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute(pathname) && isAuthenticated) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');
    const safeReturnUrl = validateReturnUrl(returnUrl, '/dashboard');

    if (safeReturnUrl !== '/dashboard') {
      return NextResponse.redirect(new URL(safeReturnUrl, request.url));
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
