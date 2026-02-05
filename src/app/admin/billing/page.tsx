'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { safeRouterReplace } from '@/lib/safe-nav';
import { useToast } from '@/hooks/use-toast';

interface AdminBillingUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  active_plan?: string | null;
  subscription_status?: string | null;
  subscription_renews_at?: string | null;
  subscription_started_at?: string | null;
  subscription_canceled_at?: string | null;
  complimentary_premium_until?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}

export default function AdminBillingPage() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [user, setUser] = useState<AdminBillingUser | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState<number | null>(null);
  const [resyncLoading, setResyncLoading] = useState(false);
  const hasGuarded = useRef(false);

  // Guard: only admins can access this page
  useEffect(() => {
    if (isLoading || hasGuarded.current) return;
    if (!currentUser) {
      hasGuarded.current = true;
      safeRouterReplace(router, '/login?returnUrl=/admin/billing', '/login?returnUrl=/admin/billing');
      return;
    }
    if (!isAdmin(currentUser)) {
      hasGuarded.current = true;
      safeRouterReplace(router, '/dashboard', '/dashboard');
    }
  }, [currentUser, isLoading, router]);

  const handleFetchUser = async () => {
    const value = query.trim();
    if (!value) {
      toast({ title: 'Enter an email or user ID', variant: 'destructive' });
      return;
    }
    setLookupLoading(true);
    setUser(null);
    try {
      const res = await fetch('/api/admin/users/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId: value }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: 'Lookup failed',
          description: json.error || 'Unable to find user',
          variant: 'destructive',
        });
        return;
      }
      setUser(json.user as AdminBillingUser);
    } catch (err) {
      console.error('Admin billing lookup error:', err);
      toast({ title: 'Error', description: 'Failed to look up user', variant: 'destructive' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGrant = async (days: number) => {
    if (!user) return;
    setGrantLoading(days);
    try {
      const res = await fetch('/api/admin/billing/grant-temporary-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, days }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: 'Failed to grant temporary Pro',
          description: json.error || 'Unable to update user subscription',
          variant: 'danger',
        });
        return;
      }
      setUser(json.user as AdminBillingUser);
      toast({ title: 'Temporary Pro granted', description: `Valid for ${days} day(s).` });
    } catch (err) {
      console.error('Admin grant temporary Pro error:', err);
      toast({ title: 'Error', description: 'Failed to grant temporary Pro', variant: 'danger' });
    } finally {
      setGrantLoading(null);
    }
  };

  const handleResync = async () => {
    if (!user) return;
    setResyncLoading(true);
    try {
      const res = await fetch('/api/admin/billing/resync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: 'Resync failed',
          description: json.error || 'Unable to sync with Stripe',
          variant: 'danger',
        });
        return;
      }
      setUser(json.user as AdminBillingUser);
      toast({ title: 'Subscription synced', description: 'User subscription has been refreshed from Stripe.' });
    } catch (err) {
      console.error('Admin resync Stripe error:', err);
      toast({ title: 'Error', description: 'Failed to sync subscription', variant: 'danger' });
    } finally {
      setResyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscriptions"
        description="Grant temporary Pro access and sync subscription state from Stripe for troubleshooting."
      />

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Find user by email or user ID</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. tradie@example.com or user UUID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button onClick={handleFetchUser} disabled={lookupLoading}>
              {lookupLoading ? 'Searching…' : 'Find user'}
            </Button>
          </div>
        </div>
\n        {user && (
          <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  {user.name || 'Unnamed user'}
                </h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline">{user.role || 'user'}</Badge>
                {user.active_plan && (
                  <Badge variant="default" className="bg-blue-600 text-white">
                    {user.active_plan}
                  </Badge>
                )}
              </div>\n            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500">Subscription status</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.subscription_status || 'NONE'}</div>
                  {user.complimentary_premium_until && (
                    <Badge variant="secondary">
                      Complimentary until {new Date(user.compimentary_premium_until as string).toLocaleString()}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500">Renewal &amp; dates</div>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h3 w3" />
                    <span>
                      Renews at:{' '}
                      {user.subscription_renews_at ? new Date(user.subscription_renews_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div>
                    Started:{' '}
                    {user.subscription_started_at ? new Date(user.subscription_started_at).toLocaleDateString() : '—'}
                  </div>
                  <div>
                    Cancelled:{' '}
                    {user.subscription_canceled_at
                      ? new Date(user.subscription_canceled_at).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500">Stripe</div>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span>Customer ID: {user.stripe_customer_id || '—'}</span>
                  </div>
                  <div>Subscription ID: {user.stripe_subscription_id || '—'}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGrant(7)}
                disabled={grantLoading !== null}
              >
                {grantLoading === 7 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Granting 7 days…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Grant 7-day Pro
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGrant(14)}
                disabled={grantLoading !== null}
              >
                {grantLoading === 14 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Granting 14 days…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Grant 14-day Pro
                  </>
                )}
              </Button>
              <Button variant="default" size="sm" onClick={handleResync} disabled={resyncLoading}>
                {resyncLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing with Stripe…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resync from Stripe
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!user && !lookupLoading && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 flex items-center gap-3 text-gray-600 text-sm">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span>Search for a user by email or user ID to manage their subscription.</span>
          </div>
        )}
      </Card>
    </div>
  );
}

