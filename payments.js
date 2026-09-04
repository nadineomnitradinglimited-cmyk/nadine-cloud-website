const crypto = require('crypto');
const { sendEmail } = require('./email');
const { createAccount, PACKAGES } = require('./whm');
const { generateReceiptPdf } = require('./receipt');
const { isConfigured: dbConfigured, getPool, ensureSchema } = require('./db');

// Best-effort persistence to the database (if configured) so orders survive
// a restart and show up on a customer's account page. Never blocks or
// fails the checkout flow — the in-memory pendingOrders Map above remains
// the source of truth for the live payment/receipt flow either way.
async function persistOrder(reference, order) {
  if (!dbConfigured()) return;
  try {
    await ensureSchema();
    const userResult = await getPool().query('SELECT id FROM users WHERE email = $1', [order.email]);
    const userId = userResult.rows[0] ? userResult.rows[0].id : null;
    await getPool().query(
      `INSERT INTO orders (reference, user_id, plan, amount, type, pkg, domain, domain_option, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       ON CONFLICT (reference) DO NOTHING`,
      [reference, userId, order.plan, order.amount, order.type, order.pkg, order.domain, order.domainOption, order.email]
    );
  } catch (err) {
    console.error('persistOrder failed (non-fatal):', err);
  }
}

async function updateOrderStatus(reference, status, paidAt) {
  if (!dbConfigured()) return;
  try {
    await ensureSchema();
    await getPool().query('UPDATE orders SET status = $1, paid_at = $2 WHERE reference = $3', [status, paidAt || null, reference]);
  } catch (err) {
    console.error('updateOrderStatus failed (non-fatal):', err);
  }
}

const LENCO_BASE = 'https://api.lenco.co/access/v2';
const OPERATORS = new Set(['mtn', 'airtel', 'zamtel']);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
const hits = new Map();

// in-memory only — order context (which plan/domain) is lost on restart,
// but the payment itself still completes on Lenco's side either way.
// Kept (not deleted) after payment so the receipt can still be downloaded;
// pruned after a day instead.
const pendingOrders = new Map();
const notified = new Set();
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

