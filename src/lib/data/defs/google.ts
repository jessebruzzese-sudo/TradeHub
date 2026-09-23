// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real, bigint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const googleSessionTable = pgTable("google_sessions", {
	id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	accessType: text("access_type"),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token")
});
