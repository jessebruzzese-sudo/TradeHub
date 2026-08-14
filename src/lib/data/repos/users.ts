// vim: ts=2
'use server'
import { or, and, eq, ne, sql, isNull, inArray, asc, gte, lte } from "drizzle-orm";
import { usersTable, rolesTable } from "@/lib/data/defs/users";
import { businessTable, businessTradeTable, googlePlacesTable } from "@/lib/data/defs/business";
import { profileTable, profileLikeTable } from "@/lib/data/defs/profile";
import { workTable } from "@/lib/data/defs/works";
import { getDB, getDataService, callDb } from "@/lib/data/service";
import { formatISO } from "date-fns";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";

const CUSTOMER_ROLE_ID = 2;	
const SALT_ROUNDS = 10;

export const validatePassword = async (userId:string, password:string) => {
	const db = await getDB();
	const results = await db.select({password: usersTable.password}).
		from(usersTable).
		where(eq(usersTable.id, userId));
	const hashed = results[0]?.password ?? null;
	return bcrypt.compare(password, hashed); // Promise<boolean>
};

export const getUserRecord = async (userId:string)=> {
	return (await getDB()).select().
		from(usersTable).
		where(eq(usersTable.id, userId));
};

export const deleteUser = async (userId:string) => {
	const { business: businessRepo, profile: profileRepo, users: userRepo, conversations: convoRepo } = await getDataService();
	const matches = await userRepo.getUserRecord(userId);
	const userRecord = matches[0] ?? null;
	if(!userRecord){
		throw new Error(`Failed to find user record for id ${userId}`);
	}
	const profileId = userRecord?.profileId ?? null;
	const businessId = userRecord?.businessId ?? null;
	if(profileId === null || businessId === null){
		throw new Error(`Profile id or business id is null`);
	}
	return callDb(async(db)=>{
		return db.transaction(async(trx)=>{
			try{
				await convoRepo.deleteConversationsT(profileId, trx);
				await profileRepo.deleteProfileT(userId, profileId, trx);
				await businessRepo.deleteBusinessT(businessId, trx);
			}catch(err_){
				console.error(err_);
				throw err_;
			}	
		});
	});
};

export const isUserAdmin = async (userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select({role: rolesTable.name}).
			from(usersTable).
			innerJoin(rolesTable, eq(rolesTable.id, usersTable.roleId)).
			where(eq(usersTable.id, userId));
		const name = results[0]?.role ?? null;
		if(name === null){
			reject(new Error(`Failed to find a user for id ${userId}`));
			return;
		}
		resolve(name.toLowerCase() === "admin");
	});
};

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
		where(sql`lower(${usersTable.email}) = ${email}`).
		returning({id: usersTable.id});
};

