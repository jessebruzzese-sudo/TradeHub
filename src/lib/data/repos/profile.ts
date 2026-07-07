// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc, gte } from "drizzle-orm";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { profileTable, profileLikeTable, profileViewTable } from "@/lib/data/defs/profile";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService, callDb } from "@/lib/data/service";
import { subDays } from "date-fns";

export const incCompletedJobsT = async (profileId:string, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		const existing = await trx.select({completedJobs: profileTable.completedJobs}).
			from(profileTable).
			where(eq(profileTable.id, profileId));
		let completedJobs = existing[0]?.completedJobs ?? null;
		if(completedJobs === null){
			reject(new Error("Could not determine completed job count"));
			return;
		}
		completedJobs += 1;
		await trx.update(profileTable).set({completedJobs}).where(eq(profileTable.id, profileId));
		resolve(completedJobs);
	});
};

export const getConversationProfileT = async (profileId:string, trx:any) => {
	return trx.select({
			visibleName: usersTable.visibleName, 
			name: usersTable.name, 
			id: usersTable.id, 
			email: usersTable.email 
		}).
		from(usersTable).
		where(eq(usersTable.profileId, profileId));
};

export const getConversationProfiles = async (profileIds:array) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();	
		const results = await db.select().from(profileTable).
			innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
			where(inArray(profileTable.id, profileIds));
		const mapped = results.reduce((a, c)=>{ 
			const name = c?.users?.visibleName ?? c?.users?.name;
			const userId = c?.users?.id ?? null;
			const key = c?.profile?.id ?? null;
			a[key] = { name, userId };
			return a;
		}, {});
		resolve(mapped);
	});
};

const getProfileViewsT = async (trx:any, profileId:string, earliest:any) => {
	return trx.select({id: profileViewTable}).
		from(profileViewTable).
		where(
			and(
				eq(profileViewTable.profileId, profileId),
				gte(profileViewTable.createdAt, earliest)
			)
		);
};

export const getStatistics = async (profileId:string) => {
	return await callDb(async(db)=>{
		const PROFILE_VIEW_WINDOW_DAYS = 7;
		return db.transaction(async(trx)=>{
			try{
				const now_ = new Date();
				const earliest = subDays(now_, PROFILE_VIEW_WINDOW_DAYS);
				const views = await getProfileViewsT(trx, profileId, earliest);	
				const { conversations: convRepo, business: businessRepo } = await getDataService();
				const messages = await convRepo.getUnreadMessagesT(trx, profileId);
				return {		
					profileViews7d: views.length,
					openJobsCount: 0, // load this later from api, too messy doing it here
					unreadMessages: messages.length
				};
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const updateRating = async (rating:number, profileId:string) => {
	return await callDb(async(db)=>{
		return db.transaction(async(trx)=>{
			try{
				let votes = await trx.select({upVotes: profileTable.upVotes, downVotes: profileTable.downVotes}).
					from(profileTable).
					where(eq(profileTable.id, profileId));
				if(votes.length === 0){
					reject(new Error("No results returned for query"));
					return;
				}
				votes = votes[0];
				votes.upVotes = rating === 1 ? votes.upVotes + 1 : votes.upVotes;
				votes.downVotes = rating === -1 ? votes.downVotes + 1 : votes.downVotes;
				const results = await trx.update(profileTable).set(votes).
					returning({ upVotes: profileTable.upVotes, downVotes: profileTable.downVotes }).
					where(eq(profileTable.id, profileId));
				const changed = results[0];
				return changed;
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const toggleLike = async (viewerId:string, profileId:string) => {
	return await callDb(async(db)=>{
		return db.transaction(async(trx)=>{
			try{
				// find like
				let results = await db.select({id: profileLikeTable.id}).from(profileLikeTable).
					where(
						and(
							eq(profileLikeTable.userId, viewerId), 
							eq(profileLikeTable.profileId, profileId)
						)
					);
				// if exists, delete
				const likeId = results[0]?.id ?? null;
				let liked = null;
				if(likeId !== null){
					await trx.delete(profileLikeTable).where(eq(profileLikeTable.id, likeId));
					liked = false;
				}else{
					// if not create
					const values = { userId: viewerId, profileId };
					await trx.insert(profileLikeTable).values(values);
					liked = true;
				}
				// count likes
				// select only id for an index scan
				results = await trx.select({id: profileLikeTable}).
					from(profileLikeTable).
					where(eq(profileLikeTable.profileId, profileId));
				// return state
				// whether or not the user likes the profile
				// and the number of likes the profile has
				const state_ = {
					liked, 
					likesCount: results.length
				};
				return state_;
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const getProfileImages = async (id:string) => {
	return new Promise(async(resolve, reject)=>{
		const results = await (await getDB()).
			select({coverDataUrl: profileTable.coverDataUrl, avatarDataUrl: profileTable.avatarDataUrl}).
			from(profileTable).
			where(eq(profileTable.id, id));
		const cover = results[0]?.coverDataUrl ?? null;
		const avatar = results[0]?.avatarDataUrl ?? null;
		resolve({cover:cover, avatar:avatar});
	});
};

export const addProfileView = async (viewerUserId:string, profileId:string) => {
	return (await getDB()).
		insert(profileViewTable).
		values({userId: viewerUserId, profileId}).
		returning({id:profileViewTable.id});
};

export const getProfileId = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const results = await (await getDB()).select({profileId: usersTable.profileId}).
			from(usersTable).
			where(eq(usersTable.id, userId));
		const profileId = results[0]?.profileId ?? null;
		resolve(profileId);
	});
};

export const setProfileCover = async (profileId:integer, filePath:string) => {
	return (await getDB()).update(profileTable).
		set({coverDataUrl: filePath}).
		where(eq(profileTable.id, profileId));
};

export const setProfileAvatar = async (profileId:integer, filePath:string) => {
	return (await getDB()).update(profileTable).
		set({avatarDataUrl: filePath}).
		where(eq(profileTable.id, profileId));
};

export const addProfileT = async (trx:any) => {
	return new Promise(async(resolve, reject) => {
		const values = { showAbn: false }; // just a single value is required
		const results = await trx.insert(profileTable).values(values).returning({id:profileTable.id});
		const profileId = results[0]?.id ?? null;
		if(profileId === null){
			reject(new Error("Failed to create new profile"));
			return;
		}
		resolve(profileId);
	});	
};

export const updateProfileT = async (trx:any, payload:any, profileId:string) => {
	return trx.update(profileTable).
		set({
			phone: payload.phone,
			bio: payload.bio, miniBio: payload.miniBio, 
			website: payload.website, facebook: payload.facebook, 
			instagram: payload.instagram, tiktok: payload.tiktok, 
			youtube: payload.youtube, linkedin: payload.linkedin,
			showPhone: payload.showPhone, showEmail: payload.showEmail, 
			showAbn: payload.showAbn, showBusinessName: payload.showBusinessName, 
			showListingPrice: payload.showListingPrice,
			skills: payload.skills
		}).where(eq(profileTable.id, profileId));
};
