const crypto = require('crypto');
const { isConfigured, getPool, ensureSchema } = require('./db');

const SESSION_COOKIE = 'nc_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT_MAX;
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj, extraHeaders) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...(extraHeaders || {}) });
  res.end(JSON.stringify(obj));
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hashHex] = String(stored || '').split(':');
    if (!salt || !hashHex) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const expected = Buffer.from(hashHex, 'hex');
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function sessionCookieHeader(token, maxAgeMs) {
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  if (token === null) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
  }
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getPool().query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expiresAt]);
  return token;
}

async function getSessionUser(req) {
  if (!isConfigured()) return null;
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const result = await getPool().query(
    `SELECT u.id, u.name, u.email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return result.rows[0] || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleSignup(req, res) {
  if (!isConfigured()) return sendJson(res, 503, { error: 'Accounts aren’t set up yet — please check back soon.' });
  const ip = req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return sendJson(res, 429, { error: 'Too many attempts — please wait a moment and try again.' });

  let parsed;
  try {
    parsed = JSON.parse(await readBody(req, 10_000));
  } catch {
    return sendJson(res, 400, { error: 'Invalid request.' });
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 120) : '';
  const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase().slice(0, 200) : '';
  const password = typeof parsed.password === 'string' ? parsed.password : '';

  if (!name) return sendJson(res, 400, { error: 'Name is required.' });
  if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: 'A valid email is required.' });
  if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters.' });

  try {
    await ensureSchema();
    const existing = await getPool().query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return sendJson(res, 409, { error: 'An account with that email already exists — try logging in instead.' });

    const passwordHash = await hashPassword(password);
    const inserted = await getPool().query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    const user = inserted.rows[0];
    const token = await createSession(user.id);
    sendJson(res, 200, { user }, { 'Set-Cookie': sessionCookieHeader(token, SESSION_TTL_MS) });
  } catch (err) {
    console.error('Signup error:', err);
    sendJson(res, 500, { error: 'Could not create your account — please try again.' });
  }
}

async function handleLogin(req, res) {
  if (!isConfigured()) return sendJson(res, 503, { error: 'Accounts aren’t set up yet — please check back soon.' });
  const ip = req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return sendJson(res, 429, { error: 'Too many attempts — please wait a moment and try again.' });

  let parsed;
  try {
    parsed = JSON.parse(await readBody(req, 10_000));
  } catch {
    return sendJson(res, 400, { error: 'Invalid request.' });
  }

  const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase().slice(0, 200) : '';
  const password = typeof parsed.password === 'string' ? parsed.password : '';
  if (!email || !password) return sendJson(res, 400, { error: 'Email and password are required.' });

  try {
    await ensureSchema();
    const result = await getPool().query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
    const row = result.rows[0];
    const valid = row && (await verifyPassword(password, row.password_hash));
    if (!valid) return sendJson(res, 401, { error: 'Incorrect email or password.' });

    const token = await createSession(row.id);
    sendJson(res, 200, { user: { id: row.id, name: row.name, email: row.email } }, { 'Set-Cookie': sessionCookieHeader(token, SESSION_TTL_MS) });
  } catch (err) {
    console.error('Login error:', err);
    sendJson(res, 500, { error: 'Could not log you in — please try again.' });
  }
}

async function handleLogout(req, res) {
  if (!isConfigured()) return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(null) });
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  try {
    if (token) await getPool().query('DELETE FROM sessions WHERE token = $1', [token]);
  } catch (err) {
    console.error('Logout error:', err);
  }
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(null) });
}

async function handleMe(req, res) {
  if (!isConfigured()) return sendJson(res, 200, { user: null, orders: [] });
  try {
    await ensureSchema();
    const user = await getSessionUser(req);
    if (!user) return sendJson(res, 200, { user: null, orders: [] });
    const orders = await getPool().query(
      'SELECT reference, plan, amount, type, pkg, domain, status, created_at, paid_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [user.id]
    );
    sendJson(res, 200, { user, orders: orders.rows });
  } catch (err) {
    console.error('Me lookup error:', err);
    sendJson(res, 500, { error: 'Could not load your account.' });
  }
}

module.exports = { handleSignup, handleLogin, handleLogout, handleMe, getSessionUser };
