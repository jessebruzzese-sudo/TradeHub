// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { profileTable, profileLikeTable } from "@/lib/data/defs/profile";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService } from "@/lib/data/service";

export const toggleLike = async (viewerId:string, profileId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		return await db.transaction(async(trx)=>{
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
			resolve(state_);
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
			showListingPrice: payload.showListingPrice
		}).where(eq(profileTable.id, profileId));
};
