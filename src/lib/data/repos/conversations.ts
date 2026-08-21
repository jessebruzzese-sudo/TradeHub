// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc, ne } from "drizzle-orm";
import { getDB, callDb } from "@/lib/data/service";
import { conversationTable, messagesTable } from "@/lib/data/defs/conversations";
import { profileTable } from "@/lib/data/defs/profile";
import { jobsTable } from "@/lib/data/defs/jobs";
import { getConversationProfileT } from "@/lib/data/repos/profile";
import { usersTable } from "@/lib/data/defs/users";

// delete all conversations linked to the specified profile
// profile could be either an owner or a guest to a conversation
export const deleteConversationsT = async (profileId:string, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		try{
			// find appropriate conversations
			const results = await trx.select({id: conversationTable.id}).
				from(conversationTable).
				where(
					or(
						eq(conversationTable.ownerProfileId, profileId), 
						eq(conversationTable.guestProfileId, profileId)
					)
				);
			// for each convo
			for(const result of results){
				const conversationId = result?.id ?? null;
				if(conversationId === null){
					reject(new Error(`Conversation id is null`));	
					return;
				}
				// delete messages and conversation
				await trx.delete(messagesTable).where(eq(messagesTable.conversationId, conversationId));
				await trx.delete(conversationTable).where(eq(conversationTable.id, conversationId));
			}
			resolve(true);
			return;
		}catch(err_){
			reject(err_);
			return;
		}
	});
};

export const deleteMessage = async (conversationId:string, msgId:string, senderProfileId:string) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			try{
				return await trx.delete(messagesTable).
					where(
						and(
							and(
								eq(messagesTable.id, msgId), 
								eq(messagesTable.conversationId, conversationId)
							),
							eq(messagesTable.senderProfileId, senderProfileId)
						)
					).returning({id: messagesTable.id});
			}catch(err_){
				throw err_;
			}
		});
	});
};

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

export const addMessageT = async (msg:any, trx:any) => {
	return trx.insert(messagesTable).
		values(msg).
		returning({
			id: messagesTable.id, 
			createdAt: messagesTable.createdAt
		});
};

export const addMessage = async (msg:any) => {
	return (await getDB()).insert(messagesTable).
		values(msg).
		returning({
			id: messagesTable.id, 
			createdAt: messagesTable.createdAt
		});
};

export const upsertConversationT = async (ownerProfileId, guestProfileId, jobId, trx) => {
	return new Promise(async(resolve, reject) => {
		// ensure that there is one conversation for *either* combination of
		// owner and guest profile 
		let results = null;
		if(jobId === null){
			// jobId is null
			// cannot use eq() here
			// must use isNull()
			results = await trx.select({id: conversationTable.id}).
				from(conversationTable).
				where(
					or(
						and(
							and(
								eq(conversationTable.ownerProfileId, ownerProfileId), 
								eq(conversationTable.guestProfileId, guestProfileId)
							),
							isNull(conversationTable.jobId, jobId)
						),
						and(
							and(
								eq(conversationTable.ownerProfileId, guestProfileId), 
								eq(conversationTable.guestProfileId, ownerProfileId)
							),
							isNull(conversationTable.jobId, jobId)
						)
					)
				);
		}else{
			// jobId is not null
			// need to include in where clause
			results = await trx.select({id: conversationTable.id}).
				from(conversationTable).
				where(
					or(
						and(
							and(
								eq(conversationTable.ownerProfileId, ownerProfileId), 
								eq(conversationTable.guestProfileId, guestProfileId)
							),
							eq(conversationTable.jobId, jobId)
						),
						and(
							and(
								eq(conversationTable.ownerProfileId, guestProfileId), 
								eq(conversationTable.guestProfileId, ownerProfileId)
							),
							eq(conversationTable.jobId, jobId)
						)
					)
				);
		}
		let conversationId = results[0]?.id ?? null;
		if(conversationId){
			resolve(conversationId);
			return;
		}
		// conversation doesn't exist?
		// create new one
		results = await trx.insert(conversationTable).
			values({ownerProfileId, guestProfileId, jobId}).
			returning({id: conversationTable.id});
		conversationId = results[0]?.id ?? null;
		if(!conversationId){
			reject(new Error(`Failed to determine conversation id`));
			return;
		}
		resolve(conversationId);
		return;
	});
};

