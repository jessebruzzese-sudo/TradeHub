'use client';

import { useEffect, useRef } from 'react';

/** One ping per authenticated user id per tab lifecycle (covers login + account switch). */
export function useActivityPing(userId: string | null | undefined) {
  const pingedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (pingedForUserIdRef.current === userId) return;
    pingedForUserIdRef.current = userId;

    fetch('/api/activity/ping', { method: 'POST', credentials: 'include' }).catch(() => {
      // non-blocking; this should never break page rendering
    });
  }, [userId]);
}

