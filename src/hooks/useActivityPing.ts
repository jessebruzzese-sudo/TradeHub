// vim: ts=2
'use client';
import { useEffect } from 'react';
import { getAxios } from "@/lib/utils";

/** One ping per authenticated user id per tab lifecycle (covers login + account switch). */
export function useActivityPing(jwt:string) {
  useEffect(() => {
    if (!jwt) return;
		getAxios(jwt).
			put("/api/activity/ping").
				then(()=>{}).
				catch(()=>{});
  }, [jwt]);
}

