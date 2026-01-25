"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

export function useAuthReady() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getBrowserSupabase();

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(!!data?.session);
      } catch {
        if (!mounted) return;
        setHasSession(false);
      } finally {
        if (!mounted) return;
        setReady(true);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return;
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { ready, hasSession };
}
