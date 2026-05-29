// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { profileTable } from "@/lib/data/defs/profile";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService } from "@/lib/data/service";

export const getProfileImages = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const results = await (await getDB()).
			select({coverDataUrl: profileTable.coverDataUrl, avatarDataUrl: profileTable.avatarDataUrl}).
			from(profileTable).
			innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
			where(eq(usersTable.email, email));
		const cover = results[0]?.coverDataUrl ?? null;
		const avatar = results[0]?.avatarDataUrl ?? null;
		resolve({cover:cover, avatar:avatar});
	});
};

export const getProfileId = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const results = await (await getDB()).select({profileId: usersTable.profileId}).
			from(usersTable).
			where(eq(usersTable.email, email));
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
