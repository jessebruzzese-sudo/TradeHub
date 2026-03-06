'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { slugifyTrade } from '@/lib/slug-utils';
import { toast } from 'sonner';

type Notification = {
  id: string;
  title: string;
  description: string;
  type: string;
  data: Record<string, unknown> | null;
  read: boolean | null;
  created_at: string | null;
};

function QuoteRequestNotificationCard({
  notification,
  supabase,
  onAction,
}: {
  notification: Notification;
  supabase: ReturnType<typeof getBrowserSupabase>;
  onAction: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [trades, setTrades] = useState<{ trade: string }[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [resolved, setResolved] = useState(false);

  const data = (notification.data ?? {}) as { request_id?: string; tender_id?: string };
  const requestId = data.request_id as string | undefined;
  const tenderId = data.tender_id as string | undefined;

  const isQuoteRequest = notification.type === 'QUOTE_REQUEST';

  useEffect(() => {
    if (isQuoteRequest && tenderId) {
      supabase
        .from('tender_trade_requirements')
        .select('trade')
        .eq('tender_id', tenderId)
        .then(({ data: reqs }) => {
          const list = (reqs ?? []) as { trade: string }[];
          setTrades(list);
          if (list.length === 1) setSelectedTrade(slugifyTrade(list[0].trade));
        });
    }
  }, [isQuoteRequest, tenderId, supabase]);

  const handleAccept = async () => {
    if (!requestId || !selectedTrade) {
      toast.error('Please select a trade');
      return;
    }
    setAccepting(true);
    try {
      const { error } = await supabase.rpc('accept_quote_request', {
        p_request_id: requestId,
        p_trade_slug: selectedTrade,
      });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('quote_trade_limit_reached')) toast.error('Requester has used their 3 quotes for this trade.');
        else toast.error('Could not accept.');
        return;
      }
      toast.success('Request accepted');
      setResolved(true);
      onAction();
    } catch (e) {
      toast.error('Could not accept');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!requestId) return;
    setDeclining(true);
    try {
      const { error } = await supabase.rpc('decline_quote_request', { p_request_id: requestId });
      if (error) {
        toast.error('Could not decline');
        return;
      }
      toast.success('Request declined');
      setResolved(true);
      onAction();
    } catch (e) {
      toast.error('Could not decline');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-semibold text-gray-900">{notification.title}</h3>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
          <p className="text-xs text-gray-500 mb-3">{notification.created_at ? timeAgo(notification.created_at) : ''}</p>
          {isQuoteRequest && !resolved && requestId && tenderId && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {trades.length > 1 ? (
                <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {trades.map((t) => (
                      <SelectItem key={t.trade} value={slugifyTrade(t.trade)}>
                        {t.trade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={accepting || declining || (trades.length > 1 && !selectedTrade)}
              >
                {accepting ? 'Accepting…' : 'Accept'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} disabled={accepting || declining}>
                {declining ? 'Declining…' : 'Decline'}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/tenders/${tenderId}`}>View tender</Link>
              </Button>
            </div>
          )}
          {isQuoteRequest && resolved && tenderId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/tenders/${tenderId}`}>View tender</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const supabase = getBrowserSupabase();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('id, title, description, type, data, read, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch notifications:', fetchError);
      setError('Unable to load notifications. Please try again later.');
      setNotifications([]);
    } else {
      setNotifications(data ?? []);
    }

    setLoading(false);
  }, [currentUser?.id, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!currentUser?.id || notifications.length === 0) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);

    if (!updateError) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const hasUnread = notifications.some((n) => !n.read);
  const isEmpty = !loading && notifications.length === 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasUnread}
              onClick={handleMarkAllRead}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <QuoteRequestNotificationCard
                key={notification.id}
                notification={notification}
                supabase={supabase}
                onAction={fetchNotifications}
              />
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="You'll see updates here when someone applies, accepts a job, or sends a message."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
