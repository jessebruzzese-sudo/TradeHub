// vim: ts=2
'use client';

import Link from 'next/link';
import UserContext from "@/lib/user-context";
import UserProvider from "@/components/hoc/UserProvider";
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

	if(isLoading){
		return (
			<AppLayout>
				<UserProvider onUserLoaded={(user)=>{setProfile(user);}}>
					<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
						Redirecting...
					</div>
				</UserProvider>
			</AppLayout>
		);
	}

  return (
		<UserProvider onUserLoaded={(user)=>{setProfile(user);}}>
			<ProfileView mode="self" profile={profile} />;
		</UserProvider>
	);
}
