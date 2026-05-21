// vim: ts=2
import { pgTable, boolean, text, uuid, date, timestamp, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessTable } from "@/lib/data/defs/business";
export const rolesTable = pgTable("roles", {
	id: integer("id").notNull().primaryKey(),
	name: text("name").unique()
});
export const usersTable = pgTable("users", {
	id: uuid("id").notNull().default(sql`gen_random_uuid()`),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	visibleName: text("visible_name"), // optional
	password: text("password").notNull(),
	trustStatus: text("trust_status"),
	avatar: text("avatar"),
	bio: text("bio"),
	rating: real("rating"),
	reliabilityRating: real("reliability_rating"),
	completedJobs: integer("completed_jobs"),
	memberSince: timestamp("member_since").defaultNow(),
	lastLogin: timestamp("last_login"),
	roleId: integer("role_id").notNull().references(()=>rolesTable.id),
	businessId: uuid("business_id").references(()=>businessTable.id), // business owned by user
	accountStatus: text("account_status"),
	public: boolean("public").default(false)
});
export type UserType = typeof usersTable.$inferSelect;
