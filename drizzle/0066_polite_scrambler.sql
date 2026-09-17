CREATE TABLE "daily_api_rank" (
	"date" text,
	"path" text,
	"visits" integer,
	"rank" integer
);
--> statement-breakpoint
CREATE TABLE "weekly_api_rank" (
	"date" text,
	"path" text,
	"visits" integer,
	"rank" integer
);
--> statement-breakpoint
ALTER TABLE "daily_page_rank" RENAME COLUMN "page" TO "path";--> statement-breakpoint
ALTER TABLE "weekly_page_rank" RENAME COLUMN "page" TO "path";