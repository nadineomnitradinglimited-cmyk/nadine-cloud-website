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
    sendJson(res, 502, { error: 'Something went wrong sending that. Please email info@nadinecloud.com instead.' });
    return;
  }

  sendJson(res, 200, { ok: true });
}

// ---------------------------------------------------------------------------------------------
// Client inbox: replies that client staff send from "Nadine Cloud Mail" inside a client's system
// (e.g. the Urbanex admin panel) arrive here and are emailed to the billing team.
// The client app proves who it is with a shared key kept in a private file in the hosting
// account's home folder (~/.nc-client-inbox-key); both apps run under the same account.
// ---------------------------------------------------------------------------------------------
const os = require('os');
const pathMod = require('path');
const fsMod = require('fs');

function clientInboxKey() {
  if (process.env.CLIENT_INBOX_KEY) return process.env.CLIENT_INBOX_KEY.trim();
  try {
    return fsMod.readFileSync(pathMod.join(os.homedir(), '.nc-client-inbox-key'), 'utf8').trim();
  } catch {
    return '';
  }
}

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function handleClientInbox(req, res) {
  const key = clientInboxKey();
  if (!key || !sameSecret(String(req.headers['x-nc-key'] || ''), key)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }
  let p;
  try {
    p = JSON.parse(await readBody(req, 20000));
  } catch {
    sendJson(res, 400, { error: 'Invalid request.' });
    return;
  }
  const client = String(p.client || 'Client').slice(0, 120);
  const subject = String(p.subject || '').slice(0, 300);
  const reply = String(p.reply || '').slice(0, 5000);
  if (!reply.trim()) {
    sendJson(res, 400, { error: 'Empty reply.' });
    return;
  }
  const from = `${String(p.fromName || 'Staff').slice(0, 120)}${p.fromRole ? ` (${String(p.fromRole).slice(0, 40)})` : ''}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2333;max-width:600px">
<p style="margin:0 0 6px;color:#0761EE;font-weight:bold;font-size:12px;letter-spacing:1px">NADINE CLOUD MAIL · REPLY FROM A CLIENT</p>
<h2 style="margin:0 0 4px;font-size:20px">${esc(client)}</h2>
<p style="margin:0 0 14px;color:#55607a">Re: ${esc(subject)}</p>
<div style="background:#F3F7FD;border:1px solid #DCE6F4;border-radius:10px;padding:14px 16px;white-space:pre-wrap">${esc(reply)}</div>
<p style="margin:14px 0 0;font-size:13px;color:#55607a">From: ${esc(from)}${p.fromEmail ? ` · ${esc(p.fromEmail)}` : ''}<br>Site: ${esc(p.site || '')}</p>
<p style="margin:10px 0 0;font-size:12px;color:#7a849b">Sent from the Nadine Cloud Mail inbox in the client's admin panel.</p>
</div>`;
  const text = `Reply from ${client} (Nadine Cloud Mail)\nRe: ${subject}\n\n${reply}\n\nFrom: ${from}${p.fromEmail ? ' · ' + p.fromEmail : ''}\nSite: ${p.site || ''}`;
  const sent = await sendEmail({ to: 'billing@nadinecloud.com', subject: `${client} replied: ${subject}`.slice(0, 250), text, html });
  if (sent && sent.ok === false) {
    sendJson(res, 502, { error: 'Could not deliver the reply.' });
    return;
  }
  sendJson(res, 200, { ok: true });
}

module.exports = { handleContact, handleClientInbox };
