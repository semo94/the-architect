CREATE TABLE "topic_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_topic_id" uuid NOT NULL,
	"target_topic_id" uuid,
	"target_name" varchar(255) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"relation_kind" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "hyperlinks_status" varchar(16);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "hyperlinks_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "insights_status" varchar(16);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "insights_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "topic_relationships" ADD CONSTRAINT "topic_relationships_source_topic_id_topics_id_fk" FOREIGN KEY ("source_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_relationships" ADD CONSTRAINT "topic_relationships_target_topic_id_topics_id_fk" FOREIGN KEY ("target_topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_topic_relationships_source_kind" ON "topic_relationships" USING btree ("source_topic_id","kind");
--> statement-breakpoint
-- pg_trgm extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- Trigram index on topics.name for fuzzy topic resolution
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm ON topics USING gin (name gin_trgm_ops);
--> statement-breakpoint
-- Deduplication unique indexes on topic_relationships
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_hyperlink ON topic_relationships (source_topic_id, target_name) WHERE kind = 'hyperlink';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_insight ON topic_relationships (source_topic_id, target_name, relation_kind) WHERE kind = 'insight';
--> statement-breakpoint
-- Additional query performance indexes
CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_name_trgm ON topic_relationships USING gin (target_name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_topic_relationships_unresolved ON topic_relationships (target_name) WHERE target_topic_id IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_topic_id ON topic_relationships (target_topic_id) WHERE target_topic_id IS NOT NULL;