CREATE TABLE "quiz_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"topic_type" varchar(50) NOT NULL,
	"category" varchar(255) NOT NULL,
	"subcategory" varchar(255) NOT NULL,
	"content_what" text NOT NULL,
	"content_why" text NOT NULL,
	"content_pros" jsonb NOT NULL,
	"content_cons" jsonb NOT NULL,
	"content_compare_to_similar" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "topics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"attempted_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'discovered' NOT NULL,
	"discovery_method" varchar(20) NOT NULL,
	"discovered_at" timestamp NOT NULL,
	"learned_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "quiz_topics" ADD CONSTRAINT "quiz_topics_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_topics" ADD CONSTRAINT "quiz_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quizzes" ADD CONSTRAINT "user_quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quizzes" ADD CONSTRAINT "user_quizzes_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quiz_topics_unique" ON "quiz_topics" USING btree ("quiz_id","topic_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_topics_quiz_id" ON "quiz_topics" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_topics_topic_id" ON "quiz_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "idx_topics_name" ON "topics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_topics_category" ON "topics" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_user_quizzes_user_id" ON "user_quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_quizzes_quiz_id" ON "user_quizzes" USING btree ("quiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_topics_unique" ON "user_topics" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE INDEX "idx_user_topics_user_id" ON "user_topics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_topics_topic_id" ON "user_topics" USING btree ("topic_id");