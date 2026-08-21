// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { usersTable, rolesTable } from "@/lib/data/defs/users";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { availabilityTable } from "@/lib/data/defs/availability";
import { callDb, getDB, getDataService } from "@/lib/data/service";
import { parseISO } from "date-fns";

export const getAvailabilityForBusinessIds = async (ids:array) => {
	return new Promise(async(resolve, reject)=>{	
		const db = await getDB();
		let results = null;
		try{	
			results = await db.select().
				from(availabilityTable).
				where(inArray(availabilityTable.businessId, ids));
		}catch(err_){
			reject(err_);
			return;
		}
		// map dates to business id
		const grouped = results.reduce((a, c)=>{	
			const dates = c.dates.map((e,i)=>{ return parseISO(e); });
			const id = c.businessId;
			a[id] = dates;
			return a;
		}, {});
		resolve(grouped);
	});
};

export const getAvailability = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{	
			results = await db.select().
				from(usersTable).
				leftJoin(businessTable, eq(usersTable.businessId, businessTable.id)).
				leftJoin(availabilityTable, eq(businessTable.id, availabilityTable.businessId)).
				where(eq(usersTable.id, userId));
		}catch(err_){
			reject(err_);
			return;
		}
		// availability isn't set on account creation
		// need to after, therefore could be null
		if(results.length === 0){
			resolve(null);
			return;
		}
		// too many rows
		// users can only have one business
		// and one *current* availabilty
		if(results.length > 1){
			reject(new Error("User has more the one availabilty configured"));
		}
		const result = results[0];
		const dates: string[] = result?.availability?.dates ?? [];
		const description: string = result?.availability?.description ?? null;
		const businessId = result?.business?.id ?? null;
		resolve({
			dates: dates, 
			description: description, 
			businessId: businessId
		});
	});	
}

export const addAvailability = async (payload:any, userId:string, businessId:string) => {
	const { business } = await getDataService();
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			try{
				await trx.delete(availabilityTable).where(eq(availabilityTable.businessId, businessId));
				await trx.insert(availabilityTable).values({...payload, businessId: businessId});
				await business.setPricingT(businessId, payload.pricing, trx);
			}catch(err_){
				console.error(err_);
				throw err_;
			}
		});
	});
}
