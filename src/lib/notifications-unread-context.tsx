'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';

/** Whether user has at least one unread notification. Used for nav indicators. */
const NotificationsUnreadContext = createContext<{
  hasUnread: boolean | null;
  setHasUnread: (v: boolean | null) => void;
}>({ hasUnread: null, setHasUnread: () => {} });

export function NotificationsUnreadProvider({ children }: { children: React.ReactNode }) {
  const [hasUnread, setHasUnread] = useState<boolean | null>(null);

  return (
    <NotificationsUnreadContext.Provider value={{ hasUnread, setHasUnread }}>
      <NotificationsUnreadInitializer setHasUnread={setHasUnread} />
      {children}
    </NotificationsUnreadContext.Provider>
  );
}

function NotificationsUnreadInitializer({
  setHasUnread,
}: {
  setHasUnread: (v: boolean | null) => void;
}) {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.id) {
      setHasUnread(null);
      return;
    }

    let cancelled = false;
    const supabase = getBrowserSupabase();

    const check = () =>
      supabase
        .from('notifications')
        .select('id, read')
        .eq('user_id', currentUser.id)
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            setHasUnread(false);
            return;
          }
          const list = data ?? [];
          setHasUnread(list.some((n) => !n.read));
        });

    void Promise.resolve(check()).catch(() => {
      if (!cancelled) setHasUnread(false);
    });

    const interval = setInterval(check, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  return null;
}

export function useNotificationsUnread() {
  return useContext(NotificationsUnreadContext);
}
