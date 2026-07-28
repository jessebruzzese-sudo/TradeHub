// vim: ts=2

import { NextResponse, type NextRequest } from 'next/server';
import { deleteCookie } from "cookies-next";
import { headers, cookies } from "next/headers";
import { ENV } from "@/lib/env";
import * as jose from "jose";

const PROTECTED_ROUTES = [
  '/dashboard',
  '/jobs',
  '/messages',
  '/notifications',
  '/applications',
	"/profiles",
  '/subcontractors',
  '/users',
  '/admin',
];

// Admin-only areas (UI + API)
const ADMIN_ROUTES = ['/admin', '/api/admin'];

/** Self profile + settings only. `/profile/[id]` legacy URLs redirect to public `/profiles/[id]` and must stay reachable without auth. */
function isProfileSelfOrSettingsRoute(pathname: string): boolean {
  if (pathname === '/profile' || pathname === '/profile/') return true;
  if (pathname === '/profile/edit' || pathname.startsWith('/profile/edit/')) return true;
  if (pathname === '/profile/availability' || pathname.startsWith('/profile/availability/')) return true;
  return false;
}

function isProtectedRoute(pathname: string): boolean {
  if (isProfileSelfOrSettingsRoute(pathname)) return true;
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
  if (pathname.startsWith('/api/') && pathname !== "/api/ping") return false;

  return (
		pathname === "/api/ping" || 
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

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/how-it-works/subcontractors')) {
    const passthrough = NextResponse.next();
    const redirectResponse = NextResponse.redirect(new URL('/how-it-works', request.url));
		redirectResponse.headers.set("Cache-Control", "public, no-transform, must-revalidate");
		return redirectResponse;
  }

  if (shouldSkip(pathname)) {
    let response = NextResponse.next();
		response.headers.set("Cache-Control", "public, no-transform, must-revalidate");
		return response;
  }

  // Only mutate response cookies (no request.cookies.set / no NextResponse.next() per cookie).
  // That pattern can disturb or lock request bodies for downstream handlers (e.g. POST in Playwright).
  let response = NextResponse.next();
	response.headers.set("Cache-Control", "public, no-transform, must-revalidate");
	
	const store = await cookies();	
	const cookie = store.get("authorization") ?? null;
	const authorization = cookie?.value ?? null;
	let isAuthenticated = false;
	let isAdmin = false;
	try{
		const secret = new TextEncoder().encode(ENV.jwt.secret);
		await jose.jwtVerify(authorization, secret);
		const claims = await jose.decodeJwt(authorization);
		isAuthenticated = true;
		isAdmin = claims.role?.toLowerCase() === "admin";
	}catch(err_){
		isAuthenticated = false;
	}
  // -------------------------
  // 1) ADMIN LOCKDOWN
  // -------------------------
  if (isAdminRoute(pathname)) {
    if (!isAuthenticated) {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'NO_USER', source: 'middleware' },
          { status: 401 }
        );
      }
      const fullPath = pathname + search;
      const loginUrl = new URL('/login', request.url);
      const safeReturnUrl = validateReturnUrl(fullPath, '/dashboard');
      loginUrl.searchParams.set('returnUrl', safeReturnUrl);
			store.delete("authorization");
      return NextResponse.redirect(loginUrl);
    }
    if (isAdmin !== true) {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'NOT_ADMIN', source: 'middleware' },
          { status: 403 }
        );
      }
			store.delete("authorization");
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
			redirectResponse.headers.set("Cache-Control", "public, no-transform, must-revalidate");
			return redirectResponse;
    }
  }

  // -------------------------
  // 2) GENERAL PROTECTED ROUTES
  // -------------------------
  if (requiresAuthentication(pathname) && !isAuthenticated) {
		store.delete("authorization");
    const fullPath = pathname + search;
    const loginUrl = new URL('/login', request.url);
    const redirect = NextResponse.redirect(loginUrl);
		redirect.headers.set("Cache-Control", "public, no-transform, must-revalidate");
		return redirect;
  }

  // -------------------------
  // 3) LOGGED-IN MARKETING HOME
  // -------------------------
  if (isAuthenticated && pathname === '/') {
    const url = request.nextUrl.clone();
		if(!isAdmin){
    	url.pathname = '/dashboard';
		}else{
    	url.pathname = '/admin';
		}
    const redirect = NextResponse.redirect(url);
		redirect.headers.set("Cache-Control", "public, no-transform, must-revalidate");
		return redirect;
  }

  // -------------------------
  // 4) AUTH ROUTES (logged in → leave login/signup)
  // -------------------------
  if (isAuthRoute(pathname) && isAuthenticated) {
		store.delete("authorization");
    const redirect = NextResponse.redirect(new URL('/login', request.url));
		redirect.headers.set("Cache-Control", "public, no-transform, must-revalidate");
		return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
