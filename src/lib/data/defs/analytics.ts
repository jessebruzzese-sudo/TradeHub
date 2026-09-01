// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real, bigint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const logsTable = pgTable("logs", {
	userId: uuid("user_id"),	
	method: text("method"),
	path: text("path"),
	authenticated: boolean("authenticated"),
	userAgent: text("user_agent"),
	referer: text("referer"),
	forwardedFor: text("forwarded_for"),
	time: bigint({mode: "bigint"}),
	date: text("date")
});
