const RESEND_API = 'https://api.resend.com/emails';
const NOTIFY_TO = 'info@nadinecloud.com';
const FROM = 'Nadine Cloud <onboarding@resend.dev>';

async function sendEmail({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — email not sent:', subject);
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [NOTIFY_TO], subject, text }),
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
