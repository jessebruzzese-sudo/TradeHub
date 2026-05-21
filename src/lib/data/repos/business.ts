// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { tradesTable } from "@/lib/data/defs/trades";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService } from "@/lib/data/service";

export const getUserBusinessId = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{
			results = await db.select().
				from(usersTable).
				leftJoin(businessTable, eq(usersTable.businessId, businessTable.id)).
				where(eq(usersTable.email, email));
		}catch(err_){
			reject(err_);
			return;
		}
		const businessId = results[0]?.business?.id ?? null;
		resolve(businessId);
	});
};

export const addBusinessT = async (business:any, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		const values = {
			businessName: business.businessName,
			abn: business.abn,
			abnEntityName: business.abnEntityName,
			abnEntityType: business.abnEntityType,
			abnVerified: business.abnVerified,
			location: business.location,
			postcode: business.postcode,
			locationLat: business.locationLat,
			locationLng: business.locationLng
		};
		// create business record first
		const results = await trx.insert(businessTable).values(values).returning({id:businessTable.id});
		const businessId = results[0]?.id ?? null;
		if(businessId === null){
			reject(new Error(`Failed to create new business record`))
			return;
		}
		// create trade links
		const trades = business.trades;
		const mapping = await (await getDataService()).trades.getMapping(true);
		for(const trade of trades){
			const tradeId = mapping[trade] ?? null; // NAME => ID
			if(tradeId === null){
				reject(new Error(`Trade ${trade} doesn't exist in mapping`));
				return;
			}
			const linkage = {
				tradeId: tradeId,
				businessId: businessId
			};
			await trx.insert(businessTradeTable).values(linkage);
		}
		resolve(businessId);
	});
};
