// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc, ne } from "drizzle-orm";
import { getDB } from "@/lib/data/service";
import { conversationTable, messagesTable } from "@/lib/data/defs/conversations";
import { profileTable } from "@/lib/data/defs/profile";
import { getConversationProfileT } from "@/lib/data/repos/profile";
import { usersTable } from "@/lib/data/defs/users";

export const markMessagesAsRead = async (conversationId:string, receiverProfileId:string) => {
	return (await getDB()).
		update(messagesTable).
		set({read:true}).
		where(
			and(
				eq(messagesTable.conversationId, conversationId), 
				ne(messagesTable.senderProfileId, receiverProfileId)
			)
		);
};
export const getUnreadMessagesT = async (trx:any, profileId:string) => {	
	return await trx.select({id: messagesTable.id}).
			from(messagesTable).
			innerJoin(conversationTable, eq(conversationTable.id, messagesTable.conversationId)).
			where(
				and(
					and(
						or(
							eq(conversationTable.ownerProfileId, profileId),
							eq(conversationTable.guestProfileId, profileId)
						),
						eq(messagesTable.read, false)
					),
					ne(messagesTable.senderProfileId, profileId)
				)
			);
};

export const addMessage = async (msg:any) => {
	return (await getDB()).insert(messagesTable).
		values(msg).
		returning({id: messagesTable.id});
};

export const upsertConversation = async (ownerProfileId, guestProfileId) => {
	const db = await getDB();
	return db.transaction(async(trx)=>{
		// ensure that there is one conversation for *either* combination of
		// owner and guest profile 
		let results = await trx.select({id: conversationTable.id}).
			from(conversationTable).
			where(
				or(
					and(
						eq(conversationTable.ownerProfileId, ownerProfileId), 
						eq(conversationTable.guestProfileId, guestProfileId)
					),
					and(
						eq(conversationTable.ownerProfileId, guestProfileId), 
						eq(conversationTable.guestProfileId, ownerProfileId)
					)
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
		where(eq(messagesTable.conversationId, conversationId)).
		orderBy(asc(messagesTable.createdAt));
};

export const getConversation = async (conversationId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const conversation = await db.transaction(async(trx)=>{
			const results = await db.select().from(conversationTable).
				where(eq(conversationTable.id, conversationId));
			// no results
			// let callee decide
			if(results.length === 0){
				resolve(null);
				return;
			}
			// querying by id, shouldn't be more then one result
			if(results.length > 1){
				reject(new Error(`Too many results returned, was expecting 1 but was ${results.length}`));
				return;
			}
			const convo = { ...results[0] };
			const guestProfile = await getConversationProfileT(convo.guestProfileId, trx);
			const ownerProfile = await getConversationProfileT(convo.ownerProfileId, trx);
			const guestName = guestProfile[0]?.visibleName ?? guestProfile[0]?.name;
			const ownerName = ownerProfile[0]?.visibleName ?? ownerProfile[0]?.name;
			const guestUserId = guestProfile[0]?.id ?? null;
			const ownerUserId = ownerProfile[0]?.id ?? null;
			convo.ownerUserId = ownerUserId;
			convo.ownerName = ownerName;
			convo.guestUserId = guestUserId;
			convo.guestName = guestName;
			return convo;
		});
		resolve(conversation);
	});
};

export const getConversations = async (userId:string, owner:boolean) => {
	return new Promise(async(resolve, reject)=>{	
		const db = await getDB();
		const conversations = await db.transaction(async(trx)=>{
			let results = null;
			if(owner){
				// join on owner id
				results = await trx.select().from(conversationTable).
					innerJoin(profileTable, eq(profileTable.id, conversationTable.ownerProfileId)).
					innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
					where(eq(usersTable.id, userId)).
					orderBy(asc(conversationTable.createdAt));
			}else{
				// join on guest id
				results = await trx.select().from(conversationTable).
					innerJoin(profileTable, eq(profileTable.id, conversationTable.guestProfileId)).
					innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
					where(eq(usersTable.id, userId)).
					orderBy(asc(conversationTable.createdAt));
			}
			const mapped = [];
			for(const c of results){
				const conversation = { ...c.conversations };
				if(owner){
					conversation.ownerName = c.users.visibleName ?? c.users.name;
					conversation.ownerUserId = c.users.id;
					const guestProfileId = c.conversations.guestProfileId;
					const guestProfile = await getConversationProfileT(guestProfileId, trx);
					const guestName = guestProfile[0]?.visibleName ?? guestProfile[0]?.name;
					const guestUserId = guestProfile[0]?.id ?? null;
					conversation.guestName = guestName;
					conversation.guestUserId = guestUserId;
				}else{
					conversation.guestName = c.users.visibleName ?? c.users.name;
					conversation.guestUserId = c.users.id;
					const ownerProfileId = c.conversations.ownerProfileId;
					const ownerProfile = await getConversationProfileT(ownerProfileId, trx);
					const ownerName = ownerProfile[0]?.visibleName ?? ownerProfile[0]?.name;
					const ownerUserId = ownerProfile[0]?.id;
					conversation.ownerName = ownerName;
					conversation.ownerUserId = ownerUserId;
				}
				mapped.push(conversation);
			}
			return mapped;
		});
		resolve(conversations);
	});
};
