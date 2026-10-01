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

async function sendEmail({ subject, text, html, to, attachments, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — email not sent:', subject);
    return { ok: false, reason: 'not_configured' };
  }

  const payload = { from: FROM, to: [to || NOTIFY_TO], subject, text };
  if (html) payload.html = html;
  if (attachments && attachments.length) payload.attachments = attachments;
  if (replyTo) payload.reply_to = [replyTo];

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

// The blue button on its own, for emails that want it higher up than the bottom
// (put it inside bodyHtml and leave ctaText/ctaUrl empty).
function renderButton(text, url) {
  return `<div style="text-align:center;margin:26px 0 22px">
        <a href="${url}" style="display:inline-block;background:#1769FF;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px">${text}</a>
      </div>`;
}

// Shared branded template for customer-facing emails. Email clients strip
// most modern CSS, so this deliberately uses old-school inline styles and
// table-free but simple block markup that Gmail/Outlook/Apple Mail all
// render consistently, rather than the site's real stylesheet.
// imageUrl adds a picture; imageFirst puts it at the very top instead of under the message
// (the picture then replaces the small logo, so the logo is not shown twice).
// headingSerif uses an elegant serif for the heading (Georgia is installed on every phone/computer;
// web fonts are stripped by Gmail/Outlook, so an email-safe font is the reliable choice).
function renderEmail({ heading, bodyHtml, ctaText, ctaUrl, imageUrl, imageAlt, imageFirst, headingSerif }) {
  const image = imageUrl
    ? `<div style="text-align:center;margin:${imageFirst ? '0 0 22px' : '24px 0 0'}">
        <img src="${imageUrl}" width="456" alt="${imageAlt || ''}" style="width:100%;max-width:456px;height:auto;border:0;border-radius:12px;display:block;margin:0 auto">
      </div>`
    : '';
  const cta = ctaText && ctaUrl ? renderButton(ctaText, ctaUrl) : '';
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 2px rgba(11,18,32,.05);">
      ${imageUrl && imageFirst ? image : `<div style="text-align:center;margin:0 0 20px;">
        <img src="https://www.nadinecloud.com/assets/email-logo.png" width="200" alt="Nadine Cloud" style="width:200px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:20px;color:#0B1220;">
      </div>`}
      <h1 style="${headingSerif ? "font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:bold;line-height:1.25;letter-spacing:-0.2px;text-align:center;" : "font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;"}color:#0B1220;margin:0 0 16px;">${heading}</h1>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#45566B;">${bodyHtml}</div>
      ${imageFirst ? '' : image}
      ${cta}
    </div>
    <p style="text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#78899C;margin-top:24px;">
      Nadine Cloud<br>
      Questions? <a href="https://wa.me/260964068483" style="color:#1769FF;">Message us on WhatsApp</a>
    </p>
  </div>
</body>
</html>`;
}

module.exports = { sendEmail, renderEmail, renderButton };