export const upsertConversation = async (ownerProfileId, guestProfileId, jobId) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			try{
				// make sure that we catch any rejected promises
				return await upsertConversationT(ownerProfileId, guestProfileId, jobId, trx);
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const getMessages = async (conversationId:string) => {
	return (await getDB()).select().
		from(messagesTable).
		where(eq(messagesTable.conversationId, conversationId)).
		orderBy(asc(messagesTable.createdAt));
};

export const getConversation = async (conversationId:string) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			let results = null;
			try{
				results = await db.select().
					from(conversationTable).
					where(eq(conversationTable.id, conversationId));
			}catch(err_){
				throw err_;
			}
			// no results
			// let callee decide
			if(results === null || results.length === 0){
				return null;
			}
			// querying by id, shouldn't be more then one result
			if(results.length > 1){
				throw new Error(`Too many results returned, was expecting 1 but was ${results.length}`);
			}
			try{
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
				convo.ownerEmail = ownerProfile[0]?.email;
				convo.guestEmail = guestProfile[0]?.email;
				return convo;
			}catch(err_){
				throw err_;
			}
		});
	});
};

const getUnreadCountT = async (conversationId:string, senderId:string, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		const results = await trx.select({id: messagesTable.id}).
			from(messagesTable).
			where(
				and(
					and(
						eq(messagesTable.conversationId, conversationId), 
						eq(messagesTable.read, false)
					),
					eq(messagesTable.senderProfileId, senderId)
				)
			);
		resolve(results?.length ?? 0);
	});
};

export const getConversations = async (userId:string, owner:boolean) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			let results = null;
			if(owner){
				// join on owner id
				results = await trx.select().from(conversationTable).
					innerJoin(profileTable, eq(profileTable.id, conversationTable.ownerProfileId)).
					innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
					leftJoin(jobsTable, eq(jobsTable.id, conversationTable.jobId)).
					where(eq(usersTable.id, userId)).
					orderBy(asc(conversationTable.createdAt));
			}else{
				// join on guest id
				results = await trx.select().from(conversationTable).
					innerJoin(profileTable, eq(profileTable.id, conversationTable.guestProfileId)).
					innerJoin(usersTable, eq(usersTable.profileId, profileTable.id)).
					leftJoin(jobsTable, eq(jobsTable.id, conversationTable.jobId)).
					where(eq(usersTable.id, userId)).
					orderBy(asc(conversationTable.createdAt));
			}
			const mapped = [];
			for(const c of results){
				const conversation = { ...c.conversations };
				const jobId = c?.jobs?.id ?? null;
				if(jobId){
					// may aswell grab the entire job
					// if this conversation is linked with a job
					conversation.job = { ...c.jobs };
				}
				if(owner){
					conversation.ownerName = c.users.visibleName ?? c.users.name;
					conversation.ownerUserId = c.users.id;
					const guestProfileId = c.conversations.guestProfileId;
					const guestProfile = await getConversationProfileT(guestProfileId, trx);
					const guestName = guestProfile[0]?.visibleName ?? guestProfile[0]?.name;
					const guestUserId = guestProfile[0]?.id ?? null;
					// if I'm the owner of the conversation
					// find unread messages sent from guest
					conversation.unreadCount = await getUnreadCountT(conversation.id, guestProfileId, trx);
					conversation.guestName = guestName;
					conversation.guestUserId = guestUserId;
				}else{
					conversation.guestName = c.users.visibleName ?? c.users.name;
					conversation.guestUserId = c.users.id;
					const ownerProfileId = c.conversations.ownerProfileId;
					const ownerProfile = await getConversationProfileT(ownerProfileId, trx);
					const ownerName = ownerProfile[0]?.visibleName ?? ownerProfile[0]?.name;
					const ownerUserId = ownerProfile[0]?.id;
					// if I'm the guest of the conversation
					// find unread messages sent from owner
					conversation.unreadCount = await getUnreadCountT(conversation.id, ownerProfileId, trx);
					conversation.ownerName = ownerName;
					conversation.ownerUserId = ownerUserId;
				}
				mapped.push(conversation);
			}
			return mapped;
		});
	});
};
