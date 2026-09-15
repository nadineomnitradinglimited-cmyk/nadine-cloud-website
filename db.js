const { Pool } = require('pg');

let pool = null;
let schemaReady = null;

function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!isConfigured()) return;
  if (schemaReady) return schemaReady;
  schemaReady = getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      reference TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      plan TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      type TEXT,
      pkg TEXT,
      domain TEXT,
      domain_option TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at TIMESTAMPTZ,
      period TEXT,
      expires_at TIMESTAMPTZ,
      promo_code TEXT,
      discount_amount NUMERIC NOT NULL DEFAULT 0,
      reminder_sent_at TIMESTAMPTZ,
      reminder_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
      discount_value NUMERIC NOT NULL,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ai_drafts (
      draft_id TEXT PRIMARY KEY,
      business_prompt TEXT NOT NULL,
      conversation JSONB NOT NULL DEFAULT '[]',
      html TEXT NOT NULL,
      generation_count INTEGER NOT NULL DEFAULT 1,
      claimed_email TEXT,
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).then(async () => {
    // orders existed before these columns did -- ALTER for anyone whose table
    // predates this migration (CREATE TABLE IF NOT EXISTS won't add columns
    // to an already-existing table).
    await getPool().query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS period TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS draft_id TEXT;
    `);
    return true;
  });
  return schemaReady;
}

module.exports = { isConfigured, getPool, ensureSchema };
