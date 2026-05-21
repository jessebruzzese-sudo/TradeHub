// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { usersTable, rolesTable } from "@/lib/data/defs/users";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { availabilityTable } from "@/lib/data/defs/availability";
import { getDB, getDataService } from "@/lib/data/service";

export const getAvailability = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{	
			results = await db.select().
				from(usersTable).
				leftJoin(businessTable, eq(usersTable.businessId, businessTable.id)).
				leftJoin(availabilityTable, eq(businessTable.id, availabilityTable.businessId)).
				where(eq(usersTable.email, email));
		}catch(err_){
			reject(err_);
			return;
		}
		console.log(results);
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
		const description: string = result?.availability.description ?? null;
		const businessId = result?.business?.id ?? null;
		resolve({
			dates: dates, 
			description: description, 
			businessId: businessId
		});
	});	
}

export const addAvailability = async (payload:any, email:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const businessId = await (await getDataService()).business.getUserBusinessId(email);
		if(businessId === null){
			reject(new Error("User is not mapped to a business"));
			return;
		}
		await db.insert(availabilityTable).values({...payload, businessId: businessId});
		resolve(true);
	});	
}
