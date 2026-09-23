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
