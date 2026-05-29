// vim: ts=2
'use client';

import Link from 'next/link';
import UserContext from "@/lib/user-context";
import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/app-nav';
import { ProfileView } from '@/components/profile/profile-view';
import { useAuth } from '@/lib/auth';
import { buildLoginUrl } from '@/lib/url-utils';
import { getAxios } from "@/lib/utils";

export default function ProfilePage() {
  const { jwt } = useAuth();
  const router = useRouter();
	const UserSession = useContext(UserContext);
	const isLoggedIn = jwt !== null && jwt !== undefined;
	const [profile, setProfile] = useState(UserSession.user);
	const isLoading = profile === null;
	useEffect(()=>{
		if(profile !== null){
			return;
		}	
		getAxios(jwt).
			get("/api/me").
				then((response_)=>{
					setProfile(response_.data);
				}).catch((err_)=>{
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
  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl p-6">
          <h1 className="text-xl font-semibold text-gray-900">Please log in</h1>
          <p className="mt-2 text-sm text-gray-600">You need to be signed in to view your profile.</p>
          <Link href={buildLoginUrl('/profile')} className="mt-4 inline-block">
            <Button>Go to login</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }
  return <ProfileView mode="self" profile={profile} />;
}
