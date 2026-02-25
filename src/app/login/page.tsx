'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { isAdmin } from '@/lib/is-admin';

function getFriendlyLoginError(error: any): string {
  if (!error) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  const errorMessage = (error?.message || '').toLowerCase();
  const errorCode = error?.code || error?.status || '';

  // Invalid credentials
  if (
    errorMessage.includes('invalid login') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('email not confirmed') ||
    errorMessage.includes('wrong password') ||
    errorCode === 'invalid_credentials' ||
    errorCode === 'invalid_grant'
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  // Network/connection errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorCode === 'network_error'
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Rate limiting
  if (
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit') ||
    errorCode === 'too_many_requests'
  ) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }

  // Default fallback
  return 'Unable to sign in. Please try again later.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');

  // If already logged in, redirect away from /login
  useEffect(() => {
    if (!isLoading && currentUser) {
      const defaultUrl = isAdmin(currentUser) ? '/admin' : '/dashboard';
      const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
      console.log('[Login] Auto-redirecting logged-in user to:', safeReturnUrl);
      safeRouterReplace(router, safeReturnUrl, defaultUrl);
    }
  }, [currentUser, isLoading, returnUrlParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
    await login(email, password);

// If login() succeeds (no throw), redirect:
const defaultUrl = isAdmin(currentUser) ? '/admin' : '/dashboard';
const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);

console.log('[Login] Login successful, redirecting to:', safeReturnUrl);
safeRouterReplace(router, safeReturnUrl);

    } catch (err: any) {
      const friendlyError = getFriendlyLoginError(err);
      setError(friendlyError);
      console.error('Login failed:', err);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
          <div className="text-white/90 text-sm">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
        {/* Dotted overlay - behind watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* Watermark (fixed to viewport) - above background, behind content */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-whiteout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.08]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <Link href="/" className="inline-flex justify-center">
                <Image
                  src="/tradehub-logo-white.svg"
                  alt="TradeHub"
                  width={180}
                  height={48}
                  className="h-14 sm:h-16 md:h-36 lg:h-44 w-auto object-contain"
                />
              </Link>

              <h2 className="mt-6 text-center text-3xl font-bold text-white">Welcome back</h2>

              <p className="mt-2 text-center text-sm text-white/90">
              Don&apos;t have an account?{' '}
              <Link
                href={`/signup${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`}
                className="font-medium text-white hover:text-white/80 underline"
              >
                Sign up
              </Link>
            </p>
            </div>

            <div className="w-full bg-white p-5 sm:p-6 shadow-sm rounded-xl border border-gray-200">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-r-md"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
