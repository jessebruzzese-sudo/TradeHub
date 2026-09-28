"use client";
// vim:ts=2
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { getAxios } from "@/lib/utils";
import { toast } from "sonner";

export default function GoogleOAuthRedirectPage(props:any) {
	const [loading, setLoading] = useState(true);	
	const router = useRouter();
	const params = useSearchParams();
  const code = params.get("code");
	const state = params.get("state");
	const scope = params.get("scope");
	const authuser = params.get("authuser");
	useEffect(()=>{
		if(!loading){
			return;
		}
		// params from google
		const payload = {
			code, state, scope, authuser
		};
		getAxios(null).post("/api/auth/google/login", payload).
			then((response_)=>{
				const data = response_.data;
				setLoading(false);
				// if new user
				// redirect to profile edit
				// else redirect to dashboard
				setTimeout(()=>{
					router.push(data?.redirect ?? "/");
				}, 1000);
			}).catch((err_)=>{
				toast.error("Could not login with oauth details");	
			});
	},[loading]);
	return (
		<p>{loading?"Loading ...":"Redirecting ..."}</p>
	);
};
