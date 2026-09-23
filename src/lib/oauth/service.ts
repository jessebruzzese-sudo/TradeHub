'use server'
// vim: ts=2
import { ENV } from "@/lib/env";
import { google } from "googleapis";
export const getOAuthClient = async () => {
	return new Promise(async(resolve, reject)=>{
		const clientId = ENV?.google?.oAuthClientID ?? null;
		const clientSecret = ENV?.google?.oAuthClientSecret ?? null;
		const redirectUri = ENV?.google?.oAuthRedirectURI ?? null;
		if(clientId === null){
			reject(new Error("OAuth client id is not set"));
			return;
		}
		if(clientSecret === null){
			reject(new Error("OAuth client secret is not set"));
			return;
		}
		if(redirectUri === null){
			reject(new Error("OAuth redirect uri is not set"));
			return;
		}
		const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
		resolve(client);
	});
};
