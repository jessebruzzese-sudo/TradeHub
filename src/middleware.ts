import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: req,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    console.warn(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — skipping auth check'
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
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

  const url = req.nextUrl.clone();

  // If user is logged in and visiting the homepage, redirect to dashboard
  if (user && url.pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup pages
  if (user && (url.pathname === '/login' || url.pathname === '/signup')) {
    const returnUrl = url.searchParams.get('returnUrl');
    const safePath =
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.includes('://') &&
      !returnUrl.includes('@')
        ? returnUrl
        : '/dashboard';
    url.pathname = safePath;
    url.searchParams.delete('returnUrl');
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common image extensions (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
