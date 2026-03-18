ALTER TABLE "topics" ADD COLUMN "learning_resources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "learning_resources_last_refreshed_at" timestamp;