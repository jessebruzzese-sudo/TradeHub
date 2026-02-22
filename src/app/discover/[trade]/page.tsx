'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { useAuth } from '@/lib/auth';

type ProfileCard = {
  id: string;
  display_name: string;
  business_name: string | null;
  suburb: string | null;
  trade_categories: string[];
  is_verified: boolean;
  avatar_url: string | null;
  isPremium?: boolean;
};

export default function DiscoverTradePage() {
  const params = useParams();
  const router = useRouter();
  const { session, currentUser, isLoading } = useAuth();
  const tradeParam = typeof params.trade === 'string' ? params.trade : params.trade?.[0] ?? '';
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    if (!tradeParam) return;

    fetch(`/api/discovery/trade/${encodeURIComponent(tradeParam)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized');
          throw new Error('Failed to load');
        }
        return res.json();
      })
      .then((data: { profiles: ProfileCard[]; message?: string }) => {
        setProfiles(data.profiles ?? []);
        setMessage(data.message ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [session?.user, tradeParam]);

  useEffect(() => {
    if (isLoading) return;
    if (!session?.user) {
      const returnUrl = getSafeReturnUrl(`/discover/${tradeParam}`, '/discover');
      safeRouterReplace(router, `/login?returnUrl=${encodeURIComponent(returnUrl)}`, '/login');
    }
  }, [isLoading, session?.user, router, tradeParam]);

  if (isLoading || !session?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <PageHeader
          backLink={{ href: '/dashboard' }}
          title={`${tradeParam} near you`}
          description="Discover professionals in your area"
        />

        {error ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">{error}</p>
          </div>
        ) : message && profiles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              No public profiles found for {tradeParam} in your area.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatarUrl={p.avatar_url}
                    userName={p.display_name}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {p.display_name}
                      </span>
                      {p.isPremium && (
                        <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Premium
                        </span>
                      )}
                      {p.is_verified && (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-green-50 text-green-700"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {p.suburb && (
                      <p className="text-sm text-gray-500">{p.suburb}</p>
                    )}
                    {p.trade_categories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.trade_categories.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-auto">
                  {/* TODO: Direct messaging to user - /messages/new?userId=... when available */}
                  <Link href="/messages">
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
