const { sendEmail, renderEmail, renderButton } = require('./email');
const { isConfigured: dbConfigured, getPool, ensureSchema } = require('./db');

// Which page shows the current, correct renewal price for each product --
// deliberately links here rather than a pre-filled checkout amount, so a
// reminder email can never quote a stale or wrong price (e.g. an intro
// rate that shouldn't apply to a renewal).
const RENEWAL_PAGE = {
  hosting: '/hosting',
  database: '/database',
  wordpress: '/wordpress',
  builder: '/builder',
  ssl: '/ssl',
  care: '/care',
  domain: '/domains',
  email: '/hosting#email',
  bundle: '/builder',
};

const SITE_URL = 'https://www.nadinecloud.com';
// Nadine Cloud gets a copy of every welcome email and reminder it sends to a client.
// The address lives in the server's settings (COPY_EMAILS_TO), not in the code. If it is not set,
// copies go to the site's normal notification address (sendEmail with no "to").
const COPY_TO = process.env.COPY_EMAILS_TO || undefined;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const WELCOME_CHECK_MS = 5 * 60 * 1000; // look for clients still waiting for their welcome email
const FIRST_RUN_DELAY_MS = 60 * 1000; // 1 minute after startup, not a full day

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

// A newer paid order for the same customer and product means this one was
// already renewed -- checked fresh every run rather than stored as a flag,
// so there's nothing to get out of sync.
async function alreadyRenewed(order) {
  const result = await getPool().query(
    `SELECT 1 FROM orders
     WHERE email = $1 AND type = $2 AND pkg IS NOT DISTINCT FROM $3
       AND status = 'paid' AND created_at > $4
     LIMIT 1`,
    [order.email, order.type, order.pkg, order.created_at]
  );
  return result.rowCount > 0;
}

