CREATE TABLE "daily_page_rank" (
	"date" text,
	"page" text,
	"visits" integer,
	"rank" integer
);
--> statement-breakpoint
CREATE TABLE "daily_unique_users" (
	"date" text,
	"users" integer
);
--> statement-breakpoint
CREATE TABLE "weekly_page_rank" (
	"date" text,
	"page" text,
	"visits" integer,
	"rank" integer
);
--> statement-breakpoint
CREATE TABLE "weekly_unique_users" (
	"date" text,
	"users" integer
);
