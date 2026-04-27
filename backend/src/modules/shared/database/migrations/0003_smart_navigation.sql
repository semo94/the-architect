-- pg_trgm extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on topics.name for fuzzy resolution
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm
  ON topics USING gin (name gin_trgm_ops);

-- Relationship edge table
CREATE TABLE IF NOT EXISTS topic_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_topic_id   UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  target_topic_id   UUID REFERENCES topics(id) ON DELETE SET NULL,
  target_name       VARCHAR(255) NOT NULL,
  kind              VARCHAR(16) NOT NULL,
  relation_kind     VARCHAR(32),
  created_at        TIMESTAMP DEFAULT now(),
  resolved_at       TIMESTAMP
);

-- Deduplication indexes (two partial indexes — NULL != NULL in Postgres unique-index evaluation)
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_hyperlink
  ON topic_relationships (source_topic_id, target_name)
  WHERE kind = 'hyperlink';

CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_insight
  ON topic_relationships (source_topic_id, target_name, relation_kind)
  WHERE kind = 'insight';

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_topic_relationships_source_kind
  ON topic_relationships (source_topic_id, kind);

CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_name_trgm
  ON topic_relationships USING gin (target_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_topic_relationships_unresolved
  ON topic_relationships (target_name)
  WHERE target_topic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_topic_id
  ON topic_relationships (target_topic_id)
  WHERE target_topic_id IS NOT NULL;

-- Processing status columns on the topics table
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS hyperlinks_status     VARCHAR(16),
  ADD COLUMN IF NOT EXISTS hyperlinks_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS insights_status       VARCHAR(16),
  ADD COLUMN IF NOT EXISTS insights_started_at   TIMESTAMP;
