ALTER TABLE conversations
  ADD COLUMN api_config_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_conversations_api_config_id
  ON conversations(api_config_id);
