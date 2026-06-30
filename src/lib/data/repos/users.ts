// vim: ts=2
'use server'
import { or, and, eq, ne, sql, isNull, inArray, asc, gte, lte } from "drizzle-orm";
import { usersTable, rolesTable } from "@/lib/data/defs/users";
import { businessTable, businessTradeTable, googlePlacesTable } from "@/lib/data/defs/business";
import { profileTable, profileLikeTable } from "@/lib/data/defs/profile";
import { workTable } from "@/lib/data/defs/works";
import { getDB, getDataService } from "@/lib/data/service";
import { formatISO } from "date-fns";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";

const CUSTOMER_ROLE_ID = 2;	
const SALT_ROUNDS = 10;

export const getCustomerCount = async () => {
	return new Promise(async(resolve, reject)=>{
		const results = await (await getDB()).
			select({id: usersTable.id}).
			from(usersTable).
			where(eq(usersTable.roleId, CUSTOMER_ROLE_ID));
		const n = results.length;
		resolve(n);
	});
};

const userReducer = (a, c) => {
	const key = c.id;
	if(a[key] === undefined)
		a[key] = { ...c.users, role: c.roles.name, business: null, profile: null };
	// business is optional
	const businessId = c?.business?.id ?? null;
	if(businessId !== null){	
		a[key].business = {...c.business, trades: {}, googlePlace: null};
	}
	// google place is optional
	const placeId = c?.google_places?.placeId ?? null;
	if(placeId !== null){
		a[key].business.googlePlace = {...c.google_places};
	}
	// profile is optional
	const profileId = c?.profile?.id ?? null;
	if(profileId !== null){
		a[key].profile = { ...c.profile, works: { }, likes: { } };
	}
	// accumulate likes
	const likeId = c?.profile_like?.id ?? null;
	if(likeId !== null){
		a[key].profile.likes[likeId] = { ...c.profile_like };
	}
	// accumulate trades
	const tradeId = c?.business_trade?.tradeId ?? null;
	if(tradeId !== null){
		a[key].business.trades[tradeId] = {...c.business_trade};
	}
	// accumulate works
	const workId = c?.work?.id ?? null;
	if(workId !== null){
		a[key].profile.works[workId] = { ...c.work };
	}
	return a;
};

export const doForgotPassword = async (state:string, email:string) => {
	return (await getDB()).
		update(usersTable).
		set({forgotPasswordState: state}).
		where(eq(usersTable.email, email));
};

export const getUserIdsForEmail = async (email:string) => {
	return (await getDB()).
		select({id:usersTable.id}).
		from(usersTable).
		where(eq(usersTable.email, email));
};

export const getActivationStatus = async (email:string) => {
	return (await getDB()).select({activated: usersTable.activated}).
		from(usersTable).
		where(eq(usersTable.email, email));
};

export const activateUser = async (payload:any) => {
	return (await getDB()).update(usersTable).
		set({activated:true, activatedAt: new Date()}).
		where(
			and(	
				eq(usersTable.id, payload.userId), 
				eq(usersTable.activated, false)
			)
		);
};

export const getUserLocation = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const rows = await db.select({latitide: businessTable.locationLat, longitude: businessTable.locationLng}).
			from(usersTable).
			innerJoin(businessTable, eq(businessTable.id, usersTable.businessId)).
			where(eq(usersTable.id, userId));
		const location = rows[0] ?? null;
		resolve(location);
	});
};

export const updateLastActive = async (email:string) => {
	return (await getDB()).update(usersTable).set({lastActiveAt:new Date()}).where(eq(usersTable.email, email));
};

export const findUserWithPasswordState = async (state:string) => {
	return (await getDB()).select({id:usersTable.id, email:usersTable.email}).
		from(usersTable).	
		where(eq(usersTable.forgotPasswordState, state));
};

export const changePassword = async (password:string, userId:string) => {
	const hashed = await bcrypt.hash(password, SALT_ROUNDS);
	return (await getDB()).update(usersTable).
		set({password:hashed, forgotPasswordState:null}).
		where(eq(usersTable.id, userId));
};

const addUserT = async (payload:any, businessId:string, profileId:string, roleId:integer, trx:any) => {
	return new Promise(async(resolve, reject)=>{
		const hashed = await bcrypt.hash(payload.password, SALT_ROUNDS);
		const activationCode = randomUUID();
		const values = {
			roleId,
			businessId,
			profileId,
			email: payload.email,
			password: hashed,
			name: payload.name,
			visibleName: payload.visibleName,
			accountStatus: payload?.accountStatus ?? "active",
			public: payload?.public ?? false,
			activationCode
		};
		const results = await trx.insert(usersTable).
			values(values). 
			returning({id:usersTable.id});
		const userId = results[0]?.id ?? null;
		if(userId === null){
			reject(new Error("Failed to create new user record"));
			return;
		}
		resolve({userId, activationCode});
	});
};

