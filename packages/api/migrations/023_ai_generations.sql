CREATE TABLE IF NOT EXISTS ai_generations (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL,          -- social | blog
  platform TEXT,                       -- instagram | linkedin | etc (nullable)
  input_prompt TEXT NOT NULL,
  output TEXT NOT NULL,                -- generated text (JSON or plain)
  model TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_brand
  ON ai_generations (brand_id);
