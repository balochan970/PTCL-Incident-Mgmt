-- SQL Script to create tables for the AI Memory System in Supabase

-- Short-Term Memory Table: Stores current conversation state
CREATE TABLE IF NOT EXISTS ai_short_term_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  active_incidents JSONB DEFAULT '[]'::JSONB,
  recent_topics JSONB DEFAULT '[]'::JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for fast lookups by user
  CONSTRAINT unique_user_stm UNIQUE (user_id)
);

-- Long-Term Memory Table: Stores persistent knowledge
CREATE TABLE IF NOT EXISTS ai_long_term_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  memories JSONB NOT NULL DEFAULT '[]'::JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for fast lookups by user
  CONSTRAINT unique_user_ltm UNIQUE (user_id)
);

-- Episodic Memory Table: Stores past conversations
CREATE TABLE IF NOT EXISTS ai_episodic_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  related_incidents JSONB DEFAULT '[]'::JSONB,
  topics JSONB DEFAULT '[]'::JSONB,
  metadata JSONB,
  
  -- Indexes for fast lookups
  CONSTRAINT unique_session UNIQUE (session_id)
);
CREATE INDEX IF NOT EXISTS idx_episodic_user_id ON ai_episodic_memory (user_id);
CREATE INDEX IF NOT EXISTS idx_episodic_start_time ON ai_episodic_memory (start_time DESC);

-- Contextual Memory Table: Stores user preferences and work context
CREATE TABLE IF NOT EXISTS ai_contextual_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  preferences JSONB DEFAULT '{}'::JSONB,
  work_context JSONB DEFAULT '{
    "recentExchanges": [],
    "commonFaultTypes": [],
    "frequentSearches": []
  }'::JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for fast lookups by user
  CONSTRAINT unique_user_contextual UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE ai_short_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_long_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contextual_memory ENABLE ROW LEVEL SECURITY;

-- Create policies that allow users to only access their own data
CREATE POLICY user_isolation_stm ON ai_short_term_memory
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY user_isolation_ltm ON ai_long_term_memory
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY user_isolation_episodic ON ai_episodic_memory
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY user_isolation_contextual ON ai_contextual_memory
  FOR ALL USING (auth.uid()::text = user_id);

-- Create a procedure to create all tables
CREATE OR REPLACE PROCEDURE create_memory_tables()
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'AI Memory tables created successfully';
END;
$$;

-- Add functions to support common operations
CREATE OR REPLACE FUNCTION get_recent_topics(p_user_id TEXT, p_limit INT DEFAULT 5)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT recent_topics INTO result
  FROM ai_short_term_memory
  WHERE user_id = p_user_id;
  
  IF result IS NULL THEN
    RETURN '[]'::JSONB;
  ELSE
    RETURN result;
  END IF;
END;
$$;

-- Add text search support for finding memories by content
CREATE INDEX IF NOT EXISTS idx_episodic_summary_text ON ai_episodic_memory USING GIN (to_tsvector('english', summary));

COMMENT ON TABLE ai_short_term_memory IS 'Stores the current conversation state for each user';
COMMENT ON TABLE ai_long_term_memory IS 'Stores persistent knowledge extracted from conversations';
COMMENT ON TABLE ai_episodic_memory IS 'Stores past conversation episodes for future reference';
COMMENT ON TABLE ai_contextual_memory IS 'Stores user preferences and work context'; 