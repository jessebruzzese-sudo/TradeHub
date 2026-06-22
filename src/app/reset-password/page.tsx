// vim: ts=2
'use client';

import { getAxios } from "@/lib/utils";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {

	const query = useSearchParams();
  const router = useRouter();
	const [token, setToken] = useState(query.get("state"));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
		getAxios(null).post("/api/auth/reset-password", {password, state:token}).
			then((response_)=>{
				setSubmitting(false);
				router.push("/login");	
			}).catch((error_)=>{
				const msg = error_?.response?.data?.error ?? null;
				if(msg)
      		setError(msg);
				setSubmitting(false);
			});
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <Image
            src="/TradeHub -Horizontal-Main.svg"
            alt="TradeHub"
            width={180}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <h2 className="text-center text-3xl font-bold text-gray-900">Set a new password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a new password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-gray-200">
          {status === 'checking' ? (
            <p className="text-sm text-gray-600 text-center">Validating reset link...</p>
          ) : null}

          {status === 'invalid' ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                This reset link is invalid or expired.
              </div>
              <Link href="/forgot-password">
                <Button className="w-full">Request a new reset link</Button>
              </Link>
            </div>
          ) : null}

          {status === 'ready' ? (
            <form className="space-y-6" onSubmit={onSubmit}>
              {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              ) : null}

              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Updating password...' : 'Update password'}
              </Button>
            </form>
          ) : null}

          {status === 'done' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
              Password updated. Redirecting to login...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
