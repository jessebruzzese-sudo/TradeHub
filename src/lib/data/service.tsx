'use server'
// vim: ts=2
import { useMemo } from "react";
import { ENV } from "@/lib/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as usersRepo from "@/lib/data/repos/users";
import * as tradesRepo from "@/lib/data/repos/trades";
import * as businessRepo from "@/lib/data/repos/business";
import * as availabilityRepo from "@/lib/data/repos/availability";
import * as profileRepo from "@/lib/data/repos/profile";
import * as workRepo from "@/lib/data/repos/works";
import * as jobRepo from "@/lib/data/repos/jobs";
import * as applicationRepo from "@/lib/data/repos/applications";
import * as templateRepo from "@/lib/data/repos/templates";
import * as conversationRepo from "@/lib/data/repos/conversations";
import * as fs from "fs";
const MAX_CONNECTIONS = 20;
const IDLE_TIMEOUT = 10;
const pgPool = new Pool({
	ssl: {
    rejectUnauthorized: ENV.database.ssl, // false for dev
		ca: fs.readFileSync(ENV.database.cert).toString() // dont need for dev
  },
  host: ENV.database.host,
  port: ENV.database.port,
  database: ENV.database.database,
  user: ENV.database.username,
  password: ENV.database.password,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: IDLE_TIMEOUT * 1000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 5000, // 5 second query timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
// use a singleton class to control the contruction
// of the database connection pool
// this way there's no risk of duplicates / leaking connections
// assuming that the pool is working properly
class DbWrapper {
	static instance;
	constructor(){
		this.db = drizzle(pgPool);
	}
};
// provide access to the drizzle database
// using the above db wrapper class
export const getDB = async() => {
	return new Promise(async(resolve, reject)=>{
		if(DbWrapper.instance){
			resolve(DbWrapper.instance.db);
			return;
		}
		DbWrapper.instance = new DbWrapper();
		resolve(DbWrapper.instance.db);
	});
}
export const callDb = async (fun:any) => {
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		try{
			const result = await fun(db);	
			resolve(result);
		}catch(err_){
			try{
				// must make sure that aborted transactions are cleaned up 
				// otherwise explosions
				console.error("DB call failed, rolling back");
				await db.execute(sql`ROLLBACK`);
			}catch(err__){
				// ignore
			}
			reject(err_);
		}
	});
};
export const getDataService = async () => {
	return new Promise(async(resolve, reject)=>{
		resolve({
			users: usersRepo,
			trades: tradesRepo,
			business: businessRepo,
			availability: availabilityRepo,
			profile: profileRepo,
			works: workRepo,
			jobs: jobRepo,
			applications: applicationRepo,
			conversations: conversationRepo,
			templates: templateRepo
		});
	});
};
export const testConnection = async () => {
	return new Promise(async(resolve, reject)=>{
		const client = await pgPool.connect();
		try{
			const result = await client.query("SELECT count(*) as count FROM pg_stat_activity WHERE datname = $1", [ENV.database.database]);
			resolve(result.rows[0].count);
		}catch(err_){
			console.error(err_);
			reject(err_);
		}finally{
			client.release();
		}
	});
};
