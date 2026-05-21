// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { usersTable, rolesTable } from "@/lib/data/defs/users";
import { businessTable, businessTradeTable } from "@/lib/data/defs/business";
import { getDB, getDataService } from "@/lib/data/service";
import * as bcrypt from "bcrypt";

const CUSTOMER_ROLE_ID = 2;	
const SALT_ROUNDS = 10;

const userReducer = (a, c) => {
	const key = c.id;
	if(a[key] === undefined)
		a[key] = { ...c.users, role: c.roles.name, business: null };
	// business is optional
	const businessId = c?.business?.id ?? null;
	if(businessId !== null){	
		a[key].business = {...c.business, trades: {}};
	}
	// accumulate trades
	const tradeId = c?.business_trade?.tradeId ?? null;
	if(tradeId !== null){
		a[key].business.trades[tradeId] = 1;
	}
	return a;
};

const addUserT = async (payload:any, businessId:string, roleId:integer, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		const hashed = await bcrypt.hash(payload.password, SALT_ROUNDS);
		const values = {
			roleId,
			businessId,
			email: payload.email,
			password: hashed,
			name: payload.name,
			visibleName: payload.visibleName,
			accountStatus: payload?.accountStatus ?? "active",
			public: payload?.public ?? false
		};
		const results = await trx.insert(usersTable).
			values(values). 
			returning({id:usersTable.id});
		const userId = results[0]?.id ?? null;
		if(userId === null){
			reject(new Error("Failed to create new user record"));
			return;
		}
		resolve(userId);
	});
};

export const addBusinessUser = async (payload:any) => {
	return new Promise(async(resolve, reject)=>{
		const { business } = await getDataService();
		const db = await getDB();	
		let userId = null;
		try{
			userId = await db.transaction(async(trx)=>{
				const businessId = await business.addBusinessT(payload.business, trx);
				if(businessId === null)
					throw new Error("Failed to create business record");
				return await addUserT(payload, businessId, CUSTOMER_ROLE_ID, trx);
			});
		}catch(err_){
			reject(err_);
			return;
		}
		resolve(userId);
	});
};

export const getUserByEmail = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		let results = null;
		const DB = await getDB();
		try{
			results = await DB.select()
				.from(usersTable)
				.innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
				.where(eq(usersTable.email, email));
		}catch(err_){
			reject(err_);
			return;
		}
		if(results.length === 0){
			resolve(null);
			return;
		}
		let users = results.reduce(userReducer, {});
		users = Object.keys(users).map((e,i)=>{return users[e]; });
		resolve(users[0]);
	});
};

export const setVisibility = async (email:string, visibility:boolean) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		try{
			await db.update(usersTable).set({"public":visibility}).where(eq(usersTable.email, email));
		}catch(err_){
			reject(err_);
		}
		resolve(true);
	});
};

export const getUserProfile = async (email:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{
			results = await db.select()
				.from(usersTable)
				.innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
				.leftJoin(businessTable, eq(usersTable.businessId, businessTable.id))
				.leftJoin(businessTradeTable, eq(businessTable.id, businessTradeTable.businessId))
				.where(eq(usersTable.email, email));
		}catch(err_){
			reject(err_);
			return;
		}
		if(results.length === 0){
			resolve(null);
			return;
		}
		const { trades } = await getDataService();
		const tradeMapping = await trades.getMapping(false); // ID => NAME
		let users = results.reduce(userReducer, {});
		users = Object.keys(users).map((e,i)=>{ 
			const mapped = users[e]; 
			if(mapped.business !== null){
				const tradeIds = Object.keys(mapped.business.trades);
				const tradeNames = tradeIds.map((j,k)=>{ return tradeMapping[j]; });	
				mapped.business.trades = tradeNames;
			}
			return mapped;
		});
		resolve(users[0]);
	});
};
