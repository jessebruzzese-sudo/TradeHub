// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB, callDb, getDataService } from "@/lib/data/service";
import { applicationTable, selectedApplicationTable } from "@/lib/data/defs/applications";
import { ENV } from "@/lib/env";

export const setWithdrawlReasonT = async (trx:any, applicationId:string, reason:string) => {
	return trx.update(applicationTable).
		set({withdrawlReason:reason, withdrawnAt: new Date()}).
		where(eq(applicationTable.id, applicationId));
};

export const addLinkToJobT = async (trx:any, jobId:string, applicationId:string, profileId:string) => {	
	return trx.insert(selectedApplicationTable).	
		values({jobId, applicationId, applicantProfileId: profileId});
};

export const deleteLinkFromJobT = async (trx:any, jobId:string, applicationId:string) => {	
	return trx.delete(selectedApplicationTable).	
		where(
			and(
				eq(selectedApplicationTable.jobId, jobId),
				eq(selectedApplicationTable.applicationId, applicationId)
			)
		);
};

export const updateApplicationStatusT = async (trx:any, applicationId:string, status:string) => {
	return trx.update(applicationTable).
		set({status, updatedAt: new Date()}).
		where(eq(applicationTable.id, applicationId));
};

const addApplicationT = async (application:any, trx:any) => {
	return trx.insert(applicationTable).values(application).returning();
};

export const getApplication = async (applicationId:string) => {
	return (await getDB()).select().
		from(applicationTable).
		where(eq(applicationTable.id, applicationId));
};

export const addApplication = async (application:any, sender:any, job:any) => {
	const { conversations: convRepo } = await getDataService();
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			// within transaction create application
			// create conversation
			// create system message
			// send application received, message received
			// return conversation id
			try{
				const profileId = application.profileId;
				const jobProfileId = job.owner.profileId;
				await addApplicationT(application, trx);
				const conversationId = await convRepo.upsertConversationT(profileId, jobProfileId, job.id, trx);
				const senderName = sender.visibleName ?? sender.name;
				const intro = {
					message: `Hi ${job.owner.name}, ${senderName} has applied for the job - ${job.title}`,	
					isSystem: true,
					senderProfileId: profileId,
					conversationId
				};
				// add introduction first
				// system generated message
				await convRepo.addMessageT(intro, trx);
				const applicationMsg = {
					message: application.message,	
					senderProfileId: profileId,
					conversationId
				};
				// then applicant message
				await convRepo.addMessageT(applicationMsg, trx);
				return conversationId;
			}catch(err_){
				throw err_;
			}
		});
	});
};
