// vim: ts=2
import { unique, pgTable, boolean, text, uuid, date, timestamp, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "@/lib/data/defs/users";

export const profileTable = pgTable("profile", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	bio: text("bio"),
	miniBio: text("mini_bio"),
	showAbn: boolean("show_abn").default(false),
	showBusinessName: boolean("show_business_name").default(false),
	premium: boolean("premium").default(false),
	trustStatus: text("trust_status"),
	avatarDataUrl: text("avatar_data_url"),
	coverDataUrl: text("cover_data_url"),
	bio: text("bio"),
	rating: real("rating"),
	reliabilityRating: real("reliability_rating"),
	completedJobs: integer("completed_jobs"),
	upVotes: integer("up_votes").default(0),
	downVotes: integer("down_votes").default(0)
});
