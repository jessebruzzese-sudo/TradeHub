// vim: ts=2
'use server'
import { or, and, eq, ne, sql, isNull, inArray, asc, gte, gt, lt, lte } from "drizzle-orm";
import { getDB } from "@/lib/data/service";
import { deleteJobAttachments } from "@/lib/images/service";
import { jobsTable, jobAttachmentsTable } from "@/lib/data/defs/jobs";
import { usersTable } from "@/lib/data/defs/users";
import { profileTable } from "@/lib/data/defs/profile";
import { businessTable } from "@/lib/data/defs/business";
import { writeFile, mkdir } from "node:fs/promises";
import { ENV } from "@/lib/env";
import { subDays } from "date-fns";

const jobsReducer = (a, c) => {
	const key = c?.jobs?.id ?? null;
	if(key !== null && a[key] === undefined){	
		const profileId = c.users.profileId;
		const ownerId = c.users.id;
		const name = c.users.name;
		const visibleName = c.users.visibleName;
		const upVotes = c?.profile?.upVotes ?? 0;
		const downVotes = c?.profile?.downVotes ?? 0;
		const totalVotes = upVotes + downVotes;
		const rating = ((upVotes/totalVotes)*4)+1;
		const abnVerified = c?.business?.abnVerified ?? false;
		const businessName = c?.business?.businessName ?? null;
		a[key] = {...c.jobs, attachments: {}, owner: {}};
		// populate owner information
		// jobs need this too ...
		a[key].owner["id"] = ownerId;
		a[key].owner["profileId"] = profileId;
		a[key].owner["name"] = visibleName ?? name;
		a[key].owner["abnVerified"] = true;
		a[key].owner["upVotes"] = upVotes;
		a[key].owner["downVotes"] = downVotes;
		a[key].owner["rating"] = rating;
		a[key].owner["businessName"] = businessName;
	}
	const attKey = c?.job_attachments?.id ?? null;	
	if(attKey !== null && a[key].attachments[attKey] === undefined){
		a[key].attachments[attKey] = {...c.job_attachments};
	}
	return a;
};

export const getJobsNear = async (location:any, userId:string) => {
	const minLat = location.latitude - 1;
	const maxLat = location.latitude + 1;
	const minLng = location.longitude - 1;
	const maxLng = location.longitude + 1;
	const db = await getDB();
	return db.select({id: jobsTable.id, latitude: jobsTable.latitude, longitude: jobsTable.longitude}).
		from(jobsTable).
		innerJoin(usersTable, eq(usersTable.profileId, jobsTable.profileId)).
		where(
			and(
				and(
					and(
						and(
							gte(jobsTable.latitude, minLat), 
							lte(jobsTable.latitude, maxLat)
						),
						gte(jobsTable.longitude, minLng)
					),
					lte(jobsTable.longitude, maxLng)
				),
				// only interested in other users jobs
				// jobs for the logged in user are returned by the
				// /api/me/jobs end point
				ne(usersTable.id, userId)
			)
		);
};

export const getUserJobs = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();			
		const results = await db.select().from(jobsTable).
			innerJoin(usersTable, eq(usersTable.profileId, jobsTable.profileId)).
			innerJoin(profileTable, eq(profileTable.id, usersTable.profileId)).
			innerJoin(businessTable, eq(businessTable.id, usersTable.businessId)).
			leftJoin(jobAttachmentsTable, eq(jobAttachmentsTable.jobId, jobsTable.id)).
			where(eq(usersTable.id, userId));
		resolve(getJobObjects(results));
	});
};

const getJobObjects = (rows:array) => {
	const grouped = rows.reduce(jobsReducer, {});
	const mapped = Object.keys(grouped).map((e,i)=>{
		const job = grouped[e];
		job.attachments = Object.keys(job.attachments).map((j,k)=>{
			return job.attachments[j];
		});
		return job;
	});
	return mapped;
};

export const getJob = async (jobId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();			
		const results = await db.select().from(jobsTable).
			innerJoin(usersTable, eq(usersTable.profileId, jobsTable.profileId)).
			innerJoin(profileTable, eq(profileTable.id, usersTable.profileId)).
			innerJoin(businessTable, eq(businessTable.id, usersTable.businessId)).
			leftJoin(jobAttachmentsTable, eq(jobAttachmentsTable.jobId, jobsTable.id)).
			where(eq(jobsTable.id, jobId));
		resolve(getJobObjects(results));
	});
};

export const deleteJob = async (job:any) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		await db.transaction(async(trx)=>{
			if(job.attachments.length > 0){
				await trx.delete(jobAttachmentsTable).where(eq(jobAttachmentsTable.jobId, job.id));
			}
			await trx.delete(jobsTable).where(eq(jobsTable.id, job.id));
			const removed = await deleteJobAttachments(job);
			if(removed !== job.attachments.length){
				throw new Error(`Failed to remove all attachments`);
			}
		});
		resolve(true);
	});
};

export const addJob = async (job:any) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const jobId = await db.transaction(async(trx)=>{
			let results = await trx.insert(jobsTable).
				values(job).
				returning({id:jobsTable.id});
			const jobId_ = results[0]?.id ?? null;
			if(jobId_ === null){
				reject(new Error(`Failed to create new job, null id`));
				return;
			}
			// try to create directory for this job
			const path = `${ENV.store.jobs}/${jobId_}`;
			try{
				await mkdir(path);
			}catch(err__){
				// ignore	
				// already exists
			}
			for(const a of job.attachments){
				const copy = {...a, jobId: jobId_ }; // fileName, jobId
				results = await trx.insert(jobAttachmentsTable).
					values(copy).
					returning({id: jobAttachmentsTable.id});
				const attId  = results[0]?.id ?? null;
				const filePath = `${path}/${attId}`;
				const binary = Buffer.from(a.data, "base64");
				// write data to file store
				await writeFile(filePath, binary);
			}
			return jobId_;
		});
		resolve(jobId);
	});
};

export const getJobCount = async (userId:string, days:integer) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const now = new Date();
		const start = subDays(now, days);
		const results = await db.select({id:jobsTable.id}).
			from(jobsTable).
			innerJoin(usersTable, eq(usersTable.profileId, jobsTable.profileId)).
			where(
				and(
				and(
					gte(jobsTable.createdAt, start), 
					lte(jobsTable.createdAt, now) // include now to avoid users creating many jobs today
				),
					eq(usersTable.id, userId)
				)
			);
		const n = results?.length ?? 0;
		resolve(n);
	});
}
