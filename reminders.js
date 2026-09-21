const { sendEmail, renderEmail } = require('./email');
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
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
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
    ? `${SITE_URL}/checkout/?type=managed&client=${encodeURIComponent(order.reference)}&plan=${encodeURIComponent(order.plan)}&amount=${encodeURIComponent(Number(order.amount))}&period=mo`
    : `${SITE_URL}${page}`;
  const overdue = daysLeft < 0;
  const heading = overdue
    ? `${order.plan} is overdue for renewal`
    : daysLeft === 0
      ? `${order.plan} is due for renewal today`
      : `${order.plan} renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const dueLine = overdue
    ? `Your <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''} was due for renewal ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago. To avoid any interruption, please renew as soon as you can.`
    : `Your <strong>${order.plan}</strong>${order.domain ? ` (${order.domain})` : ''} is coming up for renewal ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}.`;

  const html = renderEmail({
    heading,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${order.name || 'there'},</p><p style="margin:0 0 14px">${dueLine}</p><p style="margin:0">Visit the page below to see current pricing and complete your renewal payment by mobile money or card.</p>`,
    ctaText: 'Renew now',
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

async function sendDueReminders() {
  const summary = { due: 0, sent: 0, failed: 0 };
  if (!dbConfigured()) return summary;
  await ensureSchema();

  let rows;
  try {
    const result = await getPool().query(
      `SELECT * FROM orders
       WHERE status = 'paid'
         AND expires_at IS NOT NULL
         AND expires_at <= now() + interval '7 days'
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
      summary.due += 1;

      const daysLeft = daysBetween(new Date(order.expires_at), new Date());
      const { subject, html, text } = buildReminderEmail(order, daysLeft);
      const result = await sendEmail({ to: order.email, subject, html, text });

      if (result.ok) {
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

function startReminderScheduler() {
  setTimeout(() => {
    sendDueReminders().catch((err) => console.error('sendDueReminders failed:', err));
    setInterval(() => {
      sendDueReminders().catch((err) => console.error('sendDueReminders failed:', err));
    }, CHECK_INTERVAL_MS);
  }, FIRST_RUN_DELAY_MS);
}

module.exports = { startReminderScheduler, sendDueReminders, handleSendReminders };
