const RESEND_API = 'https://api.resend.com/emails';
// nadinecloud.com is now verified at resend.com/domains (DKIM, DMARC and
// the send/rsend CNAMEs all confirmed resolving) — sending from the real
// domain instead of Resend's shared onboarding@resend.dev address, which
// lifts the "can only send to your own account email" restriction that
// was blocking every receipt/notification email to actual customers.
// NOTIFY_TO is the fallback address for admin alerts (new orders, contact
// form submissions) when no `to` is given. info@nadinecloud.com is now a
// real, checked mailbox (created in the nadine14 cPanel account), so all
// admin notifications land there instead of the owner's Gmail.
const NOTIFY_TO = 'info@nadinecloud.com';
const FROM = 'Nadine Cloud <info@nadinecloud.com>';

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
