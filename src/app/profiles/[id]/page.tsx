// vim: ts=2
"use client";
import { getAxios } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { redirect, useParams } from 'next/navigation';
import { ProfileView } from '@/components/profile/profile-view';
import { PublicProfileNotFound } from '@/components/profile/public-profile-not-found';
import { loadPublicProfileForPage } from '@/lib/profiles/load-public-profile-for-page';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

const PublicProfileByIdPage = () => {

	const params = useParams();
  const profileId = params?.id?.trim();
	const { jwt } = useAuth();
	const [ profile, setProfile ] = useState<any|null>(null);
	const [ exists, setExists ] = useState<boolean>(true);
	const loading = profile === null;
	const hasSession = jwt  !== undefined && jwt !== null;
	
	useEffect(()=>{
		if(!exists){
			return; 
		}	
		if(!profileId){
			return; 
		}	
		if(profile !== null){
			return;
		}
		getAxios(null).get(`/api/users/${profileId}/public-profile`).
			then((response)=>{
				const data = response.data;
				setProfile(data);
			}).catch((err_)=>{
				setExists(false);
			});
	}, [profile]);
		
	if(!hasSession){
		redirect("/login");
		return;
	}
	
  if (!profileId) {
    redirect('/dashboard');
		return;	
  }
	if(loading && exists){
		{/* TODO need loading component */}
		return <p>Loading</p>;
	}
  const isMe = profileId === (profile?.viewer?.userId ?? null);
  if (!exists) {
    return <PublicProfileNotFound />;
  }
  return (
    <div data-testid="public-profile-page">
      <ProfileView
        mode="public"
        profile={profile.user}
        isMe={isMe}
        strengthCalc={null}
        viewerLikeState={false}
      />
    </div>
  );
}
export default PublicProfileByIdPage;