function buildReminderEmail(order, daysLeft) {
  const page = RENEWAL_PAGE[order.type] || '/contact';
  // Clients we host by hand pay through a personal link that already knows their plan and amount.
  const renewUrl = order.type === 'managed'
    ? `${SITE_URL}/checkout/?type=managed&client=${encodeURIComponent(order.reference)}&plan=${encodeURIComponent(order.plan)}&amount=${encodeURIComponent(Number(order.amount))}&period=${order.period === 'yr' ? 'yr' : 'mo'}`
    : `${SITE_URL}${page}`;
  const overdue = daysLeft < 0;
  const heading = overdue
    ? `${order.plan} is overdue for renewal`
    : daysLeft === 0
      ? `${order.plan} is due for renewal today`
      : `${order.plan} renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const dueLine = overdue
    ? `Your <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''} was due for renewal ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago. To avoid any interruption, please renew as soon as you can.`
    : daysLeft === 0
      ? `Your <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''} is due for renewal <strong>today</strong>. Please pay today to keep it online &mdash; there is a 2-day grace period, after which the service is paused until it is renewed.`
      : `Your <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''} is coming up for renewal in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;

  const html = renderEmail({
    heading,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${order.name || 'there'},</p><p style="margin:0 0 14px">${dueLine}</p><p style="margin:0">${order.type === 'managed' ? 'Use your personal payment link below to pay by mobile money or card.' : 'Visit the page below to see current pricing and complete your renewal payment by mobile money or card.'}</p>`,
    ctaText: order.type === 'managed' ? 'Make my payment' : 'Renew now',
    ctaUrl: renewUrl,
  });
  const text = `Hi ${order.name || 'there'},\n\n${dueLine.replace(/<[^>]+>/g, '')}\n\nRenew here: ${renewUrl}\n\n— Nadine Cloud`;

  return {
    subject: overdue
      ? `Action needed: ${order.plan} renewal is overdue`
      : `Reminder: ${order.plan} renews ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`,
    html,
    text,
  };
}

// ---- "Welcome on board" email for clients we host by hand ----
// Sent once, automatically, to every hand-added client (reference MAN-...) that has not had it yet.
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// When the domain itself expires (public RDAP record). Best effort: returns null if it cannot be found.
async function lookupDomainExpiry(domain) {
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  try {
    const tld = domain.split('.').pop();
    const RDAP = { com: 'https://rdap.verisign.com/com/v1/domain/', net: 'https://rdap.verisign.com/net/v1/domain/', org: 'https://rdap.publicinterestregistry.org/rdap/domain/' };
    if (!RDAP[tld]) return null; // other endings (e.g. .zm) have no public record we can read
    const res = await fetch(RDAP[tld] + encodeURIComponent(domain), { signal: AbortSignal.timeout(7000), headers: { Accept: 'application/rdap+json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const ev = (data.events || []).find((e) => e.eventAction === 'expiration');
    return ev && ev.eventDate ? ev.eventDate : null;
  } catch {
    return null;
  }
}

// Mail programs (Gmail, Outlook, webmail) hide pictures that live on a website until the reader clicks
// "display images". A picture packed INSIDE the email (referenced as cid:...) shows straight away.
// If the picture cannot be fetched, the email falls back to the normal website link.
let embeddedPictures = null;
async function loadEmbeddedPictures() {
  if (embeddedPictures) return embeddedPictures;
  try {
    const res = await fetch(`${SITE_URL}/assets/email-stay-informed.jpg`, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NadineCloud-Mailer/1.0' } });
    if (!res.ok) throw new Error(`picture ${res.status}`);
    const content = Buffer.from(await res.arrayBuffer()).toString('base64');
    embeddedPictures = [{ filename: 'nadine-cloud-welcome.jpg', content, content_id: 'stay-informed', content_type: 'image/jpeg' }];
    return embeddedPictures;
  } catch (err) {
    console.error('Could not embed the welcome picture (using the website link instead):', err.message);
    return null;
  }
}

async function buildWelcomeEmail(o) {
  const attachments = await loadEmbeddedPictures();
  const per = o.period === 'mo' ? ' per month' : o.period === 'yr' ? ' per year' : '';
  const again = o.period === 'mo' ? ', then the same day every month' : o.period === 'yr' ? ', then the same day every year' : '';
  const payUrl = `${SITE_URL}/checkout/?type=managed&client=${encodeURIComponent(o.reference)}&plan=${encodeURIComponent(o.plan)}&amount=${encodeURIComponent(Number(o.amount))}&period=${o.period === 'yr' ? 'yr' : 'mo'}`;
  const domainExpiry = await lookupDomainExpiry(o.domain);
  const rows = [
    o.domain ? ['Website', o.domain] : null,
    ['Plan', o.plan],
    ['Payment', `ZMW ${Number(o.amount).toLocaleString('en-US')}${per}`],
    ['Next payment due', `${fmtDate(o.expires_at)}${again}`],
    domainExpiry ? ['Domain renews', `${fmtDate(domainExpiry)} &mdash; we will remind you before then`] : null,
  ].filter(Boolean);
  const table = rows.map(([a, b]) => `<tr><td style="padding:9px 0;color:#0B1220;font-weight:bold;width:40%;vertical-align:top">${a}</td><td style="padding:9px 0">${b}</td></tr>`).join('');
  const siteLine = o.domain
    ? `<a href="https://${o.domain}" style="color:#1769FF;font-weight:bold">${o.domain}</a> is now hosted with us, and we look after it for you every day.`
    : 'Your hosting is now looked after by us every day.';
  const html = renderEmail({
    heading: 'Welcome on board to Nadine Cloud',
    imageUrl: attachments ? 'cid:stay-informed' : `${SITE_URL}/assets/email-stay-informed.jpg`,
    imageAlt: 'Nadine Cloud: your hosting reminders will be sent to you',
    imageFirst: true,
    headingSerif: true,
    bodyHtml: `
    <p style="margin:0 0 14px">Hello,</p>
    <p style="margin:0 0 14px">Thank you for choosing Nadine Cloud. ${siteLine}</p>
    ${renderButton('Make my payment', payUrl)}
    <p style="margin:18px 0 6px;color:#0B1220;font-weight:bold">Your plan</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E3E9F1;border-bottom:1px solid #E3E9F1;font-size:15px">${table}</table>
    <p style="margin:18px 0 14px">A week before each due date we'll send you a reminder with your personal payment link. You can pay by <strong>mobile money or card (Visa / Mastercard)</strong>. Card details are entered on the payment provider's secure page &mdash; we never see or keep them.</p>
    <p style="margin:0">Need anything? Just reply to this email or email us at info@nadinecloud.com.</p>
    <p style="margin:18px 0 0">Welcome aboard,<br><strong style="color:#0B1220">The Nadine Cloud team</strong></p>`,
  });
  const text = `Hello,

Thank you for choosing Nadine Cloud. ${o.domain ? o.domain + ' is now hosted with us' : 'Your hosting is now looked after by us'}.

${rows.map(([a, b]) => `${a}: ${b.replace(/&mdash;/g, '-').replace(/<[^>]+>/g, '')}`).join(String.fromCharCode(10))}

Make your payment (mobile money or card): ${payUrl}

A week before each due date we will send you a reminder with your personal payment link. Card details are entered on the payment provider's secure page - we never see or keep them.

Need anything? Reply to this email or email us: mailto:info@nadinecloud.com

Welcome aboard,
The Nadine Cloud team`;
  return { subject: 'Welcome on board to Nadine Cloud', html, text, attachments: attachments || undefined };
}

async function sendPendingWelcomes(summary) {
  summary.welcomes = 0;
  let rows;
  try {
    const r = await getPool().query(
      `SELECT reference, plan, amount, period, domain, email, expires_at FROM orders
       WHERE type = 'managed' AND status = 'paid' AND reference LIKE 'MAN-%'
         AND welcome_sent_at IS NULL AND email IS NOT NULL`
    );
    rows = r.rows;
  } catch (err) {
    console.error('sendPendingWelcomes query failed:', err);
    return;
  }
  for (const o of rows) {
    // Claim first, so two overlapping runs can never both send the same welcome.
    const claim = await getPool().query('UPDATE orders SET welcome_sent_at = now() WHERE reference = $1 AND welcome_sent_at IS NULL RETURNING reference', [o.reference]);
    if (!claim.rowCount) continue;
    try {
      const { subject, html, text, attachments } = await buildWelcomeEmail(o);
      const sent = await sendEmail({ to: o.email, subject, html, text, attachments });
      if (!sent.ok) throw new Error(sent.reason);
      await sendEmail({ to: COPY_TO, subject: `Copy: welcome email sent to ${o.email}`, html, text, attachments }); // a copy for Nadine Cloud
      summary.welcomes += 1;
    } catch (err) {
      await getPool().query('UPDATE orders SET welcome_sent_at = NULL WHERE reference = $1', [o.reference]); // try again next run
      console.error(`Welcome email failed for ${o.reference}:`, err);
    }
  }
}

// Days until the due date, counted in Lusaka calendar days (so "due on the 19th" means the 19th in Zambia).
const lusakaDay = (d) => new Date(new Date(d).getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
const daysUntil = (due) => Math.round((Date.parse(lusakaDay(due)) - Date.parse(lusakaDay(new Date()))) / 864e5);

// Renewal rules (agreed 19 Nov 2026):
//   7 days before  -> one reminder
//   on the due day -> one reminder ("pay today to keep your site online")
//   2 days after   -> (grace period over) the site is paused (pauseSite) and the client is told; paying switches it back on.
//   No other emails. Never pauses anything that is more than 4 days overdue (old records must not
//   all switch off at once when this goes live) -- those are only listed for Nadine Cloud to look at.
const REMIND_ON = new Set([7, 0]);
const GRACE_DAYS = 2; // due on the 18th -> paused on the 20th if still unpaid
const PAUSABLE_TYPES = new Set(['managed', 'hosting', 'wordpress', 'builder', 'bundle', 'database']);

function buildPausedEmail(order) {
  const payUrl = order.type === 'managed'
    ? `${SITE_URL}/checkout/?type=managed&client=${encodeURIComponent(order.reference)}&plan=${encodeURIComponent(order.plan)}&amount=${encodeURIComponent(Number(order.amount))}&period=${order.period === 'yr' ? 'yr' : 'mo'}`
    : `${SITE_URL}${RENEWAL_PAGE[order.type] || '/contact'}`;
  const html = renderEmail({
    heading: `${order.domain || order.plan} has been paused`,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${order.name || 'there'},</p><p style="margin:0 0 14px">We didn't receive the renewal for <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''}, which was due 2 days ago, so the website has been paused. Nothing has been deleted.</p><p style="margin:0">Pay below by mobile money or card and it comes back online automatically within minutes.</p>`,
    ctaText: 'Pay and switch my site back on',
    ctaUrl: payUrl,
  });
  const text = `Hi ${order.name || 'there'},\n\nWe didn't receive the renewal for ${order.plan}${order.domain ? ` (${order.domain})` : ''}, which was due 2 days ago, so the website has been paused. Nothing has been deleted.\n\nPay here and it comes back online automatically: ${payUrl}\n\n— Nadine Cloud`;
  return { subject: `Your website has been paused: ${order.domain || order.plan}`, html, text };
}

