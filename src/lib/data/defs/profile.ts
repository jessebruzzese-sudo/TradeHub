// vim: ts=2
import { unique, pgTable, boolean, text, uuid, date, timestamp, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "@/lib/data/defs/users";

export const profileTable = pgTable("profile", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	bio: text("bio"),
	phone: text("phone"),
	miniBio: text("mini_bio"),
	// configuration
	showAbn: boolean("show_abn").default(false),
	showBusinessName: boolean("show_business_name").default(false),
	showEmail: boolean("show_email").default(false),
	showPhone: boolean("show_phone").default(false),
	showListingPrice: boolean("show_listing_price").default(false),
	premium: boolean("premium").default(false),
	// websites
	website: text("website"),
	instagram: text("instagram"),
	facebook: text("facebook"),
	linkedin: text("linkedin"),
	youtube: text("youtube"),
	tiktok: text("tiktok"),
	trustStatus: text("trust_status"),
	avatarDataUrl: text("avatar_data_url"),
	coverDataUrl: text("cover_data_url"),
	bio: text("bio"),
	rating: real("rating"),
	reliabilityRating: real("reliability_rating"),
	upVotes: integer("up_votes").default(0),
	downVotes: integer("down_votes").default(0),
});

export const profileLikeTable = pgTable("profile_like", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	userId: uuid("user_id").notNull().references(()=>usersTable.id),
	profileId: uuid("profile_id").notNull().references(()=>profileTable.id),
}, (table)=>[unique().on(table.userId, table.profileId)]);
