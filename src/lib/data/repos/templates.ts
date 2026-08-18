// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB, callDb } from "@/lib/data/service";
import { ENV } from "@/lib/env";

export const getEmailTemplates = async () => {
	return new Promise(async(resolve, reject)=>{
		resolve(Object.keys(ENV.sendgrid.templates));
	});
};
