// vim: ts=2
"use server"
import { ENV } from "@/lib/env";
import { readFile, unlink } from "node:fs/promises";
import { getImageExtension } from "@/lib/utils";

export const loadWorkImages = async (work:any) => {
  return new Promise(async(resolve, reject)=>{
    const mapping = {};
    for(const i of work.images){
      const ext = getImageExtension(i.mime);
      const file = `${i.id}.${ext}`;
      const filePath = `${ENV.store.images}/${file}`;
      const buffer = await readFile(filePath);
      const url = `data:${i.mime};base64,${buffer.toString('base64')}`;
      mapping[i.id] = url;
    }
    resolve(mapping);
  });
};

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
