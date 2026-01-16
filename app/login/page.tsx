'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';

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
      const defaultUrl = currentUser.role === 'admin' ? '/admin' : '/dashboard';
      const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
      console.log('[Login] Auto-redirecting logged-in user to:', safeReturnUrl);
      safeRouterReplace(router, safeReturnUrl, defaultUrl);
    }
  }, [currentUser, isLoading, returnUrlParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await login(email, password);

      if (user) {
        const defaultUrl = user.role === 'admin' ? '/admin' : '/dashboard';
        const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
        console.log('[Login] Login successful, redirecting to:', safeReturnUrl);
        safeRouterReplace(router, safeReturnUrl, defaultUrl);
      }
    } catch (err: any) {
      const friendlyError = getFriendlyLoginError(err);
      setError(friendlyError);
      console.error('Login failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col justify-center py-8 pb-8">
      <div className="w-full px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-6">
            <Image
              src="/TradeHub -Horizontal-Main.svg"
              alt="TradeHub"
              width={180}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          <h2 className="text-center text-3xl font-bold text-gray-900">Welcome back</h2>

          <p className="mt-2 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href={`/signup${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </p>

          <div className="mt-8 w-full bg-white p-5 sm:p-6 shadow-sm rounded-xl border border-gray-200">
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
  );
}
