CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_active_conversation_id VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_active_conversation_id
  ON sessions(last_active_conversation_id);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'New chat',
  schema TEXT NOT NULL DEFAULT '',
  domain VARCHAR(255) NOT NULL DEFAULT 'General',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_message_time TIMESTAMP,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_session_id
  ON conversations(session_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time
  ON conversations(last_message_time);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  role VARCHAR(24) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sql_query TEXT,
  reasoning TEXT,
  attempts_used INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
  ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at);