export const addBusinessUser = async (payload:any) => {
	return new Promise(async(resolve, reject)=>{
		const { business, profile } = await getDataService();
		const db = await getDB();	
		let result = null;
		try{
			result = await db.transaction(async(trx)=>{
				const profileId = await profile.addProfileT(trx);
				const businessId = await business.addBusinessT(payload.business, trx);
				if(businessId === null)
					throw new Error("Failed to create business record");
				return await addUserT(payload, businessId, profileId, CUSTOMER_ROLE_ID, trx);
			});
		}catch(err_){
			reject(err_);
			return;
		}
		resolve(result);
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

const nearUserReducer = (a, c) => {
	const key = c?.id ?? null;
	if(key !== null && a[key] === undefined){
		a[key] = {
			userId: key,
			latitude: c?.latitude,
			longitude: c?.longitude,
			trades: {}
		};
	}
	const tradeId = c?.trade_id ?? null;
	if(tradeId !== null && a[key].trades[tradeId] === undefined){
		a[key].trades[tradeId] = { isPrimary: c?.is_primary ?? false };
	}
	return a;
};

type UserLocation = {
	latitude: number;
	longitude: number;
};

export const getUserProfilesById = async (userIds: array) => {
	return new Promise(async(resolve, reject)=>{
		const results = [];
		for(const userId of userIds){
			const profile = await getUserProfile(userId);
			delete profile["password"];
			results.push(profile);
		}
		resolve(results);
	});	
};

export const getUsersNear = async (location:UserLocation, userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const minLat = location.latitude - 1;
		const minLng = location.longitude - 1;
		const maxLat = location.latitude + 1;
		const maxLng = location.longitude + 1;
		const USER_ROLE = "USER";
		const db = await getDB();
		const Q = sql`SELECT * FROM ( SELECT ${usersTable.id}, CAST(${businessTable.locationLat} AS DOUBLE PRECISION) as latitude, CAST(${businessTable.locationLng} AS DOUBLE PRECISION) as longitude, ${businessTradeTable.tradeId}, ${businessTradeTable.isPrimary} FROM ${usersTable} INNER JOIN ${rolesTable} ON ${usersTable.roleId} = ${rolesTable.id} LEFT JOIN ${businessTable} ON ${usersTable.businessId} = ${businessTable.id} LEFT JOIN ${businessTradeTable} ON ${businessTradeTable.businessId} = ${businessTable.id} WHERE ${usersTable.id} <> ${userId} AND ${rolesTable.name} = ${USER_ROLE} AND ${usersTable.public} ) a WHERE a.latitude >= ${minLat} AND a.latitude <= ${maxLat} AND a.longitude >= ${minLng} AND a.longitude <= ${maxLng}`;
		const results = await db.execute(Q);
		const { trades: tradeRepo } = await getDataService();
		const tradeMapping = await tradeRepo.getMapping(false); // ID => NAME
		// console.log(results.rows);
		// group results
		// remove duplicates
		const grouped = results.rows.reduce(nearUserReducer, {});
		// map results, converting from dictionary to array
		// for each of use
		const mapped = Object.keys(grouped).map((e,i)=>{
			const user_ = grouped[e];
			// handle trades
			// set primary trade
			user_.primaryTrade = null;
			// map trade ids back to names
			const trades = [];
			for(const t of Object.keys(user_.trades)){
				const tradeName = tradeMapping[t]?.toLowerCase() ?? null;
				if(tradeName === null){
					throw new Error(`Failed to find trade mapping for id ${t}`);
				}
				if(user_.trades[t].isPrimary){
					user_.primaryTrade = tradeName;
				}
				trades.push(tradeName);
			}
			user_.trades = trades;
			return user_;
		});
		resolve(mapped);
	});	
};

export const getUserProfile = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		let results = null;
		try{
			results = await db.select()
				.from(usersTable)
				.innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
				.leftJoin(profileTable, eq(usersTable.profileId, profileTable.id))
				.leftJoin(profileLikeTable, eq(profileTable.id, profileLikeTable.profileId))
				.leftJoin(workTable, eq(workTable.profileId, profileTable.id))
				.leftJoin(businessTable, eq(usersTable.businessId, businessTable.id))
				.leftJoin(googlePlacesTable, eq(businessTable.id, googlePlacesTable.businessId))
				.leftJoin(businessTradeTable, eq(businessTable.id, businessTradeTable.businessId))
				.where(eq(usersTable.id, userId));
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
				let primaryTradeId = tradeIds.find((x)=>mapped.business.trades[x].isPrimary) ?? null;
				if(primaryTradeId === null){
					console.error("Failed to find primary trade for business");
					primaryTradeId = tradeIds[0];
				}
				const tradeNames = tradeIds.map((j,k)=>{ return tradeMapping[j]; });	
				mapped.business.trades = tradeNames;
				mapped.business.primaryTrade = tradeMapping[primaryTradeId];
			}
			if(mapped.profile !== null){
				let works = mapped.profile.works;
				let likes = mapped.profile.likes;
				works = Object.keys(works).map((j,k)=>{ return works[j] });
				likes = Object.keys(likes).map((j,k)=>{ return likes[j] });
				mapped.profile.works = works;
				mapped.profile.likes = likes;
			}
			return mapped;
		});
		resolve(users[0]);
	});
};

const updateUserT = async (trx:any, payload:any, email:string) => {	
	const values = { name: payload.name };
	return trx.update(usersTable).set(values).
		where(eq(usersTable.email, email)).
		returning({businessId: usersTable.businessId, profileId: usersTable.profileId});
};

export const updateUserProfile = async (payload:any, email:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();		
		const { business, profile } = await getDataService();
		await db.transaction(async(trx)=>{
			const results = await updateUserT(trx, payload, email);
			console.log(JSON.stringify(results));
			const businessId = results[0]?.businessId ?? null;
			const profileId = results[0]?.profileId ?? null;
			if(profileId === null){
				reject(new Error("Failed to find profile to update"));
				return;
			}
			if(businessId === null){
				reject(new Error("Failed to find business to update"));
				return;
			}
			await profile.updateProfileT(trx, payload, profileId);
			const delta = {
				price: payload.price,
				priceType: payload.priceType,
				showPricing: payload.showPricing
			};
			await business.updateBusinessT(trx, delta, businessId);
		});	
		resolve(true);
	});
};
