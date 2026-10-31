CREATE TABLE IF NOT EXISTS leads (
 email TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('sample','waitlist')),
 token_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 confirmed_at TEXT,
 newsletter INTEGER NOT NULL DEFAULT 0,
 utm_source TEXT,
 utm_medium TEXT,
 utm_campaign TEXT,
 utm_content TEXT,
 utm_term TEXT,
 PRIMARY KEY(email,kind)
);
CREATE INDEX IF NOT EXISTS idx_leads_confirmed ON leads(kind,confirmed_at);
