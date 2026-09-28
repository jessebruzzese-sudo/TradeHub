// vim: ts=2
'use server'
import { or, and, eq, sql, isNull, inArray, asc } from "drizzle-orm";
import { getDB, callDb } from "@/lib/data/service";
import { googleSessionTable } from "@/lib/data/defs/google";
import { ENV } from "@/lib/env";

export const getSession = async () => {
	const accessType = "offline";
	return (await getDB()).insert(googleSessionTable).
		values({accessType}).
		returning({id: googleSessionTable.id});
};
export const findSession = async (state:string) => {
	return (await getDB()).select().
		from(googleSessionTable).
		where(eq(googleSessionTable.id, state));
};
export const updateSession = async (session:any) => {
	return (await getDB()).update(googleSessionTable).
		set({
			refreshToken: session.refreshToken, 
			scope: session.scope, 
			tokenType: session.tokenType, 
			sub: session.sub, 
			expiry: session.expiry, 
			email: session.email
		}).where(eq(googleSessionTable.id, session.id));
};