export const getUserIdByProfileId = async (profileId:string) => {
	return (await getDB()).
		select({id:usersTable.id}).
		from(usersTable).
		where(eq(usersTable.profileId, profileId));
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

export const updateLastActive = async (userId:string) => {
	return (await getDB()).
		update(usersTable).
		set({lastActiveAt:new Date()}).
		where(eq(usersTable.id, userId));
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
			public: true, // force true by default
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
	return callDb(async(db)=>{
		const { business, profile } = await getDataService();
		return db.transaction(async(trx)=>{
			try{
				const profileId = await profile.addProfileT(trx);
				const businessId = await business.addBusinessT(payload.business, trx);
				if(businessId === null)
					throw new Error("Failed to create business record");
				return await addUserT(payload, businessId, profileId, CUSTOMER_ROLE_ID, trx);
			}catch(err_){
				throw err_;
			}
		});
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

export const setVisibility = async (userId:string, visibility:boolean) => {
	return (await getDB()).
		update(usersTable).
		set({"public":visibility}).
		where(eq(usersTable.id, userId));
};

const nearUserReducer = (a, c) => {
	const key = c?.id ?? null;
	if(key !== null && a[key] === undefined){
		a[key] = {
			userId: key,
			name: c?.name,
			visibleName: c?.visible_name,
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

export const getUserIds = async (tradeId:string, term:string, sortBy:string) => {
	const sortFunctions = {
		"newest": "ORDER BY a.created_at DESC",
		"oldest": "ORDER BY a.created_at ASC",
		"active": "ORDER BY COALESCE(a.last_active_at, NOW() - interval '90 days') DESC",
		"inactive": "ORDER BY COALESCE(a.last_active_at, NOW() - interval '90 days') ASC",
		"never": "ORDER BY NOW() - COALESCE(a.last_active_at, NOW()) ASC"
	};
	const sort_ = sortFunctions[sortBy];
	// check for all trades
	// and no term, if this is the case
	// just return all users
	// include profile join
	if(tradeId === "all" && (term === "" || term === null)){
		return (await getDB()).execute(sql`SELECT a.id FROM users a INNER JOIN profile b ON a.profile_id = b.id ${sql.raw(sort_)}`);
	}
	// filter by trade only
	if(tradeId !== "all" && (term === "" || term === null)){
		return (await getDB()).execute(sql`SELECT a.id FROM users a INNER JOIN business b ON a.business_id = b.id INNER JOIN business_trade c ON c.business_id = b.id WHERE c.is_primary = true AND c.trade_id = ${tradeId} ${sql.raw(sort_)}`);
	}
	// filter by term only
	if(tradeId === "all" && term !== "" && term !== null){
		return (await getDB()).execute(sql`SELECT a.id FROM users a INNER JOIN business b ON a.business_id = b.id INNER JOIN business_trade c ON c.business_id = b.id WHERE position(${term} in lower(a.name)) <> 0 OR position(${term} in lower(a.visible_name)) <> 0 OR position(${term} in lower(a.email)) <> 0 OR position(${term} in lower(b.business_name)) <> 0 OR position(${term} in lower(b.abn_entity_name)) <> 0 ${sql.raw(sort_)}`);
	}
	// filter by trade and term
	return (await getDB()).execute(sql`SELECT a.id FROM users a INNER JOIN business b ON a.business_id = b.id INNER JOIN business_trade c ON c.business_id = b.id WHERE c.is_primary = true AND c.trade_id = ${tradeId} AND ( position(${term} in lower(a.name)) <> 0 OR position(${term} in lower(a.visible_name)) <> 0 OR position(${term} in lower(a.email)) <> 0 OR position(${term} in lower(b.business_name)) <> 0 OR position(${term} in lower(b.abn_entity_name)) <> 0 ) ${sql.raw(sort_)}`);
};

export const getUserProfilesById = async (userIds: array) => {
	return new Promise(async(resolve, reject)=>{
		const results = [];
		for(const userId of userIds){
			try{
				const profile = await getUserProfile(userId);
				const upVotes = profile?.profile?.upVotes ?? 0;
				const downVotes = profile?.profile?.downVotes ?? 0;
				const totalVotes = upVotes + downVotes;
  			const starAverage = totalVotes === 0 ? 0 : Number((1 + (upVotes / totalVotes) * 4).toFixed(1));
  			const avg = Number(starAverage);
				profile.profile.rating = avg;
				delete profile["password"];
				results.push(profile);
			}catch(err_){
				console.error(`Broken user ${userId}`); // probably admin user, fix later
			}
		}
		resolve(results);
	});	
};

export const getUsersNear = async (location:UserLocation, userId:string) => {
	return new Promise(async(resolve, reject)=>{
		const minLat = location.latitude - 2;
		const minLng = location.longitude - 2;
		const maxLat = location.latitude + 2;
		const maxLng = location.longitude + 2;
		const USER_ROLE = "USER";
		const db = await getDB();
		// need a customised query for this one
		// due to some casting shenanigans
		const Q = sql`SELECT * FROM ( SELECT ${usersTable.id}, ${usersTable.visibleName}, ${usersTable.name}, CAST(${businessTable.locationLat} AS DOUBLE PRECISION) as latitude, CAST(${businessTable.locationLng} AS DOUBLE PRECISION) as longitude, ${businessTradeTable.tradeId}, ${businessTradeTable.isPrimary} FROM ${usersTable} INNER JOIN ${rolesTable} ON ${usersTable.roleId} = ${rolesTable.id} LEFT JOIN ${businessTable} ON ${usersTable.businessId} = ${businessTable.id} LEFT JOIN ${businessTradeTable} ON ${businessTradeTable.businessId} = ${businessTable.id} WHERE ${usersTable.id} <> ${userId} AND ${rolesTable.name} = ${USER_ROLE} AND ${usersTable.public} ) a WHERE a.latitude >= ${minLat} AND a.latitude <= ${maxLat} AND a.longitude >= ${minLng} AND a.longitude <= ${maxLng}`;
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
				.where(eq(usersTable.id, userId));
		}catch(err_){
			reject(err_);
			return;
		}
		if(results.length === 0){
			resolve(null);
			return;
		}
		const { trades, business } = await getDataService();
		const tradeMapping = await trades.getMapping(false); // ID => NAME
		let users = results.reduce(userReducer, {});
		users = Object.keys(users).map(async (e,i)=>{ 
			const mapped = users[e]; 
			if(mapped.business !== null){
				const trades = await business.getTradesForBusiness(mapped.business.id);
				const tradeIds = trades.map((e,i)=>{ return e.tradeId });
				const primaryTradeId = trades.find((x)=>x.isPrimary)?.tradeId ?? null;
				const otherTradeIds = tradeIds.filter((x)=>x!==primaryTradeId);
				if(primaryTradeId === null){
					reject(new Error("Failed to find primary trade for business"));
					return;
				}
				const otherTradeNames = otherTradeIds.map((j,k)=>{ return tradeMapping[j]; });	
				mapped.business.trades = otherTradeNames;
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

const updateUserT = async (trx:any, payload:any, userId:string) => {	
	const values = { name: payload.name };
	return trx.update(usersTable).set(values).
		where(eq(usersTable.id, userId)).
		returning({businessId: usersTable.businessId, profileId: usersTable.profileId});
};

export const updateUserProfile = async (payload:any, userId:string) => {
	const { business, profile, trades } = await getDataService();
	return callDb(async(db)=>{
		const mapping = await trades.getMapping(true);
		return db.transaction(async(trx)=>{
			let results = null;
			try{
				results = await updateUserT(trx, payload, userId);
			}catch(err_){
				throw err_;
			}
			if(results === null){
				throw new Error("Null results after profile update");
			}
			const businessId = results[0]?.businessId ?? null;
			const profileId = results[0]?.profileId ?? null;
			if(profileId === null){
				throw new Error("Failed to find profile to update");
			}
			if(businessId === null){
				throw new Error("Failed to find business to update");
			}
			await profile.updateProfileT(trx, payload, profileId);
			const delta = {
				price: payload.price,
				priceType: payload.priceType,
				showPricing: payload.showPricing,
				location: payload.location,
				postcode: payload.postcode,
				locationLat: String(payload.locationLat),
				locationLng: String(payload.locationLng)
			};
			try{
				await business.updateBusinessT(trx, delta, businessId);
				await business.syncTradesT(trx, payload.trades, payload.primaryTrade, businessId, mapping);
			}catch(err_){
				throw err_;
			}
		});	
	});	
};
