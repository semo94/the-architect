CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "topic_relationships" ADD COLUMN "target_name_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "name_embedding" vector(1536);
--> statement-breakpoint
CREATE INDEX ON topics USING hnsw (name_embedding vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX ON topic_relationships USING hnsw (target_name_embedding vector_cosine_ops) WHERE target_topic_id IS NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_topics_name_trgm;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_topic_relationships_target_name_trgm;
--> statement-breakpoint
DROP EXTENSION IF EXISTS pg_trgm;