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

export const dailyUniqueUsersTable = pgTable("daily_unique_users", {
	date: text("date"),
	users: integer("users")
});
export const weeklyUniqueUsersTable = pgTable("weekly_unique_users", {
	date: text("date"),
	users: integer("users")
});
export const dailyPageRankTable = pgTable("daily_page_rank", {
	date: text("date"),
	path: text("path"),
	visits: integer("visits"),
	rank: integer("rank")
});
export const weeklyPageRankTable = pgTable("weekly_page_rank", {
	date: text("date"),
	path: text("path"),
	visits: integer("visits"),
	rank: integer("rank")
});
export const dailyApiRankTable = pgTable("daily_api_rank", {
	date: text("date"),
	path: text("path"),
	visits: integer("visits"),
	rank: integer("rank")
});
export const weeklyApiRankTable = pgTable("weekly_api_rank", {
	date: text("date"),
	path: text("path"),
	visits: integer("visits"),
	rank: integer("rank")
});
export const dailyRefererClicksTable = pgTable("daily_referer_clicks", {
	date: text("date"),
	referer: text("referer"),
	path: text("path"),
	visits: integer("visits"),
	rank: integer("rank")
});
export const dailySessionStatisticsTable = pgTable("daily_session_statistics", {
	date: text("date"),
	sessions: integer("sessions"),
	avgDurationSeconds: real("avg_duration_seconds"),
	avgVisits: integer("avg_visits")
});
export const dailyConversionsTable = pgTable("daily_conversions", {
	date: text("date"),
	source: text("source"),
	total: integer("total")
});