async function sendDueReminders() {
  const summary = { due: 0, sent: 0, failed: 0, paused: 0, skippedOld: 0 };
  if (!dbConfigured()) return summary;
  await ensureSchema();
  const { pauseSite } = require('./whm');

  let rows;
  try {
    const result = await getPool().query(
      `SELECT * FROM orders
       WHERE status = 'paid'
         AND expires_at IS NOT NULL
         AND expires_at <= now() + interval '8 days'
         AND suspended_at IS NULL
         AND (reminder_sent_at IS NULL OR reminder_sent_at::date < now()::date)`
    );
    rows = result.rows;
  } catch (err) {
    console.error('sendDueReminders query failed:', err);
    summary.failed += 1;
    return summary;
  }

  for (const order of rows) {
    try {
      if (await alreadyRenewed(order)) continue;
      const daysLeft = daysUntil(order.expires_at);

      // ---- 2-day grace period (policy agreed 19 Nov 2026): days 1-2 after the due date nothing happens;
      //      on day 2 after (or up to day 4, if the daily job missed a day) the site is paused ----
      if (daysLeft < 0) {
        if (daysLeft > -GRACE_DAYS) continue;
        if (daysLeft < -(GRACE_DAYS + 2) || !PAUSABLE_TYPES.has(order.type) || !order.domain) { summary.skippedOld += 1; continue; }
        const payUrl = order.type === 'managed'
          ? `${SITE_URL}/checkout/?type=managed&client=${encodeURIComponent(order.reference)}&plan=${encodeURIComponent(order.plan)}&amount=${encodeURIComponent(Number(order.amount))}&period=${order.period === 'yr' ? 'yr' : 'mo'}`
          : `${SITE_URL}${RENEWAL_PAGE[order.type] || '/contact'}`;
        // the locked screen gets its own "Pay ZMW … now" button
        const r = await pauseSite(order.domain, 'Unpaid renewal', { url: payUrl, label: `Pay ZMW ${Number(order.amount).toLocaleString('en-US')} now` });
        await getPool().query('UPDATE orders SET reminder_sent_at = now() WHERE reference = $1', [order.reference]);
        if (r.ok) {
          await getPool().query('UPDATE orders SET suspended_at = now(), suspended_how = $2 WHERE reference = $1', [order.reference, r.how]);
          summary.paused += 1;
          const mail = buildPausedEmail(order);
          await sendEmail({ to: order.email, ...mail });
          sendEmail({ to: COPY_TO, subject: `Copy: ${order.domain} PAUSED for non-payment (sent to ${order.email})`, html: mail.html, text: mail.text }).catch(() => {});
        } else {
          summary.failed += 1;
          sendEmail({ to: COPY_TO, subject: `ACTION NEEDED: could not pause ${order.domain}`, text: `${order.domain} (${order.plan}) was due ${lusakaDay(order.expires_at)} and is unpaid, but pausing failed: ${r.reason}. Pause it by hand or record the payment.` }).catch(() => {});
        }
        continue;
      }

      // ---- otherwise only remind exactly 7 days before and on the day ----
      if (!REMIND_ON.has(daysLeft)) continue;
      summary.due += 1;
      const { subject, html, text } = buildReminderEmail(order, daysLeft);
      const result = await sendEmail({ to: order.email, subject, html, text });

      if (result.ok) {
        sendEmail({ to: COPY_TO, subject: `Copy: reminder sent to ${order.email} (${subject})`, html, text }).catch(() => {});
        await getPool().query(
          'UPDATE orders SET reminder_sent_at = now(), reminder_count = reminder_count + 1 WHERE reference = $1',
          [order.reference]
        );
        summary.sent += 1;
      } else {
        summary.failed += 1;
        console.error(`Renewal reminder not delivered for ${order.reference}:`, result.reason);
      }
    } catch (err) {
      summary.failed += 1;
      console.error(`Renewal reminder failed for ${order.reference}:`, err);
    }
  }
  await sendPendingWelcomes(summary);
  return summary;
}

