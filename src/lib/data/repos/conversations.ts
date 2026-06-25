// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB } from "@/lib/data/service";
import { conversationTable, messagesTable } from "@/lib/data/defs/conversations";
import { profileTable } from "@/lib/data/defs/profile";
import { usersTable } from "@/lib/data/defs/users";

export const upsertConversation = async (ownerProfileId, guestProfileId) => {
	const db = await getDB();
	return db.transaction(async(trx)=>{
		let results = await trx.select({id: conversationTable.id}).
			from(conversationTable).
			where(
				and(
					eq(conversationTable.ownerProfileId, ownerProfileId), 
					eq(conversationTable.guestProfileId, guestProfileId)
				)
			);
		let conversationId = results[0]?.id ?? null;
		if(conversationId){
			return conversationId;
		}
		results = await trx.insert(conversationTable).
			values({ownerProfileId, guestProfileId}).
			returning({id: conversationTable.id});
		conversationId = results[0]?.id ?? null;
		if(!conversationId){
			throw new Error(`Failed to determine conversation id`);
		}
		return conversationId;
	});
};

export const getMessages = async (conversationId:string) => {
	return (await getDB()).select().
		from(messagesTable).
		where(eq(messagesTable.conversationId, conversationId));
};

export const getConversation = async (userId:string, conversationId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select().from(conversationTable).
			innerJoin(profileTable, eq(profileTable.id, conversationTable.ownerProfileId)).
			innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
			where(and(eq(usersTable.id, userId), eq(conversationTable.id, conversationId)));
		// no results
		// let callee decide
		if(results.length === 0){
			resolve(null);
			return;
		}
		if(results.length > 1){
			reject(new Error(`Too many results returned, was expecting 1 but was ${results.length}`));
			return;
		}
		const convo = { ...results[0].conversations };
		convo.ownerName = results[0].users.visibleName ?? results[0].users.name;
		convo.ownerUserId = results[0].users.id;
		resolve(convo);
	});
};

export const getConversations = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{	
		const db = await getDB();
		const results = await db.select().from(conversationTable).
			innerJoin(profileTable, eq(profileTable.id, conversationTable.ownerProfileId)).
			innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
			where(eq(usersTable.id, userId));
		// TODO only map required?
		// dont really need a reduce here?
		// dont think there's any 1:M relations here
		const grouped = results.reduce((a, c)=>{
			const key = c?.conversations?.id ?? null;	
			if(key !== null && a[key] === undefined){
				a[key] = {
					...c.conversations,
					ownerName: c.users.visibleName ?? c.users.name,
					ownerUserId: c.users.id
				};
			}
			return a;
		}, {});
		const mapped = Object.keys(grouped).map((e,i)=>{ 
			return grouped[e];
		});
		resolve(mapped);
	});
};
