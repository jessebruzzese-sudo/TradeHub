// vim: ts=2
'use client';
import { useEffect } from 'react';
import { getAxios } from "@/lib/utils";

/** One ping per authenticated user id per tab lifecycle (covers login + account switch). */
export function useActivityPing(trigger:boolean, cb:any) {
  useEffect(() => {
		if(!trigger){
			return;
		}
		getAxios(null).
			put("/api/activity/ping").
				then(()=>{ cb(!trigger); }).
				catch(()=>{});
  }, [trigger]);
}

