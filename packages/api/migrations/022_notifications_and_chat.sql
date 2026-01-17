/* ================================
   NOTIFICATIONS
   ================================ */
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL,        -- 'customer' | 'admin'
  recipient_id TEXT NOT NULL,
  brand_id TEXT,
  type TEXT NOT NULL,                  -- 'delivery_failed', 'billing_alert', etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,                           -- JSON payload
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications (recipient_type, recipient_id, read);

/* ================================
   SUPPORT THREADS
   ================================ */
CREATE TABLE IF NOT EXISTS support_threads (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT DEFAULT 'open',           -- open | closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

/* ================================
   SUPPORT MESSAGES
   ================================ */
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,            -- 'customer' | 'admin'
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_thread
  ON support_messages (thread_id);
