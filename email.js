const RESEND_API = 'https://api.resend.com/emails';
// Resend's free tier only allows sending to the account's own verified
// email until a domain is verified at resend.com/domains — see the
// README-style note in the commit that added this for how to switch
// back to info@nadinecloud.com once that's done.
const NOTIFY_TO = 'nadineomnitradinglimited@gmail.com';
const FROM = 'Nadine Cloud <onboarding@resend.dev>';

async function sendEmail({ subject, text, to, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — email not sent:', subject);
    return { ok: false, reason: 'not_configured' };
  }

  const payload = { from: FROM, to: [to || NOTIFY_TO], subject, text };
  if (attachments && attachments.length) payload.attachments = attachments;

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('Resend send failed:', res.status, JSON.stringify(body));
      return { ok: false, reason: 'api_error', body };
    }
    return { ok: true, body };
  } catch (err) {
    console.error('Resend send error:', err);
    return { ok: false, reason: 'network_error' };
  }
}

module.exports = { sendEmail };
