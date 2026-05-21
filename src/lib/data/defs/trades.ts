// vim: ts=2
import { pgTable, boolean, text, uuid, date, timestamp, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const tradesTable = pgTable("trades", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull().unique(),
	slug: text("slug").notNull().unique(),
	isActive: boolean("is_active").notNull(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at").defaultNow()
});