function pruneOldOrders() {
  const now = Date.now();
  for (const [ref, order] of pendingOrders) {
    if (now - order.createdAt > ORDER_TTL_MS) pendingOrders.delete(ref);
  }
}

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
  const domainOptionLine = order && order.type === 'hosting'
    ? `\nDomain option: ${order.domainOption === 'new' ? 'NEW — customer needs this domain registered' : 'Existing — customer already owns this domain'}`
    : '';
  let message = order
    ? `Plan: ${order.plan}\nAmount: ZMW ${order.amount}\nCustomer: ${order.name} <${order.email}>\nPhone: ${order.phone}\nDomain requested: ${order.domain || '-'}${domainOptionLine}\nReference: ${reference}\nStatus: ${outcome}${reasonLine}`
    : `Reference: ${reference}\nStatus: ${outcome}${reasonLine}\n(No local order details — server likely restarted since checkout started; check the Lenco dashboard for this reference.)`;

  // On a successful hosting payment for a domain the customer already owns,
  // provision the real cPanel account automatically. If they need a NEW
  // domain registered, hold off — there's no registrar API here, so the
  // domain has to be registered manually before a hosting account makes sense.
  if (outcome === 'paid' && order && order.type === 'hosting' && order.pkg && order.domain && order.domainOption !== 'new') {
    const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
    if (acct.ok) {
      message += `\n\n--- WHM account created automatically ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nForward these details to the customer (${order.email}) — Resend can't email them directly yet, see the domain-verification note in email.js.`;
    } else {
      message += `\n\n--- WHM account creation FAILED ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nYou'll need to create this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'hosting' && order.pkg && order.domainOption === 'new') {
    message += `\n\n--- ACTION NEEDED: register domain first ---\nCustomer wants a NEW domain (${order.domain || 'name not given'}) registered before hosting is set up. Confirm availability and price with them, register it, then create the WHM account manually on package nadine14_${order.pkg}.`;
  }

  if (order && outcome === 'paid') {
    order.paidAt = Date.now();
  }
  updateOrderStatus(reference, outcome, order && order.paidAt ? new Date(order.paidAt) : null);

  await sendEmail({
    subject: `Nadine Cloud checkout — payment ${outcome} (${reference})`,
    text: message,
  });

  // Also try to email the customer their own receipt. This will fail
  // (silently, logged only) until the nadinecloud.com domain is verified
  // at resend.com/domains — Resend's free tier only delivers to the
  // account's own email until then. The download link on the checkout
  // page works regardless, so this isn't the customer's only way to get it.
  if (order && outcome === 'paid') {
    try {
      const pdf = await generateReceiptPdf({ ...order, currency: 'ZMW' }, { reference, paidAt: new Date(order.paidAt) });
      const result = await sendEmail({
        to: order.email,
        subject: `Your Nadine Cloud receipt — ${reference}`,
        text: `Hi ${order.name},\n\nThanks for your payment. Your receipt is attached.\n\nPlan: ${order.plan}\nAmount: ZMW ${order.amount}\nReference: ${reference}\n\n— Nadine Cloud`,
        attachments: [{ filename: `nadine-cloud-receipt-${reference}.pdf`, content: pdf.toString('base64') }],
      });
      if (!result.ok) {
        console.error(`Customer receipt email not delivered for ${reference} (expected until domain verified):`, result.reason);
      }
    } catch (err) {
      console.error('Receipt generation for customer email failed:', err);
    }
  }
}

async function handleReceiptDownload(req, res, reference) {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(reference || '')) {
    sendJson(res, 400, { error: 'Invalid reference.' });
    return;
  }
  const order = pendingOrders.get(reference);
  if (!order || !order.paidAt) {
    sendJson(res, 404, { error: 'No paid order found for that reference.' });
    return;
  }

  try {
    const pdf = await generateReceiptPdf(
      { ...order, currency: 'ZMW' },
      { reference, paidAt: new Date(order.paidAt) }
    );
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nadine-cloud-receipt-${reference}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  } catch (err) {
    console.error('Receipt generation failed:', err);
    sendJson(res, 500, { error: 'Could not generate the receipt — please try again.' });
  }
}

async function handleCheckoutInitiate(req, res) {
  pruneOldOrders();
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
  const domain = typeof parsed.domain === 'string' ? parsed.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').slice(0, 255) : '';
  const type = typeof parsed.type === 'string' ? parsed.type.trim().slice(0, 30) : '';
  const pkg = typeof parsed.pkg === 'string' ? parsed.pkg.trim().toLowerCase() : '';
  const domainOption = parsed.domainOption === 'new' ? 'new' : 'existing';

  if (!plan) return sendJson(res, 400, { error: 'Missing plan.' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 20000) return sendJson(res, 400, { error: 'Invalid amount.' });
  if (!name) return sendJson(res, 400, { error: 'Name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'A valid email is required.' });
  if (phoneDigits.length < 9) return sendJson(res, 400, { error: 'A valid mobile money phone number is required.' });
  if (!OPERATORS.has(operator)) return sendJson(res, 400, { error: 'Select MTN, Airtel or Zamtel.' });
  if (type === 'hosting') {
    if (!pkg || !PACKAGES[pkg]) return sendJson(res, 400, { error: 'Missing or invalid hosting package.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required to set up hosting.' });
  }

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

  const orderRecord = { plan, amount, name, email, phone: phoneDigits, domain: domain || null, type: type || null, pkg: pkg || null, domainOption: type === 'hosting' ? domainOption : null, createdAt: Date.now() };
  pendingOrders.set(reference, orderRecord);
  persistOrder(reference, orderRecord);

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

module.exports = { handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook, handleReceiptDownload };