// For hosts where the app may sleep between visits (cPanel/Passenger): a
// scheduled job (cron) calls this instead of relying on the in-process timer.
// Same shared-secret header as the promo-code admin route.
function isAdminAuthorized(req) {
  const secret = process.env.ADMIN_SECRET;
  const given = req.headers['x-admin-secret'];
  if (!secret || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && require('crypto').timingSafeEqual(a, b);
}

async function handleSendReminders(req, res) {
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (!isAdminAuthorized(req)) return send(401, { error: 'Unauthorized.' });
  if (!dbConfigured()) return send(503, { error: 'Database not configured.' });
  try {
    const summary = await sendDueReminders();
    send(200, { ok: true, ...summary });
  } catch (err) {
    console.error('send-reminders route failed:', err);
    send(500, { error: 'Could not send reminders.' });
  }
}

// A newly added client should get their welcome email within minutes, not at the next daily run.
async function checkWelcomesOnly() {
  if (!dbConfigured()) return;
  await ensureSchema();
  await sendPendingWelcomes({});
}

function startReminderScheduler() {
  setTimeout(() => {
    sendDueReminders().catch((err) => console.error('sendDueReminders failed:', err));
    setInterval(() => {
      sendDueReminders().catch((err) => console.error('sendDueReminders failed:', err));
    }, CHECK_INTERVAL_MS);
    setInterval(() => {
      checkWelcomesOnly().catch((err) => console.error('checkWelcomesOnly failed:', err));
    }, WELCOME_CHECK_MS);
  }, FIRST_RUN_DELAY_MS);
}

module.exports = { startReminderScheduler, sendDueReminders, handleSendReminders, buildWelcomeEmail };
