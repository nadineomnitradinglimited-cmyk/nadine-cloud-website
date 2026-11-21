const crypto = require('crypto');
const { isConfigured, getPool, ensureSchema } = require('./db');
const { sendEmail, renderEmail } = require('./email');

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
    `SELECT u.id, u.name, u.email, u.created_at, to_jsonb(u)->>'email_verified_at' AS email_verified_at FROM sessions s
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
    sendConfirmationCode(user).catch((err) => console.error('Confirmation code not sent:', err.message));
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
    const verified = Boolean(user.email_verified_at);
    // Orders are only shown once the account's email is confirmed: then everything bought or recorded
    // under that email (online orders, hand-recorded payments, managed clients) appears, old or new.
    const orders = verified
      ? await getPool().query(
        `SELECT reference, plan, amount, type, pkg, domain, status, created_at, paid_at, period, expires_at, suspended_at
         FROM orders WHERE user_id = $1 OR lower(email) = lower($2) ORDER BY created_at DESC LIMIT 200`,
        [user.id, user.email]
      )
      : { rows: [] };
    const { email_verified_at, ...pub } = user;
    sendJson(res, 200, { user: { ...pub, emailVerified: verified }, orders: orders.rows });
  } catch (err) {
    console.error('Me lookup error:', err);
    sendJson(res, 500, { error: 'Could not load your account.' });
  }
}

// ---------------------------------------------------------------------------------------------
// Email confirmation: a 6-digit code sent to the account's email. Codes last 15 minutes, allow
// 5 tries, and a new one can be requested once a minute. Only a hash of the code is stored.
// ---------------------------------------------------------------------------------------------
const CODE_TTL_MS = 15 * 60 * 1000;
const codeHash = (userId, code) => crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');

async function sendConfirmationCode(user) {
  const recent = await getPool().query(`SELECT 1 FROM email_codes WHERE user_id = $1 AND sent_at > now() - interval '60 seconds'`, [user.id]);
  if (recent.rowCount) return { ok: false, wait: true };
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await getPool().query(
    `INSERT INTO email_codes (user_id, code_hash, expires_at, attempts, sent_at) VALUES ($1, $2, $3, 0, now())
     ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = now()`,
    [user.id, codeHash(user.id, code), new Date(Date.now() + CODE_TTL_MS)]
  );
  const html = renderEmail({
    heading: 'Confirm your email',
    bodyHtml: `<p style="margin:0 0 14px">Hi ${String(user.name || 'there').replace(/[<>&"]/g, '')},</p>
<p style="margin:0 0 18px">Enter this code on your Nadine Cloud account page to confirm your email address:</p>
<p style="margin:0 0 18px;text-align:center"><span style="display:inline-block;font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#0B1220;background:#EEF4FF;border:1px solid #D6E4FF;border-radius:12px;padding:14px 22px">${code}</span></p>
<p style="margin:0">The code works for 15 minutes. If you didn't create a Nadine Cloud account, you can ignore this email.</p>`,
  });
  const text = `Your Nadine Cloud confirmation code is ${code}. It works for 15 minutes. If you didn't create a Nadine Cloud account, ignore this email.`;
  const r = await sendEmail({ to: user.email, subject: `${code} is your Nadine Cloud confirmation code`, html, text });
  return { ok: r.ok !== false };
}

async function handleSendCode(req, res) {
  if (!isConfigured()) return sendJson(res, 503, { error: 'Accounts aren’t set up yet.' });
  const ip = req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return sendJson(res, 429, { error: 'Too many attempts — please wait a moment.' });
  try {
    await ensureSchema();
    const user = await getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
    if (user.email_verified_at) return sendJson(res, 200, { ok: true, alreadyVerified: true });
    const r = await sendConfirmationCode(user);
    if (r.wait) return sendJson(res, 429, { error: 'A code was just sent — please wait a minute before asking for another.' });
    if (!r.ok) return sendJson(res, 502, { error: 'We could not send the email just now — please try again.' });
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('Send code error:', err);
    sendJson(res, 500, { error: 'Could not send the code — please try again.' });
  }
}

async function handleVerifyCode(req, res) {
  if (!isConfigured()) return sendJson(res, 503, { error: 'Accounts aren’t set up yet.' });
  const ip = req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return sendJson(res, 429, { error: 'Too many attempts — please wait a moment.' });
  let parsed;
  try { parsed = JSON.parse(await readBody(req, 2000)); } catch { return sendJson(res, 400, { error: 'Invalid request.' }); }
  const code = String(parsed.code || '').replace(/\D/g, '');
  if (code.length !== 6) return sendJson(res, 400, { error: 'Please enter the 6-digit code from the email.' });
  try {
    await ensureSchema();
    const user = await getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
    if (user.email_verified_at) return sendJson(res, 200, { ok: true });
    const r = await getPool().query('SELECT code_hash, expires_at, attempts FROM email_codes WHERE user_id = $1', [user.id]);
    const row = r.rows[0];
    if (!row) return sendJson(res, 400, { error: 'Please ask for a new code.' });
    if (new Date(row.expires_at) < new Date()) return sendJson(res, 400, { error: 'That code has expired — please ask for a new one.' });
    if (row.attempts >= 5) return sendJson(res, 400, { error: 'Too many wrong tries — please ask for a new code.' });
    const a = Buffer.from(codeHash(user.id, code), 'hex');
    const b = Buffer.from(row.code_hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await getPool().query('UPDATE email_codes SET attempts = attempts + 1 WHERE user_id = $1', [user.id]);
      return sendJson(res, 400, { error: 'That code isn’t right — please check the email and try again.' });
    }
    await getPool().query('UPDATE users SET email_verified_at = now() WHERE id = $1', [user.id]);
    await getPool().query('DELETE FROM email_codes WHERE user_id = $1', [user.id]);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('Verify code error:', err);
    sendJson(res, 500, { error: 'Could not check the code — please try again.' });
  }
}

module.exports = { handleSignup, handleLogin, handleLogout, handleMe, handleSendCode, handleVerifyCode, sendConfirmationCode, getSessionUser };
