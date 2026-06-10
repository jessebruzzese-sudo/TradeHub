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
const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT = 10;
const pgPool = new Pool({
	ssl: {
    rejectUnauthorized: false,
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
const DB = drizzle(pgPool);
export const getDB = async() => {
	return new Promise(async(resolve, reject)=>{
		resolve(DB);
	});
}
export const getDataService = async () => {
	return new Promise(async(resolve, reject)=>{
		resolve({
			users: usersRepo,
			trades: tradesRepo,
			business: businessRepo,
			availability: availabilityRepo,
			profile: profileRepo,
			works: workRepo,
			jobs: jobRepo
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
