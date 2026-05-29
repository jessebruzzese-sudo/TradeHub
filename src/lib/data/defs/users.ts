// vim: ts=2
import { pgTable, boolean, text, uuid, date, timestamp, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessTable } from "@/lib/data/defs/business";
import { profileTable } from "@/lib/data/defs/profile";
export const rolesTable = pgTable("roles", {
	id: integer("id").notNull().primaryKey(),
	name: text("name").unique()
});
export const usersTable = pgTable("users", {
	id: uuid("id").notNull().default(sql`gen_random_uuid()`),
	email: text("email").notNull().unique(),
	name: text("name").notNull(), // full name, profile?
	visibleName: text("visible_name"), // display name, profile?
	password: text("password").notNull(),
	lastActiveAt: timestamp("last_active_at"),
	roleId: integer("role_id").notNull().references(()=>rolesTable.id),
	businessId: uuid("business_id").references(()=>businessTable.id), // business owned by user
	profileId: uuid("profile_id").references(()=>profileTable.id), // users profile
	accountStatus: text("account_status"), // could be in profile? 
	public: boolean("public").default(false) // could be in profile?
});

export type UserType = typeof usersTable.$inferSelect;
