CREATE TABLE "topic_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"alias_text" varchar(255) NOT NULL,
	"alias_text_lower" varchar(255) NOT NULL,
	"alias_embedding" vector(1536),
	"source" varchar(24) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "topic_aliases" ADD CONSTRAINT "topic_aliases_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_topic_aliases_topic_lower_unique" ON "topic_aliases" USING btree ("topic_id","alias_text_lower");--> statement-breakpoint
CREATE INDEX "idx_topic_aliases_lower" ON "topic_aliases" USING btree ("alias_text_lower");--> statement-breakpoint
CREATE INDEX "idx_topic_aliases_topic" ON "topic_aliases" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX ON topic_aliases USING hnsw (alias_embedding vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "name_embedding";