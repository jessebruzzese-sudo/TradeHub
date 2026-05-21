// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { tradesTable } from "@/lib/data/defs/trades";
import { getDB } from "@/lib/data/service";

export const getMapping = async (nameKey:boolean) => {
	return new Promise(async(resolve, reject)=>{
		const trades = await getActiveTrades();
		const mapping = trades.reduce((a, c)=>{
			if(nameKey) 
				a[c.name] = c.id;
			else a[c.id] = c.name;
			return a;
		}, {});
		resolve(mapping);
	});
};

export const getActiveTrades = async () => {	
	return new Promise(async(resolve, reject)=>{
		const db = await getDB();
		const results = await db.select().
			from(tradesTable).
			where(eq(tradesTable.isActive, true)).
			orderBy(asc(tradesTable.sortOrder));
		resolve(results);
	});
};
