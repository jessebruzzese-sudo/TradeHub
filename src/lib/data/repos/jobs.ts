// vim: ts=2
'use server'
import { or, and, eq, ne, sql, isNull, inArray, asc, gte, gt, lt, lte } from "drizzle-orm";
import { getDB, getDataService } from "@/lib/data/service";
import { deleteJobAttachments } from "@/lib/images/service";
import { jobsTable, jobAttachmentsTable } from "@/lib/data/defs/jobs";
import { applicationTable, selectedApplicationTable } from "@/lib/data/defs/applications";
import { usersTable } from "@/lib/data/defs/users";
import { profileTable } from "@/lib/data/defs/profile";
import { businessTable } from "@/lib/data/defs/business";
import { writeFile, mkdir } from "node:fs/promises";
import { ENV } from "@/lib/env";
import { subDays } from "date-fns";

export const cancelJob = async (job:any, payload:any) => {
	const db = await getDB();
	return db.transaction(async(trx)=>{
		// change status
		await updateJobStatusT(trx, job.id, "cancelled");
		// set cancellation fields
		await trx.update(jobsTable).
			set({
				cancellationReason: payload.reason, 
				cancelledBy: payload.cancelledBy, 
				wasConfirmed: payload.wasConfirmed,
				cancelledAt: new Date()
			}).where(eq(jobsTable.id, job.id));
		// TODO
		// send message
		// send email
	});
};

export const getJobStatusBreakdown = async () => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select({status: jobsTable.status, id: jobsTable.id}).from(jobsTable);
		const grouped = results.reduce((a, c)=>{
			const key = c.status;
			if(a[key] === undefined){
				a[key] = [c.id];
				return a;
			}
			a[key].push(c.id);
			return a;
		}, { });
	 	for(const key of Object.keys(grouped)){
			grouped[key] = grouped[key].length;
		}
		resolve(grouped);
	});
};

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
		a[key].attachments[attKey] = { ...c.job_attachments };
	}
	return a;
};

const updateJobStatusT = async (trx:any, jobId:string, status:string) => {
	return trx.update(jobsTable).
		set({status, updatedAt:new Date()}).
		where(eq(jobsTable.id, jobId));
};

export const completeJob = async (job:any, app:any) => {
	const db = await getDB();
	const { applications: appRepo, profile: profileRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await updateJobStatusT(trx, job.id, "completed");
		await appRepo.updateApplicationStatusT(trx, app.id, "completed");
		await profileRepo.incCompletedJobsT(app.profileId, trx);
		return { ok: true };
	});
};

export const confirmJob = async (job:any, app:any) => {
	const db = await getDB();
	const { applications: appRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await updateJobStatusT(trx, job.id, "confirmed");
		await appRepo.updateApplicationStatusT(trx, app.id, "confirmed");
		return { ok: true };
	});
};

export const getAcceptedApplications = async (jobId:string) => {
	return new Promise(async(resolve, reject) => {
		const db = await getDB();	
		const results = await db.select().from(applicationTable).
			innerJoin(selectedApplicationTable, eq(applicationTable.id, selectedApplicationTable.applicationId)).
			where(
				and(
					eq(selectedApplicationTable.jobId, jobId), 
					eq(applicationTable.status, "accepted")
				)
			);
		const apps = results.map((e,i)=>{ return  {...e.applications}});
		resolve(apps);
	});
};

export const getConfirmedApplications = async (jobId:string) => {
	return new Promise(async(resolve, reject) => {
		const db = await getDB();	
		const results = await db.select().from(applicationTable).
			innerJoin(selectedApplicationTable, eq(applicationTable.id, selectedApplicationTable.applicationId)).
			where(
				and(
					eq(selectedApplicationTable.jobId, jobId), 
					eq(applicationTable.status, "confirmed")
				)
			);
		const apps = results.map((e,i)=>{ return  {...e.applications}});
		resolve(apps);
	});
};

export const withdrawApplication = async (job:any, app:any, reason:string) => {
	const db = await getDB();
	const { applications: appRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await appRepo.updateApplicationStatusT(trx, app.id, "declined");
		await appRepo.setWithdrawlReasonT(trx, app.id, reason);
		await appRepo.deleteLinkFromJobT(trx, job.id, app.id);
		// TODO send email
		// confirm withdrawl of application
		return { ok: true };
	});
};

export const declineApplication = async (job:any, app:any) => {
	const db = await getDB();
	const { applications: appRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await appRepo.updateApplicationStatusT(trx, app.id, "declined");
		await appRepo.deleteLinkFromJobT(trx, job.id, app.id);
		// TODO send email
		// confirm withdrawl of application
		return { ok: true };
	});
};

export const acceptApplication = async (job:any, app:any) => {
	const db = await getDB();
	const { applications: appRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await appRepo.updateApplicationStatusT(trx, app.id, "accepted");
		// TODO send email
		// confirm accepted of application
		return { ok: true };
	});
};

