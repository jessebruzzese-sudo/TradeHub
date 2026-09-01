// vim: ts=2
import { 
	pgTable, boolean, text, 
	uuid, date, timestamp, 
	integer, real, unique 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessTable } from "@/lib/data/defs/business";
import { profileTable } from "@/lib/data/defs/profile";

export const rolesTable = pgTable("roles", {
	id: integer("id").notNull().primaryKey(),
	name: text("name").unique()
});

export const usersTable = pgTable("users", {
	id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
	email: text("email").notNull().unique(),
	name: text("name").notNull(), // full name, profile?
	visibleName: text("visible_name"), // display name, profile?
	password: text("password").notNull(),
	lastActiveAt: timestamp("last_active_at"),
	roleId: integer("role_id").notNull().references(()=>rolesTable.id),
	businessId: uuid("business_id").references(()=>businessTable.id), // business owned by user
	profileId: uuid("profile_id").references(()=>profileTable.id), // users profile
	accountStatus: text("account_status"), // could be in profile? 
	public: boolean("public").default(true), // could be in profile?
	activated: boolean("activated").default(false),
	activatedAt: timestamp("activated_at"),
	createdAt: timestamp("created_at").defaultNow(),
	activationCode: text("activation_code"),
	mobileCode: text("mobile_code").unique(),
	forgotPasswordState: text("forgot_password_state")
});

export type UserType = typeof usersTable.$inferSelect;
