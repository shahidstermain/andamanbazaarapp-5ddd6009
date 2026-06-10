-- RAG knowledge base for database support assistant
-- Enables pgvector, creates support_knowledge + support_query_logs tables,
-- and adds the match_support_knowledge RPC for vector similarity search.

-- pgvector extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── support_knowledge ──────────────────────────────────────────────────────
-- Stores chunked documents (runbooks, Jira resolutions, DB docs, etc.)
-- Each row is one retrievable chunk with its embedding vector.
CREATE TABLE IF NOT EXISTS public.support_knowledge (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  content    text        NOT NULL,
  embedding  vector(768),                         -- text-embedding-004 dimensions
  source     text        NOT NULL DEFAULT 'manual', -- 'jira','confluence','slack','docs','manual'
  metadata   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ANN index (cosine distance). Effective once table has >100 rows.
CREATE INDEX IF NOT EXISTS support_knowledge_embedding_idx
  ON public.support_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text index for fallback when no embedding is present
CREATE INDEX IF NOT EXISTS support_knowledge_fts_idx
  ON public.support_knowledge
  USING gin(to_tsvector('english', content));

ALTER TABLE public.support_knowledge ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write; no public access
CREATE POLICY "support_knowledge_service_only"
  ON public.support_knowledge
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS support_knowledge_updated_at ON public.support_knowledge;
CREATE TRIGGER support_knowledge_updated_at
  BEFORE UPDATE ON public.support_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── support_query_logs ─────────────────────────────────────────────────────
-- Records every query + answer for the feedback loop / future fine-tuning.
CREATE TABLE IF NOT EXISTS public.support_query_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  question    text        NOT NULL,
  answer      text,
  sources     jsonb       NOT NULL DEFAULT '[]',
  doc_count   int         NOT NULL DEFAULT 0,
  feedback    smallint,   -- NULL=no feedback, 1=thumbs up, -1=thumbs down
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_query_logs_user_idx
  ON public.support_query_logs (user_id);

ALTER TABLE public.support_query_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own logs; service role has full access
CREATE POLICY "support_query_logs_own_read"
  ON public.support_query_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "support_query_logs_service_full"
  ON public.support_query_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── match_support_knowledge RPC ────────────────────────────────────────────
-- Vector similarity search. Returns top-K chunks above the given threshold.
CREATE OR REPLACE FUNCTION public.match_support_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.70,
  match_count     int   DEFAULT 5
)
RETURNS TABLE (
  id         uuid,
  title      text,
  content    text,
  source     text,
  metadata   jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    sk.id,
    sk.title,
    sk.content,
    sk.source,
    sk.metadata,
    1 - (sk.embedding <=> query_embedding) AS similarity
  FROM public.support_knowledge sk
  WHERE sk.embedding IS NOT NULL
    AND 1 - (sk.embedding <=> query_embedding) > match_threshold
  ORDER BY sk.embedding <=> query_embedding
  LIMIT match_count;
$$;
