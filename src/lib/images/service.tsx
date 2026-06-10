// vim: ts=2
"use server"
import { ENV } from "@/lib/env";
import { readFile, unlink } from "node:fs/promises";

export const deleteJobAttachments = async (job:any) => {
	return new Promise(async(resolve, reject) => {
		let removed = 0;
		for(const a of job.attachments){
			const root = ENV.store.jobs;
			const jobPath = `${root}/${job.id}`;
			const filePath = `${jobPath}/${a.id}`;
			try{
				await unlink(filePath);
			}catch(err_){
				// ignore
			}
			removed += 1;
		}
		resolve(removed);	
	});
};

export const loadJobAttachments = async (job:any) => {
	return new Promise(async(resolve, reject) => {
		const mapping = {};
		const root = ENV.store.jobs;
		const path = `${root}/${job.id}`;
		for(const a of job.attachments){
			const filePath = `${path}/${a.id}`;
			const buffer = await readFile(filePath);
			const data = buffer.toString("base64");
			const url = `data:${a.mime};base64,${data}`;
			const size = buffer.length;
			mapping[a.id] = { size, url };
		}
		resolve(mapping);
	});
};
