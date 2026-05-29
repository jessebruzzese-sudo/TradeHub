ALTER TABLE "profile" RENAME COLUMN "avatar" TO "avatar_file_path";--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "cover_file_path" text;