import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/jobs',
  '/messages',
  '/notifications',
  '/profile',
  '/applications',
  '/subcontractors',
  '/users',
  '/admin',
];

// Admin-only areas (UI + API)
const ADMIN_ROUTES = ['/admin', '/api/admin'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

/** Completed Works: manage + create are auth-only; /works/[id] stays public (handled in page + API). */
function isWorksAuthRequired(pathname: string): boolean {
  if (pathname === '/works' || pathname === '/works/') return true;
  if (pathname === '/works/create' || pathname.startsWith('/works/create/')) return true;
  return false;
}

function requiresAuthentication(pathname: string): boolean {
  return isProtectedRoute(pathname) || isWorksAuthRequired(pathname);
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/signup';
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function shouldSkip(pathname: string): boolean {
  // ✅ IMPORTANT: do NOT skip /api/admin/*
  if (pathname.startsWith('/api/admin')) return false;

  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/image')
  );
}

function validateReturnUrl(url: string | null, fallback: string): string {
  if (!url || typeof url !== 'string') return fallback;

  const trimmed = url.trim();

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

  if (!trimmed.startsWith('/')) return fallback;

  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) {
    return fallback;
  }

  return trimmed;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/how-it-works/subcontractors')) {
    return NextResponse.redirect(new URL('/how-it-works', request.url));
  }

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Only mutate response cookies (no request.cookies.set / no NextResponse.next() per cookie).
  // That pattern can disturb or lock request bodies for downstream handlers (e.g. POST in Playwright).
  let response = NextResponse.next();

  if (!supabaseUrl || !supabaseAnon) {
    console.warn(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — skipping auth check'
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // -------------------------
  // 1) ADMIN LOCKDOWN
  // -------------------------
  if (isAdminRoute(pathname)) {
    if (!isAuthenticated) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const fullPath = pathname + search;
      const loginUrl = new URL('/login', request.url);
      const safeReturnUrl = validateReturnUrl(fullPath, '/dashboard');
      loginUrl.searchParams.set('returnUrl', safeReturnUrl);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (profile?.role !== 'admin') {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // -------------------------
  // 2) GENERAL PROTECTED ROUTES
  // -------------------------
  if (requiresAuthentication(pathname) && !isAuthenticated) {
    const fullPath = pathname + search;
    const loginUrl = new URL('/login', request.url);

    if (pathname !== '/dashboard') {
      const safeReturnUrl = validateReturnUrl(fullPath, '/dashboard');
      loginUrl.searchParams.set('returnUrl', safeReturnUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  // -------------------------
  // 3) LOGGED-IN MARKETING HOME
  // -------------------------
  if (isAuthenticated && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // -------------------------
  // 4) AUTH ROUTES (logged in → leave login/signup)
  // -------------------------
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
