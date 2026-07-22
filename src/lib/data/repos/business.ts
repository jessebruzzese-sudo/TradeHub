// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { businessTable, businessTradeTable, googlePlacesTable } from "@/lib/data/defs/business";
import { tradesTable } from "@/lib/data/defs/trades";
import { usersTable } from "@/lib/data/defs/users";
import { getDB, getDataService, callDb } from "@/lib/data/service";

export const getTradesForBusiness = async (businessId:string) => {
	return (await getDB()).select().
		from(businessTradeTable).
		where(eq(businessTradeTable.businessId, businessId));
};

export const setPricingT = async (businessId:string, pricing:any, trx:any) => {
	return trx.update(businessTable).set({...pricing}).where(eq(businessTable.id, businessId));
};

export const updateBusinessT = async (trx:any, delta:any, businessId:string) => {
	return trx.update(businessTable).set(delta).where(eq(businessTable.id, businessId));
};

export const syncTradesT = async (trx:any, trades:array, primaryTrade:string, businessId:string, mapping:any) => {
		return new Promise(async(resolve, reject) => {
			try{
				// remove existing trades
				await trx.delete(businessTradeTable).where(eq(businessTradeTable.businessId, businessId));
			}catch(err_){
				reject(err_);
				return;
			}
			const primaryId = mapping[primaryTrade] ?? null;
			if(primaryId === null){
				reject(new Error(`Primary trade ${primaryTrade} doesn't exist in mapping`));
				return;
			}
			try{
				// create primary trade link
				await trx.insert(businessTradeTable).
					values({businessId, tradeId: primaryId, isPrimary: true});
			}catch(err_){
				reject(err_);
				return;
			}
			// make *sure* that the trades array doesn't contain the primary trade
			// otherwise bad things will happen
			const otherTrades = trades.filter((x)=>x !== primaryTrade);
			// create other trades
			for(const other of otherTrades){
				const otherId = mapping[other] ?? null;
				if(otherId === null){
					reject(new Error(`Other trade ${other} doesn't exist in mapping`));
					return;
				}
				try{
					await trx.insert(businessTradeTable).
						values({businessId, tradeId: otherId, isPrimary:false});
				}catch(err_){
					reject(err_);
					return;
				}
			}
			resolve(true);
		});
};

export const updateBusiness = async (userId:string, delta:any) => {
	const id = await getUserBusinessId(userId);	
	if(id === null){
		throw new Error(`User is not linked with a business`);
	}
	return await callDb(async(db) => {
		return db.transaction(async(trx) => {
			try{
				await updateBusinessT(trx, delta, id);
				return true;
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const getPricing = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{
			results = await db.select().
				from(usersTable).
				leftJoin(businessTable, eq(usersTable.businessId, businessTable.id)).
				where(eq(usersTable.id, userId));
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

export const getUserBusiness = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{
			results = await db.select().
				from(usersTable).
				leftJoin(businessTable, eq(usersTable.businessId, businessTable.id)).
				where(eq(usersTable.id, userId));
		}catch(err_){
			reject(err_);
			return;
		}
		const business = results[0]?.business ?? null;
		resolve(business);
	});
};

export const getUserBusinessId = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const business = await getUserBusiness(userId);
		resolve(business?.id ?? null);
	});
};

export const upsertGooglePlace = async (place:any) => {
	return await callDb(async(db)=>{
		return db.transaction(async(trx)=>{
			try{
				await trx.delete(googlePlacesTable).where(eq(googlePlacesTable.businessId, place.businessId));
				await trx.insert(googlePlacesTable).values(place);
				return true;
			}catch(err_){
				throw err_;
			}
		});
	});
};

export const deleteGooglePlace = async (businessId:string) => {
	const db = await getDB();
	return db.delete(googlePlacesTable).
		where(eq(googlePlacesTable.businessId, businessId));
};

export const getBusinessLocationT = async (trx:any, profileId:string) => {
	return trx.select({latitude: businessTable.latitude, longitude: businessTable.longitude}).
		from(businessTable).
		where(eq(businessTable.profileId, profileId));
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
