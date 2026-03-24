// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { Bell, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/lib/auth';
import { useNotificationsUnread } from '@/lib/notifications-unread-context';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

type Notification = {
  id: string;
  title: string;
  description: string;
  type: string;
  data: Record<string, unknown> | null;
  read: boolean | null;
  created_at: string | null;
  link?: string;
};

function GenericNotificationCard({
  notification,
  onDelete,
}: {
  notification: Notification;
  onDelete: () => void;
}) {
  const link = notification.link ?? (notification.data as { link?: string } | null)?.link;
  const content = (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow ${
        !notification.read ? 'bg-blue-50' : ''
      } ${link ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-semibold text-gray-900">{notification.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              )}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
                aria-label="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
          <p className="text-xs text-gray-500">
            {notification.created_at ? timeAgo(notification.created_at) : ''}
          </p>
          {link && (
            <p className="mt-2 text-xs text-blue-600 font-medium">View →</p>
          )}
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
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
  const { setHasUnread } = useNotificationsUnread();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('id, title, description, type, data, read, created_at, link')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    let list: Notification[] = [];
    if (fetchError) {
      console.error('Failed to fetch notifications:', fetchError);
      setError('Unable to load notifications. Please try again later.');
      setNotifications([]);
    } else {
      list = (data ?? []).map((n) => ({
        ...n,
        link: (n as { link?: string }).link,
      }));
      setNotifications(list);
    }
    setHasUnread(list.some((n) => !n.read));
    setLoading(false);
  }, [currentUser?.id, supabase, setHasUnread]);

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
      setHasUnread(false);
    }
  };

  const handleDelete = async (id: string) => {
    const remaining = notifications.filter((n) => n.id !== id);
    setNotifications(() => remaining);
    setHasUnread(remaining.some((n) => !n.read));

    if (currentUser?.id) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        toast.error('Could not delete notification');
        fetchNotifications();
      }
    }
  };

  const hasUnread = notifications.some((n) => !n.read);
  const isEmpty = !loading && notifications.length === 0;

  return (
    <AppLayout transparentBackground>
      {/* PRICING-STYLE BLUE WRAPPER */}
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
        {/* Dotted overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* White watermark (fixed like Pricing) */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-whiteout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.08]"
          />
        </div>

        {/* PAGE CONTENT */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* Header row (white text on blue) */}
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 shadow-sm ring-1 ring-white/15 backdrop-blur">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Notifications</h1>
              </div>
              <p className="mt-1 text-sm text-white/80">
                View alerts and activity
              </p>
            </div>
            {!isEmpty && (
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasUnread}
                onClick={handleMarkAllRead}
                className="h-9 rounded-xl bg-white/10 text-white hover:bg-white/20 border-white/20"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Main surface (glass card on blue) */}
          <div className="rounded-2xl border border-white/15 bg-white/90 shadow-sm backdrop-blur p-4 sm:p-6">
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
                    className="bg-white/60 border border-gray-200 rounded-xl p-4 animate-pulse"
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
                  <GenericNotificationCard
                    key={notification.id}
                    notification={notification}
                    onDelete={() => handleDelete(notification.id)}
                  />
                ))}
              </div>
            )}

            {isEmpty && (
              <div className="rounded-xl p-8">
                <EmptyState
                  icon={Bell}
                  title="No notifications yet"
                  description="You'll see updates here when someone applies, accepts a job, or sends a message."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
