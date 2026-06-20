// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB } from "@/lib/data/service";
import { applicationTable, selectedApplicationTable } from "@/lib/data/defs/applications";
import { ENV } from "@/lib/env";

export const addLinkToJobT = async (trx:any, jobId:string, applicationId:string, profileId:string) => {	
	return trx.insert(selectedApplicationTable).	
		values({jobId, applicationId, applicantProfileId: profileId});
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
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const appId = await db.transaction(async(trx)=>{
			let values = await addApplicationT(application, trx);
			const id = values[0]?.id ?? null;
			if(id === null){
				reject(new Error(`Failed to create new application record`));
				return;
			}
			return id;
		});
		resolve(appId);
	});
};
