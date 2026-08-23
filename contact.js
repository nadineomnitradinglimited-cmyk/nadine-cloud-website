const { sendEmail } = require('./email');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
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

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleContact(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "You're sending messages too quickly — please wait a moment." });
    return;
  }

  let raw;
  try {
    raw = await readBody(req, 8000);
  } catch {
    sendJson(res, 413, { error: 'Message too large.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: 'Invalid request.' });
    return;
  }

  if (parsed.botcheck) {
    // honeypot field — a real visitor never fills this in
    sendJson(res, 200, { ok: true });
    return;
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 120) : '';
  const email = typeof parsed.email === 'string' ? parsed.email.trim().slice(0, 200) : '';
  const phone = typeof parsed.phone === 'string' ? parsed.phone.trim().slice(0, 40) : '';
  const interest = typeof parsed.interest === 'string' ? parsed.interest.trim().slice(0, 60) : '';
  const message = typeof parsed.message === 'string' ? parsed.message.trim().slice(0, 4000) : '';

  if (!name) return sendJson(res, 400, { error: 'Name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'A valid email is required.' });
  if (!message) return sendJson(res, 400, { error: 'Message is required.' });

  const text = `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nInterested in: ${interest || '-'}\n\n${message}`;
  const result = await sendEmail({ subject: 'New enquiry from nadinecloud.com', text });

  if (!result.ok) {
    sendJson(res, 502, { error: 'Something went wrong sending that. Please try WhatsApp or email instead.' });
    return;
  }

  sendJson(res, 200, { ok: true });
}

module.exports = { handleContact };
