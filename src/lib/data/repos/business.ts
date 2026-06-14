// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { businessTable, businessTradeTable, googlePlacesTable } from "@/lib/data/defs/business";
import { tradesTable } from "@/lib/data/defs/trades";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService } from "@/lib/data/service";

export const setPricingT = async (businessId:string, pricing:any, trx:any) => {
	return trx.update(businessTable).set({...pricing}).where(eq(businessTable.id, businessId));
};

export const updateBusinessT = async (trx:any, delta:any, businessId:string) => {
	return trx.update(businessTable).set(delta).where(eq(businessTable.id, businessId));
};

export const updateBusiness = async (email:string, delta:any) => {
	return new Promise(async(resolve, reject)=>{
		const id = await getUserBusinessId(email);	
		if(id === null){
			reject(new Error(`User is not linked with a business`));
			return;
		}
		const db = await getDB();
		await db.transaction(async(trx)=>{
			await updateBusinessT(trx, delta, id);
		});
		resolve(true);
	});
};

export const getPricing = async (email:string) => {
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
		const pricing = {
			price: results[0]?.business?.price ?? null,
			priceType: results[0]?.business?.priceType ?? null,
			showPricing: results[0]?.business?.showPricing ?? false
		};
		resolve(pricing);
	});
};

export const getUserBusiness = async (email:string) => {
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
		const business = results[0]?.business ?? null;
		resolve(business);
	});
};

export const getUserBusinessId = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const business = await getUserBusiness(email);
		resolve(business?.id ?? null);
	});
};

export const addGooglePlace = async (place:any) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		await db.transaction(async(trx)=>{
			const results = await trx.select({placeId:googlePlacesTable.placeId}).
				from(googlePlacesTable).
				where(eq(place.placeId, googlePlacesTable.placeId));
			if(results.length > 0){
				throw new Error(`Google place is already being referenced`);
			}
			await trx.insert(googlePlacesTable).values(place);
		});
		resolve(true);
	});
};

export const deleteGooglePlace = async (businessId:string) => {
	const db = await getDB();
	return db.delete(googlePlacesTable).
		where(eq(googlePlacesTable.businessId, businessId));
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
		let i = 0;
		for(const trade of trades){
			const tradeId = mapping[trade] ?? null; // NAME => ID
			if(tradeId === null){
				reject(new Error(`Trade ${trade} doesn't exist in mapping`));
				return;
			}
			const linkage = {
				tradeId: tradeId,
				businessId: businessId,
				isPrimary: i === 0
			};
			await trx.insert(businessTradeTable).values(linkage);
			i += 1
		}
		resolve(businessId);
	});
};
