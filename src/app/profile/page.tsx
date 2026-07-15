// vim: ts=2
'use client';

import Link from 'next/link';
import UserContext from "@/lib/user-context";
import { useEffect, useState, useContext } from 'react';
import { useRouter, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/app-nav';
import { ProfileView } from '@/components/profile/profile-view';
import { buildLoginUrl } from '@/lib/url-utils';
import { getAxios } from "@/lib/utils";

export default function ProfilePage() {

  const router = useRouter();
	const UserSession = useContext(UserContext);
	const [profile, setProfile] = useState(UserSession.user);

	const isLoading = profile === null;

	useEffect(()=>{
		if(profile !== null){
			return;
		}	
		getAxios(null).
			get("/api/me").
				then((response_)=>{
					const user_ = response_.data;
					setProfile(user_);
					UserSession.user = user_;
				}).catch((err_)=>{
					console.error(err_);
					setProfile(null);
				});
	}, [profile]);

	if(isLoading){
		return (
			<AppLayout>
				<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
					Redirecting...
				</div>
			</AppLayout>
		);
	}

  return <ProfileView mode="self" profile={profile} />;
}