export const selectApplication = async (job:any, app:any) => {
	const db = await getDB();
	const { applications: appRepo } = await getDataService();
	return db.transaction(async(trx)=>{
		await appRepo.updateApplicationStatusT(trx, app.id, "selected");
		await appRepo.addLinkToJobT(trx, job.id, app.id, app.profileId);
		// TODO send email
		// alert applicant of selection
		return { ok: true };
	});
};

export const getCompletedJobIds = async (profileId: string) => {
	return (await getDB()).
		select({id:jobsTable.id}).
		from(jobsTable).
		where(
			and(
				eq(jobsTable.profileId, profileId), 
				eq(jobsTable.status, "completed")
			)
		);
};

const jobApplicationReducer = (a, c) => {
	const key = c?.applications?.id ?? null;
	if(a[key] === undefined && key !== null){
		a[key] = {
			...c.applications,
			applicant: { }
		};
	}
	const appId = c?.profile?.id ?? null;
	if(appId !== null && a[key].applicant[appId] === undefined){
		a[key].applicant[appId] = {
			upVotes: c.profile.upVotes,
			downVotes: c.profile.downVotes,
			avatarDataUrl: c.profile.avatarDataUrl,
			completedJobs: 0,
			userId: c.users.id,
			name: c.users.visibleName ?? c.users.name,
			completedJobs: c.profile.completedJobs
		};
	}
	return a;
};

export const getApplications = async (jobId: string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();	
		const results = await db.select().
			from(jobsTable).
			innerJoin(applicationTable, eq(applicationTable.jobId, jobsTable.id)).
			innerJoin(profileTable, eq(applicationTable.profileId, profileTable.id)).
			innerJoin(usersTable, eq(profileTable.id, usersTable.profileId)).
			where(eq(jobsTable.id, jobId));
		const grouped = results.reduce(jobApplicationReducer, {});
		const mapped = Object.keys(grouped).map((e, i)=>{
	 		const application = grouped[e];
			const apps = Object.keys(application.applicant).map((j,k)=>{
				return application.applicant[j];
			});
			if(apps.length > 1){
				throw new Error(`Application ${application.id} is linked to more then one applicant`);
			}
			application.applicant = apps[0];
			return application;
		});
		resolve(mapped);
	});
};

export const updateJob = async (job:any) => {
	return new Promise(async(resolve, reject)=>{
		// make sure that job has id
		// i.e. is an existing job and not a payload
		const jobId = job?.id ?? null;
		if(jobId === null){
			reject(new Error("Job object doesn't have id"));
			return;
		}
		const db = await getDB();
		await db.transaction(async(trx)=>{
			for(const a of job.attachments){
				if(a.delete){
					await trx.delete(jobAttachmentsTable).where(eq(jobAttachmentsTable.id, a.id));
					continue;
				}
				if(a.create){
					const path = `${ENV.store.jobs}/${jobId}`;
					await addJobAttachmentT(trx, {...a, jobId}, path);
				}
			}
			await trx.update(jobsTable).
				set({...job, updatedAt: new Date()}).
				where(eq(jobsTable.id, jobId));
		});
		resolve(true);
	});
};

export const getJobsNear = async (location:any, profileId:string) => {
	const minLat = location.latitude - 1;
	const maxLat = location.latitude + 1;
	const minLng = location.longitude - 1;
	const maxLng = location.longitude + 1;
	const db = await getDB();
	return db.select({
			id: jobsTable.id, 
			latitude: jobsTable.latitude, 
			longitude: jobsTable.longitude
		}).
		from(jobsTable).
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
				ne(jobsTable.profileId, profileId)
			)
		);
};

export const getJobsForIds = async (ids:string[]) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();			
		const results = await db.select().from(jobsTable).
			innerJoin(usersTable, eq(usersTable.profileId, jobsTable.profileId)).
			innerJoin(profileTable, eq(profileTable.id, usersTable.profileId)).
			innerJoin(businessTable, eq(businessTable.id, usersTable.businessId)).
			leftJoin(jobAttachmentsTable, eq(jobAttachmentsTable.jobId, jobsTable.id)).
			where(inArray(jobsTable.id, ids));
		resolve(getJobObjects(results));
	});
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
			await trx.delete(selectedApplicationTable).where(eq(selectedApplicationTable.jobId, job.id));
			await trx.delete(applicationTable).where(eq(applicationTable.jobId, job.id));
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
				await addJobAttachmentT(trx, copy, path);
			}
			return jobId_;
		});
		resolve(jobId);
	});
};

const addJobAttachmentT = async (trx:any, attachment:any, path:string) => {
	const results = await trx.insert(jobAttachmentsTable).
		values(attachment).
		returning({id: jobAttachmentsTable.id});
	const attId  = results[0]?.id ?? null;
	const filePath = `${path}/${attId}`;
	const binary = Buffer.from(attachment.data, "base64");
	return writeFile(filePath, binary);
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
