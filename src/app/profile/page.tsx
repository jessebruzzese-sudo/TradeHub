'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/app-nav';
import { ProfileView } from '@/components/profile/profile-view';
import { useAuth } from '@/lib/auth';
import { buildLoginUrl } from '@/lib/url-utils';

export default function ProfilePage() {
  const { session, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/');
    }
  }, [currentUser, router]);

  if (!session?.user) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl p-6">
          <h1 className="text-xl font-semibold text-gray-900">Please log in</h1>
          <p className="mt-2 text-sm text-gray-600">You need to be signed in to view your profile.</p>
          <Link href={buildLoginUrl('/profile')} className="mt-4 inline-block">
            <Button>Go to login</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Redirecting...
        </div>
      </AppLayout>
    );
  }

  return <ProfileView mode="self" profile={currentUser} />;
}
