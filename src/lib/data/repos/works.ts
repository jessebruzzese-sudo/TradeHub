// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB, callDb } from "@/lib/data/service";
import { workTable, workImageTable } from "@/lib/data/defs/works";
import { usersTable } from "@/lib/data/defs/users";
import { getImageExtension } from "@/lib/utils";
import { ENV } from "@/lib/env";
import { writeFile } from "node:fs/promises";

const worksReducer = (a, c) => {
	const key = c.work.id;
	if(a[key] === undefined){
		a[key] = {
			...c.work,
			images: { }
		};
	}
	// map images to the work
	// if not already mapped
	const imageId = c?.work_image?.id ?? null;
	if(imageId && a[key].images[imageId] === undefined){
		a[key].images[imageId] = {...c.work_image};
	}
	return a;
};

export const addWorkT = async (work:any, trx:any) => {
	return trx.insert(workTable).values(work).returning({id:workTable.id});
};

export const addWorkImageT = async (image:any, trx:any) => {
	return trx.insert(workImageTable).values(image).returning({id:workImageTable.id});
};

export const deleteWorkT = async (workId:string, trx:any) => {
	return trx.delete(workTable).where(eq(workTable.id, workId));
};

export const deleteWorkImagesT = async (workId:string, trx:any) => {
	return trx.delete(workImageTable).where(eq(workImageTable.workId, workId));
};

export const deleteWorksT = async (profileId:string, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		try{
			// grab work ids
			const results = await trx.select({id: workTable.id}).
				from(workTable).
				where(eq(workTable.profileId, profileId));
			// for each one
			for(const result of results){
				const workId = result?.id ?? null;
				if(workId === null){
					reject(new Error("Error, work id is null"));
					return;
				}
				// delete work images and record
				await deleteWorkImagesT(workId, trx);
				await deleteWorkT(workId, trx);
			}
		}catch(err_){
			reject(err_);
			return;
		}
		resolve(true);
	});
};

export const deleteWork = async (workId:string) => {
	return await callDb(async(db)=>{
		return db.transaction(async(trx)=>{
			try{
				await deleteWorkImagesT(workId, trx);
				await deleteWorkT(workId, trx);
			}catch(err_){
				throw err_;
			}
		});
	})
};

export const getWorkById = async (workId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select().
			from(workTable).
			innerJoin(workImageTable, eq(workTable.id, workImageTable.workId)).
			innerJoin(usersTable, eq(workTable.profileId, usersTable.profileId)).
			where(eq(workTable.id, workId));
		// let client decide what to do with no results
		if(results.length === 0){
			resolve(null);
			return;
		}
		const item = results[0];	
		const userId = item?.users?.id ?? null;
		if(userId === null){
			resolve(null);
			return;
		}
		const grouped = results.reduce(worksReducer, {});
		const mapped = Object.keys(grouped).map((e:any,i:integer)=>{
			const w = grouped[e];
			const imgs = Object.keys(w.images).map((j,k)=>{
				return w.images[j];
			});
			delete w["images"];
			w.images = imgs;
			return w;
		});
		if(mapped.length > 1){
			reject(new Error("There should only be one work item"));
			return;
		}
		// inject id of owning user
		const workItem = {...mapped[0], userId };
		resolve(workItem);
	});
};

export const getWork = async (profileId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select().
			from(workTable).
			innerJoin(workImageTable, eq(workTable.id, workImageTable.workId)).
			where(eq(workTable.profileId, profileId));
		if(results.length === 0){
			resolve([]);
			return;
		}
		const grouped = results.reduce(worksReducer, {});
		// TODO put this into function
		const mapped = Object.keys(grouped).map((e:any,i:integer)=>{
			const w = grouped[e];
			const imgs = Object.keys(w.images).map((j,k)=>{
				return w.images[j];
			});
			delete w["images"];
			w.images = imgs;
			return w;
		});
		resolve(mapped);
	});
};

export const addWork = async (work:any) => {
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			try{
				let values = await addWorkT(work, trx);
				const workId = values[0]?.id ?? null;
				if(workId === null){
					throw new Error(`Failed to create new work record`);
				}
				for(const i of work.images){
					values = await addWorkImageT({...i, workId}, trx);
					const imageId = values[0]?.id ?? null;
					if(imageId === null){
						throw new Error("Failed to create new work image record");
					}
					const ext = getImageExtension(i.mime);
					const file = `${imageId}.${ext}`;
					const filePath = `${ENV.store.images}/${file}`;
					await writeFile(filePath, Buffer.from(i.data, "base64"));
				}
				return workId;
			}catch(err_){
				throw err_;
			}
		});
	});
};
