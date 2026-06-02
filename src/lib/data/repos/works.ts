// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB } from "@/lib/data/service";
import { workTable, workImageTable } from "@/lib/data/defs/works";
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

export const deleteWork = async (workId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		await db.transaction(async(trx)=>{
			await deleteWorkImagesT(workId, trx);
			await deleteWorkT(workId, trx);
		});
		resolve(true);
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
		const mapped = Object.keys(grouped).map((e:any,i:integer)=>{
			const w = grouped[e];
			const imgs = Object.keys(w.images).map((j,k)=>{
				return w.images[j];
			});
			delete w["images"];
			w.images = imgs;
			// TODO sort w.images
			return w;
		});
		resolve(mapped);
	});
};

export const addWork = async (work:any) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const workId = await db.transaction(async(trx)=>{
			let values = await addWorkT(work, trx);
			const workId = values[0]?.id ?? null;
			if(workId === null){
				reject(new Error(`Failed to create new work record`));
				return;
			}
			for(const i of work.images){
				values = await addWorkImageT({...i, workId}, trx);
				const imageId = values[0]?.id ?? null;
				if(imageId === null){
					reject(new Error("Failed to create new work image record"));
					return;
				}
				const ext = getImageExtension(i.mime);
				const file = `${imageId}.${ext}`;
				const filePath = `${ENV.store.images}/${file}`;
				await writeFile(filePath, Buffer.from(i.data, "base64"));
			}
			return workId;
		});
		resolve(workId);
	});
};
