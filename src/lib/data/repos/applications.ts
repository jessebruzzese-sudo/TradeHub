// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB, callDb } from "@/lib/data/service";
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

export const addApplication = async (application:any) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			let values = null;
			try{
				values = await addApplicationT(application, trx);
			}catch(err_){
				throw err_;
			}
			const id = values[0]?.id ?? null;
			if(id === null){
				throw new Error(`Failed to create new application record`);
			}
			return id;
		});
	});
};
