const crypto = require('crypto');

const LENCO_BASE = 'https://api.lenco.co/access/v2';
const WEB3FORMS_ACCESS_KEY = 'fed74812-296d-4a5e-9f14-c3a5219c5657';
const OPERATORS = new Set(['mtn', 'airtel', 'zamtel']);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
const hits = new Map();

// in-memory only — order context (which plan/domain) is lost on restart,
// but the payment itself still completes on Lenco's side either way.
const pendingOrders = new Map();
const notified = new Set();

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

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function genReference() {
  return 'NC-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

async function lencoRequest(pathname, options = {}) {
  const apiKey = process.env.LENCO_API_KEY;
  if (!apiKey) {
    const err = new Error('LENCO_NOT_CONFIGURED');
    err.code = 'LENCO_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${LENCO_BASE}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { httpStatus: res.status, body };
}

async function notifyOrder(reference, outcome, reason) {
  if (notified.has(reference)) return;
  notified.add(reference);
  const order = pendingOrders.get(reference);
  const reasonLine = reason ? `\nReason: ${reason}` : '';
  const message = order
    ? `Plan: ${order.plan}\nAmount: ZMW ${order.amount}\nCustomer: ${order.name} <${order.email}>\nPhone: ${order.phone}\nDomain requested: ${order.domain || '-'}\nReference: ${reference}\nStatus: ${outcome}${reasonLine}`
    : `Reference: ${reference}\nStatus: ${outcome}${reasonLine}\n(No local order details — server likely restarted since checkout started; check the Lenco dashboard for this reference.)`;

  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Nadine Cloud checkout — payment ${outcome} (${reference})`,
        from_name: 'Nadine Cloud checkout',
        message,
      }),
    });
  } catch (err) {
    console.error('Order notification failed:', err);
  }
  pendingOrders.delete(reference);
}

async function handleCheckoutInitiate(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "You're trying too quickly — please wait a moment and try again." });
    return;
  }

  let raw;
  try {
    raw = await readBody(req, 4000);
  } catch {
    sendJson(res, 413, { error: 'Request too large.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: 'Invalid request.' });
    return;
  }

  const plan = typeof parsed.plan === 'string' ? parsed.plan.trim().slice(0, 120) : '';
  const amount = Number(parsed.amount);
  const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 120) : '';
  const email = typeof parsed.email === 'string' ? parsed.email.trim().slice(0, 200) : '';
  const phoneDigits = typeof parsed.phone === 'string' ? parsed.phone.replace(/[^\d+]/g, '').slice(0, 20) : '';
  const operator = typeof parsed.operator === 'string' ? parsed.operator.toLowerCase().trim() : '';
  const domain = typeof parsed.domain === 'string' ? parsed.domain.trim().slice(0, 255) : '';

  if (!plan) return sendJson(res, 400, { error: 'Missing plan.' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 20000) return sendJson(res, 400, { error: 'Invalid amount.' });
  if (!name) return sendJson(res, 400, { error: 'Name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'A valid email is required.' });
  if (phoneDigits.length < 9) return sendJson(res, 400, { error: 'A valid mobile money phone number is required.' });
  if (!OPERATORS.has(operator)) return sendJson(res, 400, { error: 'Select MTN, Airtel or Zamtel.' });

  const reference = genReference();

  let lenco;
  try {
    lenco = await lencoRequest('/collections/mobile-money', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        reference,
        phone: phoneDigits,
        operator,
        country: 'zm',
        bearer: 'customer',
      }),
    });
  } catch (err) {
    if (err.code === 'LENCO_NOT_CONFIGURED') {
      sendJson(res, 503, { error: 'Online payment isn’t switched on yet — please use WhatsApp or the contact form instead.' });
      return;
    }
    console.error('Lenco initiate error:', err);
    sendJson(res, 502, { error: 'Could not start the payment — please try again or use WhatsApp.' });
    return;
  }

  if (!lenco.body || lenco.body.status !== true || !lenco.body.data) {
    sendJson(res, lenco.httpStatus >= 400 ? lenco.httpStatus : 502, {
      error: (lenco.body && lenco.body.message) || 'Payment could not be started.',
    });
    return;
  }

  pendingOrders.set(reference, { plan, amount, name, email, phone: phoneDigits, domain: domain || null, createdAt: Date.now() });

  sendJson(res, 200, { reference, status: lenco.body.data.status });
}

async function handleCheckoutStatus(req, res, reference) {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(reference || '')) {
    sendJson(res, 400, { error: 'Invalid reference.' });
    return;
  }

  let lenco;
  try {
    lenco = await lencoRequest(`/collections/status/${encodeURIComponent(reference)}`, { method: 'GET' });
  } catch (err) {
    if (err.code === 'LENCO_NOT_CONFIGURED') {
      sendJson(res, 503, { error: 'Online payment isn’t switched on yet.' });
      return;
    }
    console.error('Lenco status error:', err);
    sendJson(res, 502, { error: 'Could not check payment status.' });
    return;
  }

  const status = lenco.body && lenco.body.data && lenco.body.data.status;
  const reasonForFailure = lenco.body && lenco.body.data && lenco.body.data.reasonForFailure;
  sendJson(res, 200, { status: status || 'pending', reason: reasonForFailure || null });

  if (status === 'successful') {
    notifyOrder(reference, 'paid').catch(() => {});
  } else if (status === 'failed') {
    console.error(`Checkout ${reference} failed:`, reasonForFailure || '(no reason given)');
    notifyOrder(reference, 'failed', reasonForFailure).catch(() => {});
  }
}

async function handleLencoWebhook(req, res) {
  let raw;
  try {
    raw = await readBody(req, 20000);
  } catch {
    res.writeHead(413);
    res.end();
    return;
  }

  const apiKey = process.env.LENCO_API_KEY;
  const signature = req.headers['x-lenco-signature'];
  if (!apiKey || !signature) {
    res.writeHead(401);
    res.end();
    return;
  }

  const hashKey = crypto.createHash('sha256').update(apiKey).digest();
  const expected = crypto.createHmac('sha512', hashKey).update(raw).digest('hex');
  const sigBuf = Buffer.from(String(signature), 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    res.writeHead(401);
    res.end();
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  const reference = event && event.data && event.data.reference;
  const status = event && event.data && event.data.status;
  const reasonForFailure = event && event.data && event.data.reasonForFailure;
  if (reference && status === 'successful') {
    await notifyOrder(reference, 'paid');
  } else if (reference && status === 'failed') {
    await notifyOrder(reference, 'failed', reasonForFailure);
  }

  sendJson(res, 200, { received: true });
}

module.exports = { handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook };
