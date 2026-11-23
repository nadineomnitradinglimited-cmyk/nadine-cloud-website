const crypto = require('crypto');
const { sendEmail } = require('./email');
const { createAccount, HOSTING_PACKAGES, DATABASE_PACKAGES, WORDPRESS_PACKAGES, BUILDER_PACKAGES } = require('./whm');

// SSL and Care Plans are fully manual products — no WHM package, no
// automatic provisioning. Just used to validate the `pkg` sent at checkout.
const SSL_PRODUCTS = new Set(['ssl-standard', 'ssl-wildcard', 'ssl-ev']);
const CARE_PRODUCTS = new Set(['care-essential', 'care-growth', 'care-premium']);
const { generateReceiptPdf } = require('./receipt');
const { resumePausedSite } = require('./whm');
const { isConfigured: dbConfigured, getPool, ensureSchema } = require('./db');
const { checkAvailability, registerDomain, registrarName } = require('./registrar');
const { checkPrice } = require('./pricing');
const lipila = require('./lipila');
const { loadDraft } = require('./ai-builder');
const { deployDraftHtml } = require('./ftp-deploy');

// Best-effort persistence to the database (if configured) so orders survive
// a restart and show up on a customer's account page. Never blocks or
// fails the checkout flow — the in-memory pendingOrders Map above remains
// the source of truth for the live payment/receipt flow either way.
async function persistOrder(reference, order) {
  if (!dbConfigured()) return;
  try {
    await ensureSchema();
    const ownerEmail = order.recordEmail || order.email; // managed clients: the email their record is kept under
    const userResult = await getPool().query('SELECT id FROM users WHERE email = $1', [ownerEmail]);
    const userId = userResult.rows[0] ? userResult.rows[0].id : null;
    await getPool().query(
      `INSERT INTO orders (reference, user_id, plan, amount, type, pkg, domain, domain_option, email, status, period, expires_at, promo_code, discount_amount, draft_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, $14)
       ON CONFLICT (reference) DO NOTHING`,
      [reference, userId, order.plan, order.amount, order.type, order.pkg, order.domain, order.domainOption, ownerEmail,
       order.period || null, order.expiresAt || null, order.promoCode || null, order.discountAmount || 0, order.draftId || null]
    );
  } catch (err) {
    console.error('persistOrder failed (non-fatal):', err);
  }
}

// Recurring products are billed for a fixed term at checkout (no
// auto-charge — the customer approves every payment). This just works out
// when that term ends, so a reminder can be sent a week beforehand.
const PERIOD_MONTHS = { mo: 1, '6mo': 6, yr: 12, '2yr': 24, '3yr': 36 };
// Domains, SSL certs and business email are always annual regardless of
// what (if anything) was passed as the period.
const ANNUAL_TYPES = new Set(['domain', 'ssl', 'email']);

function computeExpiryDate(type, period) {
  const months = PERIOD_MONTHS[period] || (ANNUAL_TYPES.has(type) ? 12 : null);
  if (!months) return null;
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

// Never trust a client-supplied discount — always re-derive it server-side
// from the stored code so a tampered request can't change what's charged.
// Promo codes are switched off (owner's decision, 2026-09-26): no discount can be
// applied at checkout. Set to true to bring them back -- but first add a
// product-type restriction, or a % code would also discount domains (sold at cost).
const PROMO_CODES_ENABLED = false;

async function validatePromoCode(rawCode, subtotal) {
  if (!PROMO_CODES_ENABLED) return { ok: false, reason: 'Promo codes aren’t available right now.' };
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase().slice(0, 40) : '';
  if (!code) return { ok: false, reason: 'No promo code given.' };
  if (!dbConfigured()) return { ok: false, reason: 'Promo codes aren’t available right now.' };
  try {
    await ensureSchema();
    const result = await getPool().query('SELECT * FROM promo_codes WHERE code = $1', [code]);
    const row = result.rows[0];
    if (!row) return { ok: false, reason: 'That promo code isn’t valid.' };
    if (!row.active) return { ok: false, reason: 'That promo code is no longer active.' };
    if (row.expires_at && new Date(row.expires_at) < new Date()) return { ok: false, reason: 'That promo code has expired.' };
    if (row.max_uses != null && row.used_count >= row.max_uses) return { ok: false, reason: 'That promo code has already been fully redeemed.' };

    let discount = row.discount_type === 'percent'
      ? subtotal * (Number(row.discount_value) / 100)
      : Number(row.discount_value);
    discount = Math.min(Math.max(discount, 0), subtotal - 1); // always leave at least ZMW 1 payable
    return { ok: true, code, discountAmount: Math.round(discount * 100) / 100 };
  } catch (err) {
    console.error('validatePromoCode failed:', err);
    return { ok: false, reason: 'Could not check that promo code — please try again.' };
  }
}

async function redeemPromoCode(code) {
  if (!code || !dbConfigured()) return;
  try {
    await getPool().query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1', [code]);
  } catch (err) {
    console.error('redeemPromoCode failed (non-fatal):', err);
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

// Orders in progress, saved to a small JSON file in the home folder (outside the app folder the
// deploy replaces) so a restart no longer forgets them: on 2026-09-30 a customer paid while the app
// was restarting and got no receipt, and nobody was notified.
// Kept (not deleted) after payment so the receipt can still be downloaded; pruned after a day instead.
const fs = require('fs');
const os = require('os');
const path = require('path');
const ORDERS_FILE = process.env.PENDING_ORDERS_FILE || path.join(os.homedir(), '.nc-pending-orders.json');
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

let saveTimer = null;
function savePendingOrders() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = { orders: [...pendingOrders], notified: [...notified] };
      fs.writeFileSync(ORDERS_FILE + '.tmp', JSON.stringify(data), { mode: 0o600 });
      fs.renameSync(ORDERS_FILE + '.tmp', ORDERS_FILE);
    } catch (err) {
      console.error('Saving pending orders failed (non-fatal):', err.message);
    }
  }, 200);
}

class SavedMap extends Map {
  set(key, value) { super.set(key, value); savePendingOrders(); return this; }
  delete(key) { const had = super.delete(key); if (had) savePendingOrders(); return had; }
}
class SavedSet extends Set {
  add(value) { super.add(value); savePendingOrders(); return this; }
}

const pendingOrders = new SavedMap();
const notified = new SavedSet();

(function loadPendingOrders() {
  try {
    const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const now = Date.now();
    for (const [ref, order] of data.orders || []) {
      if (!order || now - order.createdAt > ORDER_TTL_MS) continue;
      if (order.expiresAt) order.expiresAt = new Date(order.expiresAt);
      Map.prototype.set.call(pendingOrders, ref, order);
    }
    for (const ref of data.notified || []) {
      if (pendingOrders.has(ref)) Set.prototype.add.call(notified, ref);
    }
    console.log(`Pending orders restored from disk: ${pendingOrders.size}`);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Loading pending orders failed (non-fatal):', err.message);
  }
})();

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

// Zambian mobile money numbers only (that's the only payment method this
// site accepts), so the phone used for checkout is always Zambian
// regardless of the registrant's declared country — format Namecheap wants
// is "+CountryCode.LocalNumberWithoutLeadingZero".
function toNamecheapPhone(phoneDigits) {
  const local = phoneDigits.replace(/^\+?260/, '').replace(/^0/, '');
  return `+260.${local}`;
}

// Re-checks availability right before registering (the customer may have
// checked minutes or hours earlier — someone else could have taken it since,
// or it could have turned out to be premium-priced, which our fixed listed
// price wouldn't cover) and only registers if it's still a normal, available
// domain. Never throws — returns a result object either way so the caller
// can report success or a clear reason for manual follow-up.
async function attemptDomainRegistration(order) {
  if (!order.registrant) return { ok: false, reason: 'No registrant contact details on file for this order.' };
  if (registrarName === 'namecheap' && process.env.NAMECHEAP_SANDBOX === 'true') {
    // Sandbox only ever talks to Namecheap's fake test environment — never
    // let it report a false "registered" success for a real paying customer.
    return { ok: false, reason: 'Namecheap is still in sandbox mode (not yet moved to a funded production account) — register this domain manually on the real Namecheap site and confirm the price with the customer.' };
  }
  try {
    const [check] = await checkAvailability([order.domain]);
    if (!check || !check.available) {
      return { ok: false, reason: `${order.domain} is no longer available to register.` };
    }
    if (check.isPremium) {
      return { ok: false, reason: `${order.domain} is a premium domain (Namecheap price differs from what was charged) — register manually and confirm the price difference with the customer.` };
    }
  } catch (err) {
    return { ok: false, reason: `Could not re-check availability: ${err.message || err}` };
  }

  const contact = {
    firstName: (order.name.split(' ')[0] || order.name).slice(0, 50),
    lastName: (order.name.split(' ').slice(1).join(' ') || order.name).slice(0, 50),
    address1: order.registrant.address1,
    city: order.registrant.city,
    stateProvince: order.registrant.stateProvince || order.registrant.city,
    postalCode: order.registrant.postalCode,
    country: order.registrant.country,
    phone: toNamecheapPhone(order.phone),
    email: order.email,
  };

  return registerDomain(order.domain, 1, contact);
}

// Standalone database orders have no domain of their own (no website
// involved) but WHM's createacct still requires one to identify the
// account — this generates a syntactically valid, internal-only one that's
// never meant to resolve publicly.
function syntheticDbDomain(reference) {
  const slug = reference.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
  return `db-${slug}.nadinecloud.com`;
}

// Emails the new cPanel login details straight to the customer — this used
// to only go in the admin email with a note to forward it manually, from
// back when Resend couldn't deliver to customers directly. Now that
// nadinecloud.com is verified, send it to them immediately instead.
async function emailAccountDetailsToCustomer(order, acct) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud hosting is ready — ${acct.domain}`,
    text: `Hi ${order.name},\n\nYour hosting account is set up and ready to go.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe'd recommend logging in and changing your password once you're in.\n\nAny trouble, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) {
    console.error(`Account details email not delivered to customer for ${acct.domain}:`, result.reason);
  }
  return result;
}

async function emailDatabaseDetailsToCustomer(order, acct, maxsql) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud database hosting is ready — ${order.plan}`,
    text: `Hi ${order.name},\n\nYour database hosting account is set up and ready to go.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nFrom there, go to MySQL Databases (or PostgreSQL Databases) and use the wizard to create your database(s) — your plan covers up to ${maxsql}. Each database gets its own username/password that your app connects with directly.\n\nWe'd recommend logging in and changing your cPanel password once you're in.\n\nAny trouble, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) {
    console.error(`Database account email not delivered to customer for ${acct.domain}:`, result.reason);
  }
  return result;
}

async function emailWordPressDetailsToCustomer(order, acct) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud WordPress hosting is ready — ${acct.domain}`,
    text: `Hi ${order.name},\n\nYour hosting account is set up.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe're installing WordPress for you now — you'll get a separate email with your WordPress admin login within a few hours.\n\nWe'd recommend logging in to cPanel and changing your password once you're in.\n\nAny trouble, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`WordPress account email not delivered to customer for ${acct.domain}:`, result.reason);
  return result;
}

async function emailBuilderDetailsToCustomer(order, acct) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud Website Builder account is ready — ${acct.domain}`,
    text: `Hi ${order.name},\n\nYour hosting account is set up.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe're enabling Website Builder for you now — it'll appear in cPanel within a few hours, and you can start building your site right from there.\n\nWe'd recommend logging in and changing your cPanel password once you're in.\n\nAny trouble, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`Website Builder account email not delivered to customer for ${acct.domain}:`, result.reason);
  return result;
}

async function emailSslOrderConfirmation(order) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud SSL certificate order — ${order.domain}`,
    text: `Hi ${order.name},\n\nThanks for your order — we're setting up your SSL certificate for ${order.domain} now. This can take up to 24 hours depending on the certificate type (Wildcard and Extended Validation need extra verification). We'll email you once it's live on your site.\n\nAny questions, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`SSL confirmation email not delivered for ${order.domain}:`, result.reason);
  return result;
}

async function emailCarePlanConfirmation(order) {
  const result = await sendEmail({
    to: order.email,
    subject: `Welcome to your Nadine Cloud Care Plan — ${order.plan}`,
    text: `Hi ${order.name},\n\nThanks for signing up for ${order.plan}. Our team will reach out within 24 hours to onboard your website onto the plan and confirm what we'll need access to.\n\nAny questions in the meantime, email us at info@nadinecloud.com.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`Care plan confirmation email not delivered for ${order.email}:`, result.reason);
  return result;
}

// Any hosting plan bundles a free .com domain on annual-or-longer billing.
// Monthly signups -- including Avara's ZMW 50 first-month intro rate,
// which is only ever period=mo -- still owe for the domain separately.
// Derived server-side from the stored order rather than trusting anything
// the client claimed, since it decides whether staff need to invoice the
// customer for the domain afterward.
function isFreeDomainEligible(order) {
  return Boolean(order) && order.type === 'hosting' && ['yr', '2yr', '3yr'].includes(order.period);
}

// Deploys an AI-generated draft into a freshly-created WHM/cPanel account,
// if this order has one attached. Runs independently of (and after) the
// WHM account creation and Website Builder feature-flag reminder -- the
// static file going live in public_html has nothing to do with whether
// that feature flag is separately flipped on. Returns a message fragment
// to append to the staff notification; empty string when there's no draft.
async function deployAiDraftIfAny(order, acct) {
  if (!order.draftId) return '';
  const draft = await loadDraft(order.draftId);
  if (!draft) {
    return `\n\n--- ACTION NEEDED: AI-generated site missing ---\nDraft: ${order.draftId}\nThe draft could not be found at deploy time -- ask the customer (${order.email}) to resend their site, or rebuild it with them.`;
  }
  const deployResult = await deployDraftHtml({ username: acct.username, password: acct.password, html: draft.html });
  if (deployResult.ok) {
    return `\n\n--- AI-generated site deployed automatically ---\nLive at: https://${acct.domain}`;
  }
  return `\n\n--- ACTION NEEDED: AI-generated site deployment FAILED ---\nDraft: ${order.draftId}\nReason: ${deployResult.reason}\nDownload it from /api/ai-builder/export/${order.draftId}?email=${encodeURIComponent(order.email)} and upload it into public_html manually via cPanel File Manager or FTP, then let the customer know.`;
}

// Clients Nadine Cloud hosts by hand pay a fixed monthly amount through a personal link
// (/checkout/?type=managed&client=<reference>). The amount, plan and next due date always come from
// their record in the database, never from the browser.
async function lookupManagedClient(ref) {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(ref || '') || !dbConfigured()) return null;
  try {
    await ensureSchema();
    // The next due date follows the LATEST paid period for this client (their payments create new
    // orders), not the date on the original record -- otherwise every payment would land on the same month.
    const r = await getPool().query(
      `SELECT o.plan, o.amount, o.email, o.period,
              GREATEST(o.expires_at, (SELECT max(x.expires_at) FROM orders x
                 WHERE x.email = o.email AND x.type = 'managed' AND x.status = 'paid'
                   AND x.domain IS NOT DISTINCT FROM o.domain)) AS expires_at
       FROM orders o WHERE o.reference = $1 AND o.type = 'managed' AND o.status = 'paid'`,
      [ref]
    );
    const row = r.rows[0];
    if (!row) return null;
    const period = row.period === 'yr' ? 'yr' : 'mo';
    const next = new Date(row.expires_at || Date.now());
    // keep the same day AND time every month / every year. UTC months (not the server's local clock, which
    // shifts an hour with US daylight saving) -- Lusaka has no daylight saving, so the Lusaka due date stays put.
    next.setUTCMonth(next.getUTCMonth() + (period === 'yr' ? 12 : 1));
    return { plan: row.plan, amount: Number(row.amount), email: row.email, nextExpiry: next, period };
  } catch (err) {
    console.error('lookupManagedClient failed:', err);
    return null;
  }
}

// A payment for a hosting-type product on a domain that already has an earlier PAID order is a
// renewal: the account already exists, so we must not try to create a second one.
async function isRenewalOrder(reference, order) {
  if (!order || !order.domain || !dbConfigured() || !['hosting', 'wordpress', 'builder'].includes(order.type)) return false;
  try {
    await ensureSchema();
    const r = await getPool().query(
      `SELECT 1 FROM orders WHERE domain = $1 AND type = $2 AND status = 'paid' AND reference <> $3 LIMIT 1`,
      [order.domain, order.type, reference]
    );
    return r.rowCount > 0;
  } catch (err) {
    console.error('isRenewalOrder check failed (treating as a new order):', err);
    return false;
  }
}

async function notifyOrder(reference, outcome, reason) {
  if (notified.has(reference)) return;
  notified.add(reference);
  const order = pendingOrders.get(reference);
  const reasonLine = reason ? `\nReason: ${reason}` : '';
  const freeDomain = isFreeDomainEligible(order);
  const domainOptionLine = order && order.type === 'hosting'
    ? `\nDomain option: ${order.domainOption === 'new' ? `NEW — ${freeDomain ? 'FREE, included with Zyra annual+ — do NOT invoice for this domain' : 'customer needs this domain registered and billed separately'}` : 'Existing — customer already owns this domain'}`
    : '';
  let message = order
    ? `Plan: ${order.plan}\nAmount: ZMW ${order.amount}\nCustomer: ${order.name} <${order.email}>\nPhone: ${order.phone}\nDomain requested: ${order.domain || '-'}${domainOptionLine}\nReference: ${reference}\nStatus: ${outcome}${reasonLine}`
    : `Reference: ${reference}\nStatus: ${outcome}${reasonLine}\n(No local order details — server likely restarted since checkout started; check the Lenco dashboard for this reference.)`;

  const renewal = outcome === 'paid' && await isRenewalOrder(reference, order);

  // On a successful hosting payment for a domain the customer already owns,
  // provision the real cPanel account automatically.
  if (renewal) {
    message += `

--- RENEWAL: ${order.domain} already has an account, nothing was created ---
The customer paid to keep ${order.plan} running. Their end date was extended by this payment.`;
  } else if (outcome === 'paid' && order && order.type === 'hosting' && order.pkg && order.domain && order.domainOption !== 'new') {
    const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
    if (acct.ok) {
      const emailResult = await emailAccountDetailsToCustomer(order, acct);
      message += `\n\n--- WHM account created automatically ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nLogin details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`} (${order.email}).`;
    } else {
      message += `\n\n--- WHM account creation FAILED ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nYou'll need to create this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'hosting' && order.pkg && order.domainOption === 'new') {
    // Register the new domain first, then chain into WHM account creation
    // if that succeeds — same automatic flow as an existing domain, just
    // with a registration step in front of it.
    const reg = await attemptDomainRegistration(order);
    if (reg.ok) {
      message += `\n\n--- Domain registered automatically ---\nDomain: ${reg.domain}\nNamecheap order: ${reg.orderId}\n${freeDomain ? 'Included free with Zyra annual+ — do NOT bill the customer for this domain.' : 'Not included in this plan — confirm domain price with the customer and invoice separately if not already covered.'}\n\nProceeding to create the hosting account…`;
      const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
      if (acct.ok) {
        const emailResult = await emailAccountDetailsToCustomer(order, acct);
        message += `\n\n--- WHM account created automatically ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nLogin details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`} (${order.email}).`;
      } else {
        message += `\n\n--- WHM account creation FAILED (domain is registered, hosting isn't) ---\nReason: ${acct.reason}\nCreate this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}.`;
      }
    } else {
      message += `\n\n--- ACTION NEEDED: domain registration failed ---\nCustomer wants a NEW domain (${order.domain || 'name not given'}) registered before hosting is set up.\nReason: ${reg.reason}\nRegister it manually, then create the WHM account on package nadine14_${order.pkg}.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'database' && order.pkg) {
    const dbDomain = syntheticDbDomain(reference);
    const acct = await createAccount({ domain: dbDomain, pkgSlug: order.pkg, contactemail: order.email });
    if (acct.ok) {
      const maxsql = (DATABASE_PACKAGES[order.pkg] || {}).MAXSQL || '?';
      const emailResult = await emailDatabaseDetailsToCustomer(order, acct, maxsql);
      message += `\n\n--- WHM database account created automatically ---\nAccount domain (internal, not a real site): ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\nDatabase limit: ${maxsql}\n\nLogin details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`} (${order.email}).`;
    } else {
      message += `\n\n--- WHM database account creation FAILED ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nYou'll need to create this account manually in WHM on package nadine14_${order.pkg} and send the customer (${order.email}) their login.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'wordpress' && order.pkg && order.domain) {
    const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
    if (acct.ok) {
      const emailResult = await emailWordPressDetailsToCustomer(order, acct);
      message += `\n\n--- WHM account created automatically (WordPress hosting) ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nACTION NEEDED: install WordPress via Softaculous in cPanel for this account, then email the customer (${order.email}) their WordPress admin login.\n\nHosting login details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`}.`;
    } else {
      message += `\n\n--- WHM account creation FAILED (WordPress hosting) ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nCreate this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}, install WordPress, then send the customer (${order.email}) their logins.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'builder' && order.pkg && order.domain) {
    const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
    if (acct.ok) {
      const emailResult = await emailBuilderDetailsToCustomer(order, acct);
      message += `\n\n--- WHM account created automatically (Website Builder) ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nACTION NEEDED: enable the Website Builder feature for this account in WHM's Feature Manager.\n\nLogin details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`}.`;
      message += await deployAiDraftIfAny(order, acct);
    } else {
      message += `\n\n--- WHM account creation FAILED (Website Builder) ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nCreate this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'ssl' && order.domain) {
    const sslEmailResult = await emailSslOrderConfirmation(order);
    message += `\n\n--- ACTION NEEDED: SSL certificate order ---\nDomain: ${order.domain}\nCertificate type: ${order.pkg}\nPurchase and issue the certificate (e.g. via Namecheap), install it via WHM's SSL/TLS Manager for ${order.domain}, then email the customer (${order.email}) to confirm it's live.\n\nOrder confirmation ${sslEmailResult.ok ? 'was emailed to the customer' : `FAILED to send (${sslEmailResult.reason})`}.`;
  } else if (outcome === 'paid' && order && order.type === 'care' && order.pkg) {
    const careEmailResult = await emailCarePlanConfirmation(order);
    message += `\n\n--- ACTION NEEDED: new Care Plan customer ---\nPlan: ${order.plan}\nReach out to ${order.name} (${order.email}) to onboard them — get site access and confirm what's covered.\n\nWelcome email ${careEmailResult.ok ? 'was sent to the customer' : `FAILED to send (${careEmailResult.reason})`}.`;
  } else if (outcome === 'paid' && order && order.type === 'domain' && order.domain) {
    const reg = await attemptDomainRegistration(order);
    if (reg.ok) {
      message += `\n\n--- Domain registered automatically ---\nDomain: ${reg.domain}\nNamecheap order: ${reg.orderId}\nCharged by Namecheap: ${reg.chargedAmount}\n\nWhoisGuard privacy protection was requested — confirm it applied in the Namecheap dashboard.`;
    } else {
      message += `\n\n--- ACTION NEEDED: automatic registration failed ---\nDomain: ${order.domain}\nReason: ${reg.reason}\nRegister it manually and let the customer (${order.email}) know once it's done.`;
    }
  } else if (outcome === 'paid' && order && order.type === 'bundle' && order.pkg && order.domain) {
    // Launch bundle: domain + hosting + website builder for one fixed price.
    // The domain is always included free (unlike hosting's annual-only rule)
    // -- there's no domainOption toggle here, every bundle order is a new
    // domain registration chained straight into the builder account.
    const reg = await attemptDomainRegistration(order);
    if (reg.ok) {
      message += `\n\n--- Domain registered automatically (included free with Launch) ---\nDomain: ${reg.domain}\nNamecheap order: ${reg.orderId}\n\nProceeding to create the Website Builder hosting account…`;
      const acct = await createAccount({ domain: order.domain, pkgSlug: order.pkg, contactemail: order.email });
      if (acct.ok) {
        const emailResult = await emailBuilderDetailsToCustomer(order, acct);
        message += `\n\n--- WHM account created automatically (Website Builder) ---\nDomain: ${acct.domain}\nUsername: ${acct.username}\nPassword: ${acct.password}\ncPanel login: https://${acct.domain}:2083\n\nACTION NEEDED: enable the Website Builder feature for this account in WHM's Feature Manager.\n\nLogin details ${emailResult.ok ? 'were emailed directly to the customer' : `FAILED to send to the customer (${emailResult.reason}) — forward manually`}.`;
        message += await deployAiDraftIfAny(order, acct);
      } else {
        message += `\n\n--- WHM account creation FAILED (Website Builder) ---\nReason: ${acct.reason}${acct.raw ? `\nDetails: ${JSON.stringify(acct.raw.metadata || acct.raw)}` : ''}\nCreate this account manually in WHM for ${order.domain} on package nadine14_${order.pkg}.`;
      }
    } else {
      message += `\n\n--- ACTION NEEDED: domain registration failed ---\nCustomer's Launch bundle includes ${order.domain}, registration failed.\nReason: ${reg.reason}\nRegister it manually, then create the WHM Website Builder account on package nadine14_${order.pkg}.`;
    }
  }

  if (outcome === 'paid' && order && order.type === 'managed') {
    message += `

--- Managed client payment received ---
Nothing to set up: this client's hosting is looked after by hand. Their next payment date moved forward by one month.`;
  }

  if (order && outcome === 'paid') {
    order.paidAt = Date.now();
    savePendingOrders();
    if (order.promoCode) await redeemPromoCode(order.promoCode);
  }
  updateOrderStatus(reference, outcome, order && order.paidAt ? new Date(order.paidAt) : null);

  // A renewal paid for a site we had paused for non-payment: switch it straight back on.
  if (order && outcome === 'paid' && order.domain) {
    const back = await resumePausedSite(order.domain).catch((err) => ({ ok: false, reason: String(err) }));
    if (back && back.resumed) message += `\n\n--- Site switched back on ---\n${order.domain} had been paused for non-payment; it is live again.`;
    else if (back && back.reason && back.reason !== 'not_paused') message += `\n\n--- ACTION NEEDED ---\n${order.domain} was paused but could not be switched back on automatically (${back.reason}). Remove the NADINE-CLOUD-PAUSE block from its .htaccess or unsuspend it in WHM.`;
  }

  await sendEmail({
    subject: `Nadine Cloud checkout — payment ${outcome} (${reference})`,
    text: message,
  });

  // Also email the customer their own receipt — nadinecloud.com is verified
  // with Resend now, so this actually delivers (confirmed via a live test to
  // an unrelated inbox). The download link on the checkout page still works
  // as a backup either way.
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
        console.error(`Customer receipt email not delivered for ${reference}:`, result.reason);
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

  let plan = typeof parsed.plan === 'string' ? parsed.plan.trim().slice(0, 120) : '';
  const clientRef = typeof parsed.clientRef === 'string' ? parsed.clientRef.trim().slice(0, 80) : '';
  const amount = Number(parsed.amount);
  const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 120) : '';
  const email = typeof parsed.email === 'string' ? parsed.email.trim().slice(0, 200) : '';
  const phoneDigits = typeof parsed.phone === 'string' ? parsed.phone.replace(/[^\d+]/g, '').slice(0, 20) : '';
  const operator = typeof parsed.operator === 'string' ? parsed.operator.toLowerCase().trim() : '';
  const isCard = parsed.method === 'card';
  const domain = typeof parsed.domain === 'string' ? parsed.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').slice(0, 255) : '';
  const type = typeof parsed.type === 'string' ? parsed.type.trim().slice(0, 30) : '';
  const pkg = typeof parsed.pkg === 'string' ? parsed.pkg.trim().toLowerCase() : '';
  const domainOption = parsed.domainOption === 'new' ? 'new' : 'existing';
  const address1 = typeof parsed.address1 === 'string' ? parsed.address1.trim().slice(0, 200) : '';
  const city = typeof parsed.city === 'string' ? parsed.city.trim().slice(0, 100) : '';
  const stateProvince = typeof parsed.stateProvince === 'string' ? parsed.stateProvince.trim().slice(0, 100) : '';
  const postalCode = typeof parsed.postalCode === 'string' ? parsed.postalCode.trim().slice(0, 20) : '';
  const country = typeof parsed.country === 'string' ? parsed.country.trim().toUpperCase().slice(0, 10) : '';
  const period = typeof parsed.period === 'string' ? parsed.period.trim().slice(0, 10) : '';
  const promoCodeInput = typeof parsed.promoCode === 'string' ? parsed.promoCode.trim().slice(0, 40) : '';
  const draftIdInput = typeof parsed.draftId === 'string' ? parsed.draftId.trim().slice(0, 80) : '';

  if (!plan) return sendJson(res, 400, { error: 'Missing plan.' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 20000) return sendJson(res, 400, { error: 'Invalid amount.' });
  if (!name) return sendJson(res, 400, { error: 'Name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'A valid email is required.' });
  if (phoneDigits.length < 9) return sendJson(res, 400, { error: isCard ? 'A valid phone number is required.' : 'A valid mobile money phone number is required.' });
  if (isCard) {
    if (!lipila.isConfigured()) return sendJson(res, 503, { error: 'Card payment isn’t switched on yet — please use mobile money, email or the contact form.' });
    if (!address1 || !city || !postalCode || !country || country === 'OTHER') {
      return sendJson(res, 400, { error: 'Please fill in your billing address (street, city, postal code and country) for card payment.' });
    }
  } else if (!OPERATORS.has(operator)) return sendJson(res, 400, { error: 'Select MTN, Airtel or Zamtel.' });
  if (type === 'hosting') {
    if (!pkg || !HOSTING_PACKAGES[pkg]) return sendJson(res, 400, { error: 'Missing or invalid hosting package.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required to set up hosting.' });
  }
  if (type === 'database' && (!pkg || !DATABASE_PACKAGES[pkg])) {
    return sendJson(res, 400, { error: 'Missing or invalid database package.' });
  }
  if (type === 'wordpress') {
    if (!pkg || !WORDPRESS_PACKAGES[pkg]) return sendJson(res, 400, { error: 'Missing or invalid WordPress hosting package.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required to set up WordPress hosting.' });
  }
  if (type === 'builder') {
    if (!pkg || !BUILDER_PACKAGES[pkg]) return sendJson(res, 400, { error: 'Missing or invalid Website Builder package.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required to set up Website Builder.' });
  }
  if (type === 'ssl') {
    if (!pkg || !SSL_PRODUCTS.has(pkg)) return sendJson(res, 400, { error: 'Missing or invalid SSL certificate type.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required for an SSL certificate.' });
  }
  if (type === 'care' && (!pkg || !CARE_PRODUCTS.has(pkg))) {
    return sendJson(res, 400, { error: 'Missing or invalid care plan.' });
  }
  if (type === 'bundle') {
    if (!pkg || !BUILDER_PACKAGES[pkg]) return sendJson(res, 400, { error: 'Missing or invalid bundle package.' });
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return sendJson(res, 400, { error: 'A valid domain is required for the Launch bundle.' });
  }

  // The AI-generated draft is optional even on builder/bundle checkouts --
  // a customer can still buy plain hosting/Launch without ever using the
  // generator. When a draftId IS given, it must actually resolve to a real
  // draft, or the customer would pay expecting a site that never deploys.
  let draftId = null;
  if (draftIdInput && (type === 'builder' || type === 'bundle')) {
    const draft = await loadDraft(draftIdInput);
    if (!draft) return sendJson(res, 400, { error: 'That AI-generated draft could not be found — please regenerate it.' });
    draftId = draftIdInput;
  }

  const needsRegistrant = type === 'domain' || type === 'bundle' || (type === 'hosting' && domainOption === 'new');
  if (needsRegistrant) {
    if (!domain) return sendJson(res, 400, { error: 'A domain name is required.' });
    if (!address1 || !city || !postalCode || !country || country === 'OTHER') {
      return sendJson(res, 400, { error: 'A full contact address is required to register a domain — please fill in every field, or email us at info@nadinecloud.com if your country isn’t listed.' });
    }
  }

  // Never trust the amount sent by the browser: check it against the real list price
  // (a domain is priced from the registrar's live price) before any payment is started.
  let managed = null;
  if (type === 'managed') {
    managed = await lookupManagedClient(clientRef);
    if (!managed) return sendJson(res, 400, { error: 'This payment link is not valid. Please use the link in your latest email from us, or email us at info@nadinecloud.com.' });
    if (Math.abs(amount - managed.amount) > 0.009) return sendJson(res, 400, { error: 'That amount does not match your agreed monthly payment.' });
    plan = managed.plan;
  } else {
    const priceCheck = await checkPrice({ type, pkg, period, plan, domain, amount });
    if (!priceCheck.ok) {
      console.warn(`Checkout price rejected: type=${type} pkg=${pkg} period=${period} amount=${amount} expected=${priceCheck.expected ?? 'n/a'}`);
      return sendJson(res, 400, { error: priceCheck.error });
    }
  }

  let discountAmount = 0;
  let promoCode = null;
  if (promoCodeInput && !managed) {
    const promo = await validatePromoCode(promoCodeInput, amount);
    if (!promo.ok) return sendJson(res, 400, { error: promo.reason });
    discountAmount = promo.discountAmount;
    promoCode = promo.code;
  }
  const chargeAmount = Math.round((amount - discountAmount) * 100) / 100;

  // Mobile money now goes through Lipila (shown to customers as Nadine Pay). Lenco is only used
  // if the Lipila key is missing, so a missing setting can never stop payments altogether.
  const viaLipilaMomo = !isCard && lipila.isConfigured();
  let reference = isCard ? genReference().replace(/^NC-/, 'NCC-') : viaLipilaMomo ? genReference().replace(/^NC-/, 'NCM-') : genReference();

  const newOrderRecord = () => ({
    plan, amount: chargeAmount, name, email, phone: phoneDigits,
    domain: domain || null, type: type || null, pkg: pkg || null,
    domainOption: type === 'hosting' ? domainOption : null,
    registrant: needsRegistrant ? { address1, city, stateProvince, postalCode, country } : null,
    createdAt: Date.now(),
    period: managed ? managed.period : (period || null),
    expiresAt: managed ? managed.nextExpiry : computeExpiryDate(type, period),
    recordEmail: managed ? managed.email : null,
    promoCode,
    discountAmount,
    draftId,
    method: isCard ? 'card' : 'mobile-money',
  });

  // Card: send the customer to Lipila's hosted card page. Nothing is provisioned here -
  // that only happens when Lipila itself confirms the payment (status check or webhook).
  if (isCard) {
    const site = (process.env.PUBLIC_SITE_URL || 'https://www.nadinecloud.com').replace(/\/+$/, '');
    const [firstName, ...rest] = name.split(/\s+/);
    const orderRecord = newOrderRecord();
    pendingOrders.set(reference, orderRecord);
    const card = await lipila.createCardPayment({
      reference,
      amount: chargeAmount,
      currency: 'ZMW',
      narration: `Nadine Cloud - ${plan}`.slice(0, 100),
      customer: {
        firstName, lastName: rest.join(' ') || '-', phoneNumber: phoneDigits, email,
        city, country, address: address1, zip: postalCode,
      },
      backUrl: `${site}/checkout/?ref=${encodeURIComponent(reference)}`,
      callbackUrl: `${site}/api/lipila-webhook`,
    });
    if (!card.ok) {
      pendingOrders.delete(reference);
      sendJson(res, 502, { error: 'Could not start the card payment — please try again, use mobile money, or email us at info@nadinecloud.com.' });
      return;
    }
    persistOrder(reference, orderRecord);
    sendJson(res, 200, { reference, redirectUrl: card.redirectUrl });
    return;
  }

  if (viaLipilaMomo) {
    const site = (process.env.PUBLIC_SITE_URL || 'https://www.nadinecloud.com').replace(/\/+$/, '');
    const orderRecord = newOrderRecord();
    pendingOrders.set(reference, orderRecord);
    const momo = await lipila.createMobileMoneyPayment({
      reference,
      amount: chargeAmount,
      phone: phoneDigits,
      narration: `Nadine Cloud - ${plan}`.slice(0, 100),
      callbackUrl: `${site}/api/lipila-webhook`,
    });
    if (momo.ok) {
      persistOrder(reference, orderRecord);
      sendJson(res, 200, { reference, status: 'pay-offline' }); // the customer approves the prompt on their phone
      return;
    }
    pendingOrders.delete(reference);
    if (momo.error === 'BAD_PHONE') {
      sendJson(res, 400, { error: 'Please enter a Zambian mobile money number (MTN, Airtel or Zamtel), e.g. 0971234567.' });
      return;
    }
    if (!process.env.LENCO_API_KEY) {
      sendJson(res, 502, { error: 'Could not start the mobile money payment — please check the number and try again, or email us at info@nadinecloud.com.' });
      return;
    }
    // Lipila refused or could not be reached: fall back to Lenco so the customer can still pay.
    console.error(`Lipila mobile money failed for ${reference} (${momo.error}) - falling back to Lenco`);
    reference = genReference();
  }

  let lenco;
  try {
    lenco = await lencoRequest('/collections/mobile-money', {
      method: 'POST',
      body: JSON.stringify({
        amount: chargeAmount,
        reference,
        phone: phoneDigits,
        operator,
        country: 'zm',
        bearer: 'customer',
      }),
    });
  } catch (err) {
    if (err.code === 'LENCO_NOT_CONFIGURED') {
      sendJson(res, 503, { error: 'Online payment isn’t switched on yet — please email us or use the contact form instead.' });
      return;
    }
    console.error('Lenco initiate error:', err);
    sendJson(res, 502, { error: 'Could not start the payment — please try again or email us.' });
    return;
  }

  if (!lenco.body || lenco.body.status !== true || !lenco.body.data) {
    sendJson(res, lenco.httpStatus >= 400 ? lenco.httpStatus : 502, {
      error: (lenco.body && lenco.body.message) || 'Payment could not be started.',
    });
    return;
  }

  const orderRecord = newOrderRecord();
  pendingOrders.set(reference, orderRecord);
  persistOrder(reference, orderRecord);

  sendJson(res, 200, { reference, status: lenco.body.data.status });
}

const isLipilaRef = (ref) => /^NC[CM]-/.test(ref || '');

// Asks Lipila for the real state of a card or mobile money payment and, when it is really paid, runs the normal
// order fulfilment once (notifyOrder is idempotent). Used by the status poll and the webhook.
async function resolveCardPayment(reference) {
  const order = pendingOrders.get(reference);
  const r = await lipila.checkStatus(reference);
  if (r.error) return { error: r.error };
  if (r.status === 'successful') {
    const wrongRef = r.referenceId && r.referenceId !== reference;
    const wrongAmount = order && typeof r.amount === 'number' && r.amount + 0.01 < order.amount;
    const wrongCurrency = r.currency && r.currency.toUpperCase() !== 'ZMW';
    if (wrongRef || wrongAmount || wrongCurrency) {
      console.error(`Card payment ${reference} does not match the order (ref ${r.referenceId}, amount ${r.amount} ${r.currency}) - not provisioning`);
      notifyOrder(reference, 'needs-review', `Lipila reports ${r.amount} ${r.currency || ''} for reference ${r.referenceId || reference}, which does not match the order. Nothing was set up - check it in the Lipila dashboard.`).catch(() => {});
      return { status: 'pending' };
    }
    notifyOrder(reference, 'paid').catch(() => {});
    return { status: 'successful' };
  }
  if (r.status === 'failed') {
    console.error(`Card checkout ${reference} failed:`, r.message || '(no reason given)');
    return { status: 'failed', reason: r.message };
  }
  return { status: 'pending' };
}

async function handleCheckoutStatus(req, res, reference) {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(reference || '')) {
    sendJson(res, 400, { error: 'Invalid reference.' });
    return;
  }

  // Lipila payments (card NCC-, mobile money NCM-) are confirmed with Lipila, never by what the browser says.
  if (isLipilaRef(reference)) {
    const result = await resolveCardPayment(reference);
    if (result.status === 'failed' && reference.startsWith('NCM-')) notifyOrder(reference, 'failed', result.reason).catch(() => {});
    if (result.error) return sendJson(res, 502, { error: 'Could not check payment status.' });
    return sendJson(res, 200, { status: result.status, reason: result.reason || null });
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

// Lets the checkout page show the real discounted total before the customer
// submits payment, without letting them (or a tampered request) dictate the
// discount themselves -- this re-runs the exact same server-side validation
// handleCheckoutInitiate uses.
async function handleValidatePromo(req, res, query) {
  const code = (query.get('code') || '').trim();
  const amount = Number(query.get('amount'));
  if (!Number.isFinite(amount) || amount <= 0) {
    sendJson(res, 400, { error: 'Invalid amount.' });
    return;
  }
  const promo = await validatePromoCode(code, amount);
  if (!promo.ok) {
    sendJson(res, 400, { error: promo.reason });
    return;
  }
  sendJson(res, 200, {
    code: promo.code,
    discountAmount: promo.discountAmount,
    finalAmount: Math.round((amount - promo.discountAmount) * 100) / 100,
  });
}

// Minimal, persistent admin tool for creating/listing promo codes -- unlike
// the one-off migration routes used earlier in this project, code creation
// is an ongoing operational need, so this stays in place rather than being
// removed after one use. Protected by a shared-secret header rather than a
// full admin login system, since it's the only admin action that exists.
function isAdminAuthorized(req) {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && req.headers['x-admin-secret'] === secret;
}

async function handleAdminPromoCodes(req, res) {
  if (!isAdminAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return;
  }
  if (!dbConfigured()) {
    sendJson(res, 503, { error: 'Database not configured.' });
    return;
  }
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await getPool().query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    sendJson(res, 200, { codes: result.rows });
    return;
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, 'http://internal');
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();
    if (!code) return sendJson(res, 400, { error: 'A code is required.' });
    await getPool().query('DELETE FROM promo_codes WHERE code = $1', [code]);
    sendJson(res, 200, { ok: true });
    return;
  }

  let raw;
  try {
    raw = await readBody(req, 2000);
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

  const code = typeof parsed.code === 'string' ? parsed.code.trim().toUpperCase().slice(0, 40) : '';
  const discountType = parsed.discountType === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Number(parsed.discountValue);
  const maxUses = parsed.maxUses != null ? Number(parsed.maxUses) : null;
  const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;

  if (!code) return sendJson(res, 400, { error: 'A code is required.' });
  if (!Number.isFinite(discountValue) || discountValue <= 0) return sendJson(res, 400, { error: 'A positive discountValue is required.' });
  if (discountType === 'percent' && discountValue > 100) return sendJson(res, 400, { error: 'Percent discount cannot exceed 100.' });

  try {
    await getPool().query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET discount_type = $2, discount_value = $3, max_uses = $4, expires_at = $5, active = true`,
      [code, discountType, discountValue, maxUses, expiresAt]
    );
    sendJson(res, 200, { ok: true, code });
  } catch (err) {
    console.error('Create promo code failed:', err);
    sendJson(res, 500, { error: 'Could not save that promo code.' });
  }
}

// Admin only: add a client that Nadine Cloud set up by hand (no checkout), so they get the same
// renewal reminders as everyone else. GET lists every order with an end date.
async function handleAdminClients(req, res) {
  if (!isAdminAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
  if (!dbConfigured()) return sendJson(res, 503, { error: 'Database not configured.' });
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await getPool().query(
      `SELECT reference, plan, amount, type, pkg, domain, email, status, created_at, expires_at, reminder_count
       FROM orders WHERE expires_at IS NOT NULL ORDER BY expires_at ASC LIMIT 200`
    );
    return sendJson(res, 200, { orders: result.rows });
  }

  let parsed;
  try {
    parsed = JSON.parse(await readBody(req, 2000));
  } catch {
    return sendJson(res, 400, { error: 'Invalid request.' });
  }
  const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase().slice(0, 200) : '';
  const plan = typeof parsed.plan === 'string' ? parsed.plan.trim().slice(0, 120) : '';
  const type = typeof parsed.type === 'string' ? parsed.type.trim().slice(0, 30) : 'hosting';
  const pkg = typeof parsed.pkg === 'string' ? parsed.pkg.trim().toLowerCase().slice(0, 40) : null;
  const domain = typeof parsed.domain === 'string' ? parsed.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').slice(0, 255) : null;
  const amount = Number(parsed.amount);
  const months = parsed.months == null ? 1 : Number(parsed.months);
  const start = parsed.startDate ? new Date(parsed.startDate) : new Date();
  const explicitExpiry = parsed.expiresAt ? new Date(parsed.expiresAt) : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'A valid customer email is required.' });
  if (!plan) return sendJson(res, 400, { error: 'A plan name is required.' });
  if (!Number.isFinite(amount) || amount <= 0) return sendJson(res, 400, { error: 'A positive amount is required.' });
  if (!Number.isInteger(months) || months < 1 || months > 36) return sendJson(res, 400, { error: 'months must be a whole number from 1 to 36.' });
  if (Number.isNaN(start.getTime())) return sendJson(res, 400, { error: 'startDate is not a valid date.' });
  if (explicitExpiry && Number.isNaN(explicitExpiry.getTime())) return sendJson(res, 400, { error: 'expiresAt is not a valid date.' });

  // expiresAt sets the due date directly (e.g. "the 19th"); otherwise it is startDate plus `months`.
  const expires = explicitExpiry || new Date(start);
  if (!explicitExpiry) expires.setUTCMonth(expires.getUTCMonth() + months);
  const reference = 'MAN-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
  try {
    await getPool().query(
      `INSERT INTO orders (reference, plan, amount, type, pkg, domain, email, status, created_at, paid_at, period, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', $8, $8, $9, $10)`,
      [reference, plan, amount, type, pkg, domain, email, start, months === 1 ? 'mo' : months === 12 ? 'yr' : null, expires]
    );
    sendJson(res, 200, { ok: true, reference, expires_at: expires.toISOString() });
  } catch (err) {
    console.error('Add client failed:', err);
    sendJson(res, 500, { error: 'Could not save that client.' });
  }
}

// Admin only: record a payment a managed client made OUTSIDE the website (cash, MoMo to our number,
// bank). It creates the same kind of paid order an online payment would, moves their due date on,
// stops the reminders and switches the site back on if it was paused.
// Body: { client: "MAN-…" (or domain: "example.com"), months: 1, method: "cash"|"momo"|"bank", amount?: number, note?: "" }
async function handleAdminRecordPayment(req, res) {
  if (!isAdminAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
  if (!dbConfigured()) return sendJson(res, 503, { error: 'Database not configured.' });
  await ensureSchema();
  let p;
  try { p = JSON.parse(await readBody(req, 2000)); } catch { return sendJson(res, 400, { error: 'Invalid request.' }); }

  const months = p.months == null ? 1 : Number(p.months);
  if (!Number.isInteger(months) || months < 1 || months > 24) return sendJson(res, 400, { error: 'months must be 1 to 24.' });
  const method = ['cash', 'momo', 'bank', 'other'].includes(p.method) ? p.method : 'other';

  let ref = typeof p.client === 'string' ? p.client.trim() : '';
  if (!ref && typeof p.domain === 'string') {
    const d = p.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const f = await getPool().query(`SELECT reference FROM orders WHERE type = 'managed' AND status = 'paid' AND reference LIKE 'MAN-%' AND lower(regexp_replace(domain, '^www\\.', '')) = $1 ORDER BY created_at DESC LIMIT 1`, [d]);
    ref = f.rows[0]?.reference || '';
  }
  const managed = await lookupManagedClient(ref);
  if (!managed) return sendJson(res, 404, { error: 'No managed client found for that reference or domain.' });

  const base = await getPool().query(`SELECT plan, amount, pkg, domain, email FROM orders WHERE reference = $1`, [ref]);
  const b = base.rows[0];
  // lookupManagedClient already gives "latest paid period + 1"; extra months add on from there.
  const expires = new Date(managed.nextExpiry);
  if (months > 1) expires.setUTCMonth(expires.getUTCMonth() + (managed.period === 'yr' ? 12 : 1) * (months - 1));
  const amount = Number.isFinite(Number(p.amount)) && Number(p.amount) > 0 ? Number(p.amount) : Number(b.amount) * months;
  const reference = 'MANPAY-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
  await getPool().query(
    `INSERT INTO orders (reference, plan, amount, type, pkg, domain, email, status, created_at, paid_at, period, expires_at, promo_code)
     VALUES ($1, $2, $3, 'managed', $4, $5, $6, 'paid', now(), now(), $7, $8, $9)`,
    [reference, b.plan, amount, b.pkg, b.domain, b.email, managed.period, expires, `manual:${method}`]
  );
  const back = b.domain ? await resumePausedSite(b.domain).catch((err) => ({ ok: false, reason: String(err) })) : { reason: 'no_domain' };
  sendEmail({ subject: `Manual payment recorded — ${b.domain || b.email}`, text: `Recorded ${method} payment of ZMW ${amount} for ${b.plan} (${b.domain || b.email}).\nPaid until: ${expires.toISOString().slice(0, 10)}\nReference: ${reference}\n${back.resumed ? 'Site switched back on.' : ''}${p.note ? `\nNote: ${String(p.note).slice(0, 300)}` : ''}` }).catch(() => {});
  sendJson(res, 200, { ok: true, reference, paidUntil: expires.toISOString(), siteResumed: Boolean(back.resumed) });
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

// Lipila calls this when a card payment finishes (even if the customer closes the page). The body is
// NOT trusted: it is only used to learn which reference to check, and the real result comes from
// asking Lipila directly with our API key.
async function handleLipilaWebhook(req, res) {
  let raw;
  try {
    raw = await readBody(req, 20000);
  } catch {
    res.writeHead(413);
    res.end();
    return;
  }
  let event = null;
  try { event = JSON.parse(raw); } catch { /* ignore */ }
  const src = event && (event.data && typeof event.data === 'object' ? event.data : event);
  const reference = src && typeof src.referenceId === 'string' ? src.referenceId : '';
  if (/^NC[CM]-[A-Za-z0-9-]{1,70}$/.test(reference) && pendingOrders.has(reference)) {
    await resolveCardPayment(reference).catch((err) => console.error('Lipila webhook check failed:', err));
  }
  sendJson(res, 200, { received: true });
}

// Safety net: a customer may close the page before it confirms, and the provider's webhook may not
// arrive. Every few minutes, ask the provider about each unfinished order from the last day, so the
// receipt and our notification always go out.
const SWEEP_EVERY_MS = 3 * 60 * 1000;
async function sweepPendingPayments() {
  const now = Date.now();
  for (const [reference, order] of pendingOrders) {
    if (notified.has(reference) || order.paidAt) continue;
    if (now - order.createdAt < 60 * 1000 || now - order.createdAt > ORDER_TTL_MS) continue;
    try {
      if (isLipilaRef(reference)) {
        const r = await resolveCardPayment(reference);
        if (r.status === 'failed' && reference.startsWith('NCM-')) await notifyOrder(reference, 'failed', r.reason);
        continue;
      }
      const lenco = await lencoRequest(`/collections/status/${encodeURIComponent(reference)}`, { method: 'GET' });
      const data = lenco.body && lenco.body.data;
      if (data && data.status === 'successful') {
        await notifyOrder(reference, 'paid');
      } else if (data && data.status === 'failed') {
        await notifyOrder(reference, 'failed', data.reasonForFailure);
      }
    } catch (err) {
      console.error(`Payment sweep for ${reference} failed (will retry):`, err.message || err);
    }
  }
}
setInterval(() => { sweepPendingPayments().catch(() => {}); }, SWEEP_EVERY_MS).unref();

// ---- "Pay now" bar on a hand-hosted client's own admin screen ----
// The client's admin page loads  <script src="https://www.nadinecloud.com/api/billing-bar.js?client=MAN-…" defer>
// and this returns a small self-contained script with their current billing state baked in, so the amount,
// due date and payment link always come from our records (nothing to update on their site each month).
// Shows only what the client's own payment link already shows (plan, amount, due date).
// The official Nadine Pay logo (360x138 JPEG, white background) for the subscription card.
const NADINE_PAY_LOGO_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAQCAwMDAgQDAwMEBAQEBQkGBQUFBQsICAYJDQsNDQ0LDAwOEBQRDg8TDwwMEhgSExUWFxcXDhEZGxkWGhQWFxb/2wBDAQQEBAUFBQoGBgoWDwwPFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhb/wAARCACKAWgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD78NFBooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiihiApJOAOST2oAKK848f8Ax2+GHhGaS2vfEkN9eR8NaaaPtMgPoSvyqf8AeYV5b4g/a1SWQx+GvB7Fc8Tajc4/8hoD/wChV7WD4dzTGJOlRdu70X42v8jyMZn2W4O/taqv2Wr/AAPpmvnv4yXut/FD4myeDfCixzWugRu8zPJsjeYfKxLexOwe+6r1v8W/E1t+z1qHjzxC9nDeatO1roVtBD5YXqvmcklsEO30QetcHq00ngD4N2eiCRk1/wAYBdQ1Nix8yG1B/dxk9QWPJ+r19DkWT1sLXlUdnU5uSHVJ7zl0uorTzeh8lxPm1HGYSNLVUXHnn0bX2I9bOcrPySvY24vhjpHh/TVPjrxhBourXUg+xQ2x87yMZy0mBnB45GAPU5rYur34jeGtDaHVrGx8eeFJlwznF1GycdTgsO33gwHrXh0dyXkLu7MzdWZsk/Umt7wj4q13w3dfaND1SezYnLKhzG/+8h+U/iK+rxGU4mrG9WaqPtKNl/26170fW8j85wud4XDVP3FKVFfzQleX/b6l7k/S0e1yTxR8JvhX8QWa68Ba5/wh+ty8/wBj6mxazlf0jk5KfgT/ALory660v4s/AXxtHqbW17od1u2JdRjzbO9XrsLD5JFP908jrgGvpfwRD4d+MOo3Ol634ei07WI7YznVtLYReZggfPGcgnLD1/CsH42fBj4jTeE08OJql54h0G2uBcW0cEn72CQKygmJjk8MeFJHPQV51PE06df6nXqWvvCpZ6P+Wez9Jan11GtiK2FWNp0uePSdJNO6/mpvVPu4No7b4AftFaR8R9L/ALIlhs9L8YLH+60+5nMdtfsP+eMmCRn+6QWH+0BmrS/tHeGNG8US+GviDoOs+D9UgbDi6iFxbsD0dJIslkPZtuK+AtbRtL1ya2iud0tnPtE0eVKup6j0II6juOK93+EHxU8PfFdtK+G3xssbrU7sziHQ/ENkrfbI3bjy5toJYHj58EcZYcbq4MZw3gaE5VHBypvflfvR8430ku6evZ9D6bBZ7isRTjBSSn0utJeT6p/00fbHhPxHoHijSl1Lw7rFlqlo3/LW1mWQA+hx0Psea1K+H/jH4A8Ufs9eNrDxB4M8R3S2F8xFvccB9y4JhnQfLIpByMjB54BFfUn7OvxHt/ib8O4tb8lbbULeQ22o2ynKxzAA5XvtYEEZ6Zx2r5zNchWGw0MdhantKEutrNPs1+F+/wAj3Mvzf29eWErw5Ksem6fmmd5RRRXzh7QUUUUAFFFFABRRRQAUUL1ooAD1ooPWigAooooAKPrRRQAUUUUAFFFFABRRRQAUVz3i3x14Q8M5XW9fsraUf8sN++X/AL4XLfpXBX37QOgz3wsvDPh3WdbuG+6kcQTd9By3/jtelhcnx+KjzUqTce+y+92R5WLzzLcHLkrVoqXa939yu/wPXqK8y03xH8Y9bw9n4I0fRYW6Pqt2zMB/uJhvzFb+naZ8RpcNqXirRbf1Sz0lm/8AHnk/pSq5a6OlSrBP/Fzf+kqQUc1VfWlRm135eX/0txOuoqhplpqcGDeaubr1/wBGSMH8qv1wSiouyd/v/Wx6VOTkruLXrb9GwoooqSwooooA5L40fETQPhn4Jm8Ra/IzDd5VpaxY827mIJEaZ+hJJ4ABNfHmteMfjb+0T4guNJ0GC4j0uPBk0+xm8i0gQ9PPlON5OOhPODha6z/gpxNfjxh4UhkZ/wCz/sFw0K/wmbzFDn67dn512/8AwTV1bTrr4S6zpEKxrqFjq7S3IGNzpJGvlsfX7jj/AIDX32X4ejleSLNI01OrLZvVR1t/XW7Pk8ZWq47M3gZTcaa3tu9LnG+DP2OvELxo/iLxfp1jxkxWFs1ww9tzFB+hr0jw/wDsp+ArKIf2jq+uX8g6sJkhX8lXP617vWb4y1q08N+E9S8QXzYttMtJLmXnqEUtge5xj8a8WpxTnWImoqq1fpFJfpf8Tujw7lVKLlKknbq23/wD518fWmneL/2htD+HNmqxeE/AFkJr/LEoqxqrSbj9BEhJ7lqwfE2mf8Jfql78SvHXiWz8JeHtSuCumSXil5riFeEWGEcsAoBz3JJAI5p3wDtXv/Bbajq7N/afxY8SGzZi2HNjGWluSp9GIdPxWuCsW1D49ftfRaZcg/2NY3zxxWynEdnp1s2NigcLv2gH/ak+lfYU6s8LKUIT5VSjZy3e95tX0vOd1d3tybanyFfB08ZFSqwv7SV1HZbWgnbW0YWdlb4t9DqdJ074P6/dLpvhv4rNFqEhCwDV9OeCCduwEhAC596xfF2iax4U8QSaNrlqbe6iAYAHcsino6N/Ep9f611H7Rvww8A6Z4z1rxV491+z8J2N6Nmh6FoFqkl1dBAAZnjwF+ZskgYGCAXBFYvhbWX8Zfsw3Mt/JJcXngbVYrazvJeZXsZ+FjfryD7nAUCu7Lc0qT9nPnc6cmk+ZK6ctrSSSkr6P10fQ8XOuHcPGnUUaahUim1yt2ko73i22nbVd7arqWfhL4m1vw/45sbnQIEuby5cWy2z5xcByBsOOnODntjNeh/t6fGl/BPhFfA+hXaxeJNct83UkLZNhbHhiD2d+VXuAGbjiuU+BT6T4J8Fa78avFaZsNDiaDSYiQDdXB+U7M9ySEB/2mPavm3Q7Dx18efjNdPbr9r1jWJmub2eQlbexh4G52/hiRcKB1OABkmuPM8PhMVmntZpclFe8+8t7ekevm7HpcMUsXgcpcFJ81Z3jHstr+svyVzI+H/hTxD448VWvhvwvpst9f3RwqJ92Ne7u3REHcn+fFfdn7IPwr+HXgB9Sg0zWtN8ReNNNK2+t3sTBmsWcZ8mNf8AlmvUE9WIOcY2j5r8efEfw78LPCNz8OPgrdmS4nGzxF4xAAnvnHBjtiPuRjkBh/wHnLmL9iDwt8Y4fidYeMfBGiSjSWfytTutQcwWl5bMw3puIzIw+8CobDAZ71x5x7fGYOc5T9nT6J6OX+Lsn0W/V9j6DLFRw2IjBR559WtVH07+b+49/wD+Cil5EfDPhnSjzLLezXOM9FSML/OT9Kf/AME7LCeDwf4lv24guL+KKPjjckZLH/x9fyrz39s7X18QfGW4tYpN9vodutkoH/PT78h+uWC/8Br6V/Zz8LN4P+DujaVNF5d1JD9qux382Q7iD7gEL/wGs8ytgOEqGGl8VVp/K/N+Gi+Zz5fU+vcT1q0Phpq3zty/5v5HcUUUV+cn3oUUUUAFFFFABRRRQACigdaKAA0UGigAorF+JHiO38IfD7XPFd2gkh0XTp714923eI4y+3PbOMfjXxen/BQ6+Kgn4TwA46f28f8A4xXTQwdeum6cb2MqlenTtzux91UV8T+Ev+CgtreeKNPs9f8Ah0umaXcXKR3l9Fq5ma1jY4MmzyhuC5yRkcA19qWs0NzbR3FvKksMyB45EYMrqRkEEdQRSr4WtQa9orXHTrQqL3Hckoorw/8AbQ/aFX4D2fh8xeGk12512SceS179n8lIgmWzsbOS4GOKzpUp1ZqEFdsqc4wi5Seh7hRXxV4V/bs8SeJNTFho/wAHY7iXgu39ukRxL/edvJwB+vpWz8TPjL4t8Y2YsiY9GsWQCa2spmbzT33SEBivtgD1zX0GXcLZhjZ25eWPWT/S27/q6Pm844sy7LIe9Lmn0it/n2X9JM9x+Jnxt8J+FnksrKQ61qUeQYLVx5cZ9Hk6D6DJrxnU/iD8UfiZqx0jRjcRJL/y56WDGqr6ySZzj3JA9qf8Ffgvq3i5YdV1nzNL0VuUbbia6H/TMH7q/wC0R9Aa+mfB/hzRPC+jppmhafFaW69Qg+aQ/wB52PLH3Ne3iK2S5D+7w8FWrrq9Un+XyWvdnzeFoZ/xHariajoYd/Zjo5L87eb07RPHvh1+zrZxbb7xrqDXUzfMbKzcrHn0eT7zfhj6mvZfDeg6L4fsRZ6JpdrYQgfdgiC7vqepPua0aK+TzDOMdmEr4io2u2yXy/pn2mWZFl+WxthqST77yfz3/QKKKK8w9YKKKKACigUUAFFFFAHj/wC218OZfiD8F7htNgMms6Cxv7BVHzSgLiWIf7yZwO7KtfHv7IfxLHw2+MllqN5Ns0bVALHVM9FjYjbKf9xsH6bvWv0ir8//ANvD4SHwB8Qz4m0i12+HfEkzSIFHyWl0ctJF7BuXX/gQ/hr7nhbHUq9GplWI+GV+X9V+q87nzGeYWdKpDHUd47/5/oz7/UqyhkIZWGQQcgivDv8AgoF4jm0f4EjR7Nv9K8RajDZIo6sgJkb89ij/AIFWT/wT9+La+MvAf/CEazdb9c8OQqsDOfmu7MfKje5ThD7bT3NVP2r8+I/2rvhJ4JkG+2juH1O4j7FVcMSf+A27fma8nA4GWCzhU6y/h3l6qKck/nZHfisSsVlzlS+3Zfe7M85+KHi2H4d/GzwRodqDLafDqxtILpEb/WSuoe5I/wBoq4/EVk+OtW1f9n/xd4u1jwzpEOoaN8RbRn8PeJUmfFpHKWcohA271Z87TgnYh9RXlfxH8SP4l+JGva+7Z/tLU550weiFztH4LtFdT8Lfi94o8G6RJocQsdY0Kdt0uj6vbi4tiT12qeVz7HGecV+gVcpnPDUnFKUlFKUW7KWvNv0ald9ndpnxFPMo0sRU5rqLd4ta8unLt2tZd1bQs/F7xnofjv4KfDW20/Um1DxZo0D6VqNiUdrqQEL5bDIzIDs6gnlvWu70vwnqHgz4T6T8LSuzxn481WG81C0Dbjp8AGIY5MdG6ufTDemawbb44PpMbv4M+Hngzwreyghr/T9NBuFz12M3C/kaufCXxHP4V8H+Nvjzr88l5e6VAbDR3unMhu9SuMAHJ5O0Muf9lm9KwdDEYPDe0qR5Ywd4xvdubfup20UVJ36vTy1qVWhjsT7Kk25TVpStZKKXvb6ttK3bUo/ta6jfeNfiZ4d/Z2+GafarHwxiCZVbCTXu3MksrdAsSlizdmaT0FZpF5JZn4E/Ai1m1Q3TD/hJfEFuNraxKOGHmdIrRCSBk/N75O6x8Jfh34vuri5+HOglx428TwC78f69MCRoVnK29bHcP+W0md8qggkkJ0ViPtD4KfDPwr8LvCEeg+GLIJnDXd5IAZ7yTH35G/ko4A4Ar5rFZlSwdKMfjktUu8nq5y9XrFfPtb6elgamIm7e7HZvsukY/Ld/LueS/s9/sneEvB6wax438jxLrS4YQMn+g2reixn/AFhH95+PRRXtnxG8QWvg7wHf626oq2Nvi3iAwGkPyxoB7sQPpW9Xz/8Atcatq2r6xa+FtN06/ms7EC4unitnZZJiPlGQMEKpz9W9q8jL4185zKEcTO8d32SW6Xa+3zLznFUskyupUoQ97aNt3J7ett/keZfATwjP46+L1u+pL58EEx1HUpGH+sw27B/3nIH0zX2bXnP7M/gw+FPAK3V5CY9S1cie4DLho0x+7jPpgEkj1Y16NW3FearH49xg/cp+6v1f3/gkc/B2VzwOWRnVX7yp7z767L7vxbCiiivmT6sKKKKACiiigAooooAKKB1ooADRQetFAHhP/BSTxD/wj/7IfiRFfbLrD2+mx89fMlUsP++FevyzxX3n/wAFjPEXk+DfBfhOOX5r2/n1CZAf4YoxGpP4zN+VfBea+syany4W/d/8A8XMJXq27C4r9C/+CWnxoPijwPJ8K/EF5u1fw3D5mlSSN81zY5xs92iJC/7rJ6GvzzBrpfg74p8R+C/iloXibwik02s2N6htLaFC7XZb5Wg2rywkUlMDn5q6sdhliKLj16GOGqulUT6H7PV8T/8ABRbwjc+PfjzolveagtnouhaMFbynV555pZWZlVf4BtWPLN68A9vYfi98fBZ6Db6b4atJLbXLq2R74XAVjpLsoLQnGVaZSSDjKqR3PFeCaXaar4j1uQRGS7u5t09xPPLgKo5eWWRjhVA5LMcCunhvhmp/v2MfJBLRPRtd32X4vy3Pm+KOLlTbwOXrnqvRtapPsl1l+C89jK8K6BY6XawaN4f0wRK7BY4LdCzzOeBnu7H35r6W+BfwNg0/yNe8awpPecPBppw0cHoZezN/s9B79vlaH4l2mqfF7w58LvhdetOdZ1m2stY8UR5R54jKvmw2Wfmjh2ht0vDyDptXr+h+uappmiaRPqmr6ha6fYWqb57m6mWKKJfVmYgAVfEnEdVQWFwXuwfXZteXZfi/Iy4Z4PhGf13Mvfqb2eqT7vu/wXn0tgADAHAor558aftrfAfQLx7W11nVNdeM4LaVpzPGT7PIUU/UEisfR/28fgpd3AjvbPxVpyk482fTUdR7ny5GP6V8OsDiWr8jP0T29JO3Mj6eormvhb8QfBfxG8P/ANt+CfEVnrFmrBZGgY74WP8ADIhwyH2YCtrXNT03RdHuNV1i/trCxtIzJcXV1KscUSjuzNgAVzuMk+VrU0umrluqfiC/i0rQb7VJziKxtpLiQn+6ilj+gr578ZftwfA3RNSeysbrXNe8tsGfTNP/AHJ+jSsm76gEVnfEr9qj4W+Pf2afHv8AwieuTWusx6DcRppupQ/Z7lvMHlboxkq+DJztYkd66Y4LEXV4NJmTrU9bPU+el/by+NTtuTTvCQRuVH9nTZA9/wB9X0Tof7RviTQf2M2+NHjGLTdV1HUrhbfStOsLR7WFJmZlVJHZ3LAbWZiMdCAM81+a64UYHQV9x+D5fhHo/wDwTp8I+EPjJq95p1v4xa6vtNmtLWSaa3lSdnSVQqsBtDJ1GCGI717uNwmHhGCjDdrbe3U87D1qs5NuWiRw/gf9vL4o2XjGG78W6boepaG8o+1WdnaNBLFHnkxPvOWA6Bs5xjjrX6KabdwX+m299atuguoVlibGMqwBBx9CK/Lv4Y+AP2bn+Imnxa98ZdU17T5b2KOHS7TwpdWsl6zOAsckhLBQSQDtHIJ5HWvuj4nftMfBj4aeMrnwX4j124s9S0xIhLb2+mzSpEGjVkUMikfdZeB0rgzChCU4rD03fro0dWFqSUW6sl957FRXj/w//ag+CvjAao+meLfs8GjWf2y+udQtJLWGKLeEHzyAAsWYAKOT2FcR4g/bp+CGnam1pZr4k1aNG2m6s9MCxMPVfNdGI/CvOjg8RJtKDv6HS61NK7kfS9c/8UPB2i+PvAuoeFPEFv5tlqEW0sPvwuOUkQ9mU4IPt6VynwH+Pfww+LzS23g7Xt2owJ5k2mXkRgukT+8Eb7y+pUkDvXpdR+9oVE9YyWvmN8lSLW6Z+YGu2Pjb9n748IgfytW0OcTWlxgiHULdsgN7xyLlWHY5HUV9O6pcQ/EHxLp37SHh68VtK0rwZqdrfWUjgS6XeJBKQrf3smVhn2U9G4m/ay+K/wCytf39rpnxBvx4j1LRpW2QaGJJZYcjDRtLEVTBIGVL9R0FcD8MP2kf2UPCkWp6bovgzxVpGn63D9n1GKe3a4t7lMEfPGZ35wSMgZwcV9niM0+uUIVnRkqyVm0lZxe63v5rTR6bHz9HAPD1JU1NezbulfVPofMdncERrk84GavQXWBXuWufs/eCvHnhO78X/s7eOIvEcNtl59BupALmHPOxSQrK3XCyKM4+8a+eZJJIJnhmR45ImKSI6lWRgcEEHoQQRivuMBmmHxkXKk9Vuno16o+SxuW1aErVFvs+jN5Lvjjn0HrXrPijxXptt4X8B+GPDsSXFn4QuDq199qh3QajqbjIcoTlkiLMFzjdxxgc+a+HdCmXwtbeJbptsN5dS29khHMvlBfMkH+yC6r9d3pWgrBVJ9BXuUMtw+OpxqVlzRTdl0vqte9tV2PFqYqvgZyjR92TSu+tt9PXQ9R+F/jn4seHdEnXwfb3rW2oXkt3d3UejC5e8uHYmSSSYoS7Z9TxjAxXTr8Wv2hT1j1X/wAJ0f8Axuvpf4A6CfDPwY8OaOy7ZY7BJJh/00k/ePn/AIE5re1jxF4f0q6FtquvabYzMoYRXV5HExX1wxBxwea/N8VxPgHiqlOll1Odm0nZXaT3+E+0o5BjPq8J1MdOLaV1d2TfTc+Rrz4y/Heyi829nvreMdXm0JEH5mOq0P7QHxWcZ/4SOE/9uEH/AMTX2Zp97ZajZi5sLu3vLd8gSQSrIjfiMivHP2pvhPoOp+C9Q8V6Lp8NjrGmxNczG3QIt3GvLh1HBYDJDdeMHOeNst4hyXEYmOHxOAhDmdrpRdn5rlVvU48zyLN6OGlXw2OnOyva7Wnk7s8ej+PnxSPXxDD/AOAEP/xNSr8efigeviCH/wAAIf8A4mvLbcPLIscSNJI5wiICWY+gA5NdXpnw88e3duJrfwbrbxsOGNk65/MCvt6+U5LR1qUacfWMUfAQzPO6v8KtUl6Sk/yOuj+OvxOOCdeh/wDACH/4mrEfxw+Jbdddh/8AAGH/AOJrz7WNE1vQ5Vi1rR77TmY4UXVu0e76EjB/CptK0nWL+38+w0m/uod20yQWryLn0yoIzzWEspyjk51Rp278sbHLUzbO1Nw+sVObtzSv91z0SH41/Ec/e1yL/wAAov8A4mrMfxm+IZH/ACG4v/AKL/4mvOrrTtU09UbUNNvLQSHCG4t3jDH23AZqfS7e7vbgQWVrPcy4J8uGIu2B1OBziueWUZZbmVGFv8Mf8jiqZ1ncZcv1mpftzS/zPTNJ+N3jq1ule6uLO/jz80UtsqZHsUwRXuXwu8baZ430Nr2yVoLiAhLq1c5aFj057qecGvlWTRNbggaa40bUIo4xl5JLSRVUepJGBXd/ss3s1r8TmiV9tvNYS/aM9Aq4YE/Q/wA6+bz7I8BUwU62Hioygr+7s7dGlofScJ8U5tRzSlhcXOU4VHa0rtq+zTeu+/Sx9K0V4ZH+1l8K3kKpF4gYAkbhYLg+4+erMX7Unwyk+7Dr3/gCv/xdfHvhfO1vhZ/cfr8s8yyO9eP3ntQorzf4d/HDwT4z8V23h7R01Vby6DmPz7QKnyqWOSGOOAaK8vGYHE4OoqeIg4ytez7HZhcZh8XBzw81JXtddz0g9aKD96gVynSfmt/wVg8RHV/2notGV8x+H9FggIB6SSlpm/8AHWj/ACr5mhhmubiO2t13TTuI4gO7McAfmRXfftVeIv8AhK/2kPG2urJ5kc+tzxwtnP7uJvKTH/AYxW5+yv8ADbU9a8YaP4+1uFNN8E6DqsNze6neEql20Th/s9uv3ppWKgYUEL1YivuMNB08PCCV3ZadW+yPnq0lKrKcnZLd9kdp+1T+y34m8I/FrRdJ8CaLcahpniOzRoCpPl2VxFGouRNK3yxxg/vNzEABiP4a3vh34W8O/CyxaHw7dR6t4nmjMd94lVCFgBGGhsAeUTqDMcO/bavB9D+O3xp1r4g3T6fZ+Zpvh9W+S0VvnucHhpiOvrtHA9zzXH3lvo/hTwlF4y+IN7NpWhzEiwt4kBvtadcEx2qHtyN0rfIuR1PFfT5bk8cDhY4nN5K62jvr0v8AzS8lp1d+nxebZ1XzHEPB5RF2e8ttOtv5Y929fTrb8M6OdRhuL26v7TSdIsAp1DVr+Ty7a0UngFj9526Kg+Zj09a8R+PnxpbxLps3gzwRBc6T4R3j7Q8mFvNcZTxJckfdTPKwg7V6nc3I5z44fFbW/iPewWr20ej+G9NYnStBtHJgts8GR2PM0xH3pG57DA4rgq4cxzOtj5+9pBbR/V935bLzep6eTZDh8sjzfFVe8u3lHsvPd+S0PoD/AIJl+Hv7e/a60W5kj3xaHZ3Wovx0Ij8pD/31KPyr0j/gopo/7QPxB+JVzaW/gLxHL4I0Z9mmQ2MX2iO6YD5rqRIiSWJztDD5VA4BJyf8EkbTTtGn+IfxG1u6hstN0bTYbaW7mOFiQl5pWJ9AI0/Oqnx4/bu8Zarq1xYfCywttD0lGKxajfW4nvLgdN4RvkiB6gEMfUjpXylT208e3TinypLXZH1sOSOGSm7XPNP2f/2U/in8Vba7vorWHw1p9nMYGuNcilieWQAEqkQXecZGScDsCSDXK/tLfBfxT8EfGVroHia60+8+32pubO7sZGMcqBtpBVgGVgexGOeCa1bH4tftKePbuSHSPGPjzWZM4eLR/Nwp9CIFAWuD+J9t43svF01p8Qv7aXXY4kaaPWpZHuURhuTdvJYAg5A967qft/a+/JW7I5pql7P3Yv1PUf8AgnP4l1jw/wDtaeGrXS55Vt9deSw1GBSds8JidxuHfayqwPbB9TV/9vr4+al8WPiTd+HtIvnTwboNy0NlBG5CX8qEq1zJ/eyQQgPAXnqxrhf2a7m60XWPFfjC0LJP4b8IahPbyj/lnNOFs42HuDckj6V5wqgKFHYcUKhCWKdVrVJL5j9rKNBQvudd8Hfhj45+KfiKTRvA2gTapcQIJLiTescNup4BkkYhVzg4GcnBwDipfjX8KfHnwo1630nx3obafNdRmW0lSVZobhRgMUkUkEjIyOCMjI5Ffon/AMEzfCVl4a/ZR0XUooUW88SSzaldyhfmfLskYJ9BGi4HufWvJP8Agspqtsuj+A9DXablrm8vCf4lRUjT8iW/8drjp5jOpjPYpe7qvPQ3lhIxoc7ep8Jvu2HaMtjgepr6T/4KKbNCk+F3w8iO0eF/BVv50efuyy4VvxPk5/GvFfgjoB8VfGTwn4bVdw1TW7SBx/sGVd//AI6Gr0T/AIKIa6Ne/a+8Wujbo9NeDT4wOi+VCgYf99l67anvYqC7Jv8AQ54aUJPvZGB+xpoZ8R/tUeBNMMfmRrrUV1IuP4YAZjn/AL91U/ay13/hI/2mfHWro++OXXbiKJvVIm8pf0jFek/8EyrSOD48ax4xuFH2fwh4WvtRcnoCQqD/AMdMn5V88313Nf301/Ocy3crTyE92clj+pNEfexUn2SX36hLSgvNm58NPBPi34g+Jk8N+DNEu9X1CRfMMEGAqKDjfIxIVFBP3mIGT71ofGT4X+O/hXrsGkeO9Bk0u4u4jLbN5qSxTqDglJEJUkEjIzkZHHIr7f8A+CQvha3sPgjrni1oFF3restbrLt+byIEUAA+m95a8+/4LIa0svjTwP4dXbutLC6vX9f3siIv/opq5Y4+csb7BL3TWWFisP7RvU+XvgLr2qeGvjV4T1vRZpIr211q1CbDy6tKqOh9Qysykdwa+n/+ClH7R2q3fiq++EXgjUpbLTtOPk6/e2zlZLubHzWysOVROj4+82V6A5+bP2Z7ZZ/jx4anePzI9Mu21SRSM5W0ie5PH/bGuN1O+u9V1K51S/maa7vpnubiVjlnkdizMfckmumeHhVxKnJfCvzMo1ZQotJ7s7D4C/Cbxp8XvGJ8N+DLCOR4YxLd3Vw/l29nGTgNI2D1PAUAk4OBwcd7+0h+yp8Q/g54Pj8VapfaXrOkCVIbqfTjIGtGY4UujqDtJwNw7kZxmvPPhl46+Jvgqzuk8Ba9rukwX7q10dNRtszKCBuIU5xk/ma1PF3xU+N3inw9c6B4k8W+LNU0u8Ci4s7lXaOUKwYbht5wyg/UCql9Z9snGS5O3UIql7PVPmMj4H/ETXvhX8S9O8aeH7h45rKQfaoAxCXlvkeZC47hhnHocEciv0g+M37OXw3+MWjr4r0dW0DWtWgS8j1OzjGy5Mihg08P3XyCMkYb3r8uptM1Xym/4lV+flPH2STn9K/YnwLcp4P/AGe9FutVJRdC8MW73W7gjyrZSw+vymuLMK1ajWp1MNK03pp18vM3w1OFSnKFZXj5nwx8aLK38N+JrPwJZ3Czw+DtOi0t5kGFmuOZbiQDtumkf8APSqnwl0M+KPiboHh/G5dQ1GKOUY/5Zhtzn/vkNXMapqdzq+s3mrXjlri/uJLiZj3d2LH9TXuv/BPfQTqvxmuNakTMWh6c7hiOBLKfLX/x3zPyr9px0/7JyOcm/ehDfvK2/wA5M/NaNH6/mkVbSUvw/wCAj7XUAAKoAUDAA7V8D/tZa/F4g/aA8QTqytFYyrYRcg8RLtbH/A99ffFVW0rTDIZG02zLk7ixgXJPrnFfiPDOe08mxU8RKlztqy1tbVN9H2P0fPMqnmdCNGNTlSd9r/qj51/4J8eHPEWn2eua7ew3FrpGoJFHaRzAqtxIpYtIqnsAQN3fPtXsf7QGs2+hfBrxDezuq+bYvbRbjjdJKPLUfm35A1f8aePPB3hGyefxB4hsLPYOITKGlb2WNcsfwFfN3jPxR4g/aM+Ilt4S8MRSab4fsC1w0lwM8D5fPlA784VAf4jk9cepSo4nPM1lmmIh7OgmpSb2SjbS/Vu3T/gHmV61HKcuWX0Jc9VpqK63fW3RK56z+zro/wAL/CnheH+x/EOg6lqxi3X2oC6jaUtjLBcnKIOcDjgZPNT2P7Qvw2vPFMOiW19fSG4uFgju/sh+zszNtHJO7BJHO3FVPDn7Pvwu8N6UbrXbc6o0Kbp7zUrkxxLjq21SqqPrn61c8C3XwKk8YWukeE7Tw7Pq5LNB9jsRIy7AWLeZtIGMdc1z4j+zcVWr4h+2rvV81kkvNvXTtorLoXh1mGGpUaC9lR8rtt+SWmvzd31PRfEOkadrukT6Vq1nFd2lwpWSKVcg+49COxHIrxr9ji6Sw1Lxh4QW4aZdN1IyQEn7y7miJ/8AIa/nXsXi7VI9D8K6lrMxGywtJbg577VJx+lfK37HmuSW3xsSOeT/AJDNrPFIT/E/+tH45U/nU5LhKuJyXHa+6lFr1V2/wRjnmLpYbO8A7e83JN+UrJL72erftqWnmfD3TL7va6mFP0eNx/MCpf2R/CB0nwhJ4nvYsXmsgeQGHMduD8v/AH0fm+gWu3+LXhKPxr4Xi0SZwkJvoJpiTz5aPlwvuVyB9aZ8VfFdh4B8Ay6gEjEkaC30+2HAeTGFUD+6AMn2FYUcxq1spp5XQ1nOTv6aNL5vf0HXyqjQzqrnOJdoQgretmm/ktF5s8z/AGrPHG+dfBWnT/Km2XUmRup6pEf0Y/8AAfesf4H/APCN6H4B8ReKPGOqrpOmXwGkJd7irDep3hCASGOVwR02+1eS3d9cXt5PfXkzTXFw7SzSMfmdickn8a9w8bfCrQ/Evwf8MeDtb8aw+HWsf+Jjcwkxb55pFPLB2BAXc4H/ANavrsVhMLluBo4GpNxjN+9JK701k0kn1SS00TR8JkuIxOecQVszcb+zi+VN6K/uxX3Nt+aZw9n4J/ZKAAh8YXJ9P9Pm/wDiK0Lfwb+y0v8Aq/Fdwf8At+m/+IqC1/Zm8BxcL8WY2/C3/wDi61dK/Zt8Iz3CwWfxJNzK3SOKOFmP4B60qZjlyV/7TxH3S/8AkD6Wrh8xk7RwNF/Nf/JHZ/APw78GdP8AF8114C1U3+qpasCJLl3McRYbioYAddoJ9/eitv4I/CPS/hzqF9fW+qXGo3N7EsW+WJUEaA5IAHqcfkKK/Pc8xFKvjXKlWlUjZe9Lf8lofX5JQrUcGo1qUacrv3Y7fm9T0Q9az/Fl1e2XhXU73TbWS6vbeymktreIZeaRUJVFHqSAPxrH+InjRvDMRSy8K+IvEF4w+S30rT2dc9t0rYRR+JPtXhHxAi/ad+Ke+wtfD8PgvQ5jtaFtQSOWRT/z1kUmQ8dQqqPUGtMtyWeLtOrVhSp/zTkl90b3f3W8zfF49UE1CEpy7RX5vZHzH4X+EvhHwJcf2p8V7mHxP4oLGX/hFtOus2dpKTn/AE65T75yTmGI+zNiuwin8ZfE/wATW9jY2Ml/PCgis9P0+3EVrYRdkjjXCQxj1OPck17j8Nf2RNNs3S48a+I5L/by1lpqGGM+xkb5iPoFr6E8G+F/D3hPSF0zw3o9rptqvVII8Fz6s3Vj7kk19rPiPJsni/qCdet/O1ZL0628lv1kz5WpkmZZpJfW5eypfyrVv18/N7djxv4G/s5aboZh1jxy0OqaguHjsE5tYD/t5/1pHv8AL7HrXQftlfByz+MXwTu9At4YY9b00G70KcgKIp1X/Vk9kdcoewyD/CK9aor4PHZzjsdiViK87yW3ZeSX9X6n1OByvCYGj7GhCye/d+rPw+vLa5sr2azvLeS3ubaVop4ZF2vE6khlYdiCCD9Kjr9D/wBqz9jF/iZ8XLrxt4S8TafoP9qxq+pWtzaPIJLkcGVCpGNy7dwP8QJ7mvN/+He3jH/opGh/+C6b/wCKr26eaYWUE5Ss/mcksFVUnZaHO6NpOo+HP+CUWsaraLIh8V+KUa8dOM2qzJEAT/dLwgf8Cr5ZYkqQOCRwa/X3wH8HtD079mPT/g14lWLVtNi0kWN+yKYxO5JZpE7qd5LKeoIBr5L8ff8ABPrxXBq8reCfHWk3mns2Yo9YikgnjX0Zo1ZXI9QFz6CuTB5jRUpqbtdtm+IwtRqPLrZHW/B/9sb4KfD/AOAei6DpfhnWYNU0zTo4pNKtbRFjluAoDyGcnaQ7AsXOW56Z4r4v+MvjjVPiR8UNZ8b61HHFeazc+a0URJSFAoRI1J5IVFUZ74z3r67+En/BP2eLWIbv4leNLaexiYM+naJG4M4/utO4BUeu1c+hHWo/H37AOraj421bUPDXjbRtL0e6vZJdPsHsZXa1hLZWItu52jjPfFOhiMvoVZOMtX11CpSxNSCTR5R+yP4Jl8V/s1/HKSw2Taoui2iW1sGBkdIpTcvheuD5Kj3PFfPKkFQynIIyDX6a/sQ/sxaj8DfFmva7rHiWw1mbVLGOzgFravH5Khy753E5yQn5Vw/7RX7Cen+I/E114h+GOv2uhNfStLPpF/EzWqOxyTC6ZaNSf4CrAdsDinSzKhGvNOXuuzT+QqmEm6UbLVHmX7LP7Z3/AAq74QWfgXxB4OuNaXSN66bdWl2sR8pmLiOQMD90sQGGeMccc+F/tHfFjxH8ZPiTN4u8RCODEQt7GxhYmKygBJCKTyTkklu5PYYA+gPCf/BPz4g3OqIviXxr4d0+xDjzHsUmupivfarKig/U10njz/gn5dXPiWR/B/jiysNHWGJIYdQtpJrgsEAkd3UhSWfccAAAEDtVQxGXUqznF6vrqKVLFTpqL2R4r/wTb0SPWf2vPDs0y/udHgutRkJ6LshZVJ/4FIteTfFHXH8TfEzxF4idyx1bV7q7yfR5WYfoRX33+y3+yV4i+EmreKdWm8ZaXf32s+HZ9K06SKzkQWkshB81sscgFV4HvXlsf/BPPxiqKp+JWh8DGf7Nm/8AiqcMfhvrEpuelklv53CWFq+yUUtTiv2WyPDH7GPxv8bk7J7+3ttAtX75kyrgf+BC/lXzacAewr9GB+yR4it/2Rf+FO2XjPTI7268Sf2xf6i1pJ5cqBcLGEDZyNsZyT/Ca8uk/wCCefjBlZT8StDG4Y/5Bs3/AMVRQx+GUpylPd+e1kgqYWq1FJbI+ov2C/D58Ofsj+CbNo/LlutP+3y+5uHabP5OK+Gv+CnmvDWf2utYtkk3x6LYWlgvPQiPzWH/AH1Ma/TPwjpMOgeFNL0O3O6LS7KG0jIGMrGgQcfRa+N/jP8AsReM/Hnxa8R+M2+IWi241zU5buOFrCVmiRj8iE7uSFCj8K8zL8RSjip1asrXv+LOrE0pypKEUeK/8E1/CMHi/wCPOrWc80cXl+FNQSMuwzunRbfKjqcLK5OK8J8TaNqXhvxFfeHtZt3t9R0q5e0u4XGCkiMVI/T8iDX6H/sc/sk6p8HPi83jXW/Fem6yI9NmtbWG2s3jaOSQplyWY8bVYf8AAq7P9qj9ljwN8Z7w68bibw/4nEYQ6paRh1uQBhRPEcB8DgMCGA4yQAK7v7UowxUne8Wlr2sc/wBTnKils0fLP7Cv7V2j/CHwTceB/GeiX91pIu3u7G901VeWEvjfG8bMoZdwyCDkZIx0ro/2hP28dX1SO3sPhDpk+ixxziSfU9VgikmmVTny1hyyqp7kkkjgY61iat+wB8U4borp3i3wneQZ+WSV7iBse6+W2PzNdN8Ov+CfGptfRzePPiBax2qkGS10S2ZpJB6CWXAX67DROWWe0daTu/n+QRWL5eRKx6X+xP8AtW698YfFC+Dde8CTLqUNu01zq+lNmyiQDhpkc7otx4GGbJPAABx3n7euvzaJ+zrqEFuSH1m7h08tnojEu/5rGR+Nd38HPhp4L+FvhNfD3gnRIdOtSwedwS810+Mb5ZD8zt9enQYHFY/7UngG4+I/wZ1Lw/YFRqMTJd2AZsK80eSEJ7bgWXPbdmsMqxGDhnOHqzXLTU4t/fuzTGU60sDUhF3k0z86I2xX2v8A8E5fD5sPhFqPiGVMSa3qTBDjrFCNg/8AHzJXxTqFpeafqE+n6hazWt3ayGOeCdCskTjgqynkGvpL4T/tTaV4H+HGj+E7bwFcXC6XarC0w1NV81+S748s4yxJxnvX7Txpg8fj8rWHwMOdykr6pe6terXWx8BkNbDYXGOriZctk7aPfbp5XPbP23PEknh74B30dvO0Nzq1xFYxMjbWALb3wR/sIw/GviNNV1Jxh9SvGHoblz/WvQ/2mPjkfi1YaPZW+gyaRBpk0kzq92JvOdgFU8KMYAb/AL6ryqF6jg/JKuW5WqeJhapKTbWjt0Wqutlf5nJxLj44zG81GV4JJLdeb/M0UILbjyx6k9T+NfTP/BPG/wBMj1DxNp0kiLqU6W8sKt954l3htvrgsufqK+YIXrS0XUb7TNQiv9NvLizuoG3RTwSFHQ+oYcivSz3K/wC08vqYTm5ea2vo018tDxssxv8AZ+NhieW/L09Vb9T9AfjV4Hj+IXgSbw3Lqk2nCSZJhNGm8EochWXI3L7ZHIB7VzXwL+D3hr4cazLcJqzaprstsRvlCx+TCWGSkQJIBIwWJPTHHNfMy/HL4rNYfZD4wudmMbxBD5n/AH3szWLofjvxjpWsXerWHiTUIr6/AW6ujLvkmAOQCzZPGTXwGH4OzungamD+tRjTetlfV6buyaVump9RiOKsonjIYv6tJzWl3bReSu039x9fftXTXkPwG1w2ag7xEk7Fgu2IyqGx6+mPevlH4Q30+n/FDw9eWsbzSx6nBiOMZZwXCkAd8gmtzwd4i8d/E7xZpfgrWPE2oXmn6ldx/aopGXb5aHexOAOgU498V9ZaH8PvA2gax/bWl+GdNsbuNTi4SIAxjHJXPC8dxisViKfC2Bll+JXtJ1OZ+7tZpRV7662eyJnhanE+Nhj8O/Zwp8q97e6bk7W06rdnTOVVSzMFVeSSeAPevj/9oTx6fG/jqRrOUnSdNLQWIzxJz80v/AiOPYCvQ/2nfjFpo0W48H+E79bq6ugYtQvIGzHDH0aNGH3mboSOAM9+nztb7nkWKNWZ2IVEUZLE9AAOpquDeH50IvHYiNpPSKfRdX89l5X7nFx3n8cRbL8NK8VrJrq+i+W787djtvgvof8AwkvxL0jSWTdC1wJrgdvLj+dvzxj8a7b46fs5+OfiF8WNU8WHxFoMVvcskdpBKJS0UKKFVThcZ4JOO5Ndz+yx8NrzwvZTeJNfgMOp30QjgtnHzW0OQTu9GYgcdgAOpIr2GvNzjiuvhs1dTASVox5b2TWru7fclfyPZ4U4XhDKWsZFqVR81tnZK0b/AIv5nyPa/sm+MYsZ8R+Hz9Fl/wDia7/4E/ALU/BfxCtfEetatp10ljG/kRWqvkyMpXJLAYABb8cV7zRXk4vjTOMVRnRqTXLJNO0UtHue7R4TyqjXjWjB80XdavdB3ooHWivlT6QGooPWigAooooAKKK4/wDaA1Xw/o/wX8SXPinXrjQtJm06W1uNTto3eW0Eq+UJEVAWLAuCMCqjHmkl3E3ZXL2iePvA2s+JJvD2keMtBv8AVrckS2FrqUMk6Y65jVi3GOeOKl8UeN/Bnhm9Sz8R+LtC0e5lj8xIdQ1KK3kZMkbgrsCRkEZ9jXyP+wC2l6f8bF8DaPp/gjxrpXh3RZLix8d6HpBt7q0MjBfIuJSPnkcE8ZJA7nkDmv2ivEmg6v8AtzeMLvVfFngDSofDmkWuk2y+M9HbUreViolk8uIcB1Zjlj0DY7mu/wCox9s4XdkrmHtnyp9bn3OniTw8/hf/AISZde0xtF8ozf2mLtPsvlg4L+bnbtz3zio/+Eq8MbdLI8R6TjXDjSj9uj/4mHGf3HP7zgg/LnrXhP7dT2uj/sf2PgzQoLOBfFGoaZodnBYW628JEkquwjjHCqQjcdga8l/Z00LV4P2y/C/wf1iFprT4Mxaxc2M8hyZ7a4ZDbOR2IWZPyx2qKeFjOk6nNtf7l/wdCpVWpKNj7M8VeMvCHhm4ht/EnirRdHmuFLwx6hqEVu0ig4JUOwyM+lathd2t9ZRXljcw3NvOoeKaGQOkinoVYcEfSvjX49eLvhW/7fuqSfFqXTrjQvCfgxbS30+8tDdfa7uZhLsji2ndJskOPQ45Feq/8E5PC/iLwv8As77Nf0660qLVNYutQ0rS7rPmWNnIV8tGU8rnDNj/AGs9TU1MKoUVO+un49vQI1G5tHvdFeY/tQRfFCXwzpo+GTSiYXn/ABMBbPGs5j2/LtL8bd3XHPTtmu78GjWV8JaaviIxNqwtIxfGLG0y7Ruxjjrnpx6U6mD5MJTxPtIvmbXKn7yt1a6J9DOGK5sTKhyNWSfNb3Xfon3IfFni7wp4WEJ8TeJtH0X7QGMP9o38Vv5oXGdu9hnGRnHqKvaJqmmazpcepaPqNpqFlMMxXNpOssTjp8rKSDXyB+2Ade8T/tkW8Xhvw74d8SN8OvA1zq91pevo0trN5hYMvlqPmk2mMqDgZA5FdT+yLNofgD/gn9q3j3SNW+1LqFnqOvzhIhDFaXJQqbeOME7VRowo5568ZxTlhEqMZ395209TRVW5tW0R7zpvxI+HeoatFpdh498M3V9PL5UVrBrEDzSPnG1UDZJ9gK1fFXiLQPDGktqniTW9O0iyU7TcX90kEefTc5Az7V8Vf8E2bPwxNqXhyym8Q/DXVtSjtJ9QNhH4eL6/azE7svesMDZu7dBgD1rqPjNrXgi3/b8uX+PslvD4T0nw3HJ4Qj1aBpNOlnYqZn27SjSZ8wcj+EdwtVLBxVZ003or7av0EqrcE+59YaFruh61oi6zo+sWGoac6llvLW5SWEgdTvUkcd+aytF+Ivw+1jVodL0jx14b1C+uCRDa2mrQSzSEAkhUViTwCeB0FeYfErXfAXg79hjxR4p+GunWemaBfaJc3GnpbWjWqtLc5jD+WwDAl3HUdgOgFeWf8E37Dwp9t0qytvEHw01q+0rQftKwaV4eKa1ZSOyhmnvGGW2iRozjrkAcCs44aLpTqO+jt/w5TqPmUT65m1rR4vEEWgy6tYpqs8JnisGuEFxJEDgusedxUHjOMU3T9d0TUNVvdMsNYsLq+00qL61gukeW1LDIEiA5TODjIFeB/Cvy/Fn/AAUW+I3iEKskPg3w7ZaHBIedkkpEzgenIcfjXlv7QGp+IfCP7X3xC8G+CbeZfEXxc0LS7PSpI1wlu7Fop7hj2CRJK2ex57U4YVSlyX1sn+X5ITq2V7dT7I0/xV4YvvDtxr9l4j0m50m0L/aNQhvo3t4dn390gO0be+TxVXwx488D+JNROn+HfGWgatdhDIbew1OGeQKMZbajE4GRz7ivAP2xtI0T4M/8E97jwHoO2G3kjtdGik+40zySq00rY/icLKx+pq5+wLaeGG/tQ6Vr/wANPEF1pFja2i3fhLw6bK5hQhs/aZ2G6Uv5an3KknrS+rw9jKqm7Xsh+0fOon0nRXJfHJPGcnww1NPALAa6VXyPmVX27hv2FvlD7c4z/PFQ/AVPGsfw0s18fsW1je+fMZTIIs/IJCvBbr+mec1X1NfUvrXtI/Fy8t/e2ve3bpcyeKaxSw/I9Vfmt7u9rX7m/wCKvEvhzwxax3XiTxBpejwTPsil1G8jt1dsZwpcgE45wKm8P6zo+vaYupaHqtjqdm5IW5srhJomI6gMpIJr5h/bYt9a8a/tTfC/wF4e0TRNcu9Js73X5tO1qQrZSrxGvnYVjt+RsDBycDpWp8PNCP7KXwL8e+P/ABjc6PJqGuai2oRaNoiNFYQTsNkFpbK3zHLNgnAwo6YXNT9Wj7KLv7z2Xzsa+0fM1bRHqvj7wb8H/iN4qn0bxBa6DqfiGzhDTww3apqEEfGC4jYSBfmXG7j5h61yFv8AAP8AZ4m1S+02C1tZL3SkD39smvSmW0UjIaVPMygxzlgK8E/ZhtvFXhD9sHwTeePPC+raL4i8baVq/wDbF9qUsTf2rcu32gGMRsSiIqxoFbBHHFdl+1d4IuNb/bS8O+F/C+vTaLL8TvDktj4tNqg8x7C2cSFlbs7ohiz6DHQmvWo47MMM1QpYqcYWurSdtN9n5M4qmFwta850Yt36pX/I9P8ADXwA+AXiDSU1TQNPh1SxkZljurLWpZonIOCA6yEHBBHWtAfs0fB0dPDVx/4Mrj/4uvSvCGgaP4W8L2Hh3QLCGw0zTLdbe0toVwsaKMAe57knkkknmvL/AI2QfGuT4xaBJ4HlK+Gwkf2kI8YjEnmHzPPDfMV2bcY98c1rgc1zfGV3S+vygrN3lUklp033Zz4zB4DD0vafVVPVK0YpvUtL+zZ8IF6eG5//AAZT/wDxdZ//AApL4CJ4mHhsw2o1lofOXTTrkn2ox/3xF5m7bwecYr2jvXwX40m8eah+114m+Mvw80SbXNR0Txcvg+yto0LxDdp8kJkkKg7Y0mKsxPAzyRmsMPnOb1nK+LmrL+eW/TqaVMry6Nv9ng/+3V/kfR2k/Bf4DanrF7pGmRWt5f6YwW+tLbXJJJrUnoJEWQlDweuOlVPEHwz/AGctA1yDRNbv9J03UrnHk2d54iaKaTPTCNICc9uOa4L/AIJx+GJdG/4W5rtpdnWb5vET6YmoSnm/ntkZpJCfR5pWP0IrxDSdV+GWofss+LdL8VaSviH46eLNWubeawuNPefVkvWm2xBMrmNEUA8EDqPauhZlmjqSj9bqNKy+J9eu+yMv7Ky1xT+rQu/7q/yPsXVvgj8G9E02XVNTsl060tgGlu7nV5YY4hkAFnZwF5I6nvUfh3wB8FfGEM1toWtx6/Hb486Kz8US3Sx+m4LKcfjXlX7Y1l4h0T9hnwT8Lr+7Fx4j8RXWj+H5jLLnzJQFZwWGSQGjUE8+tVf2KfDUMv7WnjzUte0/QfDXiXwbp8GhnQPDlmbeymgfDC8LE7pS2wclRjKk84xh/aWZSourLFTur295+XmUsqy5S5VhoWe/ur/I9N8ReAP2c/DmpnTNe1fRNKvEUOba+8R+RKqnkEq8gIBr0H4f+BPAOhQwap4W0bT/AN/GskF8jeezowyGSRieCCDkHBFfEuua94d8TftlfEXV9a8VfDmyU6zBotrZ+L9DOqNcxQ4iY2yjhCWUjJ6kj0r9ArG1trKyhsrOCO3t7eNYoYYlCpGijCqoHAAAAAFYY7HY901CrXnJNapydjTC5Zl9OftKVCEWtmoq5LzRRRXinqhRRRQACijvRQAN1oobrRQAUUUUAFNkVZI2jkVWRwQysMgg9iO9OooAraZYWGnW5g0+xt7SItuKW8SxqT64UDmmTaPpM0zTTaXZSSOcs726FmPuSOauUU7sCK4trefy/Pt4pfKYPHvQNsYdCM9DQttbLeNdrbxC4ddrTBBvYehbripaKQFZtO09rz7W1hatcZB84wrvyOh3YzVmio7qeC1tnuLmaOGGMbnklcKqj1JPAp6vQNiSivKfHv7R3wk8LSPBJ4lXVblDgwaTGbk5/wB8fIP++q8h8XftotvaPwv4JUDPyzapecn/ALZxj/2avocDwnneNSdLDtLvL3V/5Na/yPMxGc4DD6TqK/lr+R9XLa2y3T3K28ImkXbJKIxudfQnqRSR2Nklm1olnbrbtnMKxKEOeuVxivisfGv9o/xqxXw5pt5FFJ0Gk6EWUD/ro4bH51Knw1/af8YqH1i91qGJ+o1DXBCo/wC2aMSP++a9j/UmdD/fcZSp+XNd/dp+Z574hU/93w85/Ky/U+wLiTwxoLGeeTSNLbGDI7RQnH1OK5nxP8S/hEFWLWvFvhm68l9yo88dxsb1AG7Br550f9kPxpdssut+LNHt2b73lrLcuPxYL/Ouv0b9j/QYtv8AafjTUrj+8LW0jhH/AI9vqHlHDND+NmDm/wC7B/nqif7Qzqr/AA8Ior+9L/hjvda/aC+DS27W83iKO+jOMxR6dNIpx04KYrCX9pT4Rac7vp2nanuYYLW2lpHuHpkstWdL/Za+Ftrt+0JrV7jr5+oFQfwQLXR6b8BPhJZAbPBlrKV/iuJ5Zc/99MRWTlwhS0SrT/8AAUv0Dl4iqdaUf/An/mcFJ+1T4FtpZZLDwnq2+Y5kcrBEZD6sQxJ/Gs64/at0JrxbqHwDJJcIu1Jpb6MOB6AhCccnvXtum/DX4e2GPsngnQI8dCdPjY/mRWxaaDoVp/x66Lp0GP8AnlaIv8hWbzHhqPw4KUvWo1+Q/qOfS3xcY+kE/wAz50u/2n7nU4xEvw1iukzkLLdNKM+uBFT9N+P3jCMMNI+EqQiTBYQQzfN9dsYzX0tHGka7Y0VB6KuKdzWbznJV8GXL51JMFlObP4se/lCKPneH43fF6fm3+Es7D/rzuj/QVbh+LPxvk5X4RSfja3A/ma995ozWMs6y/wCzgIf+BT/zLWT4/rjp/dH/ACPB4/iJ8aWuvtZ+DsPn7dnm+S4fb6ZJzj2qeb4gfGG6RUvPg3HOqsGCvuIBHQgHPNe40Vm84wb/AOYKn98//kiv7Hxn/QbU+6H/AMieL/8ACxPilJNHNd/BWWWSEny3Ep3JnrtJUkVYX4neNFulurz4I6yZkXaJo23soPUA+XnFewUVk8zwMt8HD5Sn/wDJFrK8dHbGz+cab/8AbTypPjJqMX/H/wDCzxhAO5Sz34/QVZh+OHhUYF/o/iXTz3+06UwA/wC+Sa9MyaM1lLF5dLfDW9Jv9VI0WDzOO2Kv6wX6OJwmn/GT4bXZ2jxPDbt/duYZIsf99KBXR+HNc8LX6t/YWraTOJXLsLSeMlmPUkKev1q9eabp12uLqwtZx6Swq38xWJqfw98DagSbrwnpDMf4ktVjb81wazlLLZbKcfnGX6RLjHNobypz+UofrM6G1tre2jZLa3ihVmLERoFBY9Scd6iXTtPXUm1FbC1W8ZdrXIhXzSPQvjNc/Y+AtJ03/kB6hrWlKOiW+pSPH/37lLr+lbul29/brsu9QF4vZ3gCSfjt+U/kK5akKS1pzv6qz/VfiddGpXelWnZ+Tuvxs/wJ7i2t7h42nt4pWhbfGXQMUb1GehoS2t0unukt4lnkADyhAHYDoCepqWiuc6il/Y+kGfzjpVj5u7dv+zJu3ZznOOuau0UUXAKKKKACiiigAHWigdaKABqKDRQAUUGigAooooAKKKKACmXEsUEDzzSLHHGpZ3c4VQOpJ7Cn0YzwRQtwPIfG/wATvHusSPpnwh+Ht7qjHK/27rCGzsF/2ohIVab6jA9N1edal+zr8WfiLeLefFX4ox+Wx3fYbGNpo4vZU+SNfqFP419R0dq+hwvEVXARtgKUacv5rc0/vldL/t1I86tl0MQ/9ok5Ltey+5fq2eF+Ef2TPhRpGxtSh1TXJF6/bLwpGT/uRBePqTXpvhT4ceAfDSgaF4O0WxZekkdknmf99kFj+ddPRXFi87zPGX+sV5SXa7t92xtRwGFo/wAOml8gHAwOnYCig0V5Z1hRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFHegAoo70UAFFAooAKKKDQAUUUUAFFFFAAOtFFFAH/9k=';

async function handleBillingBar(req, res) {
  const q = new URLSearchParams(req.url.split('?')[1] || '');
  const ref = (q.get('client') || '').trim();
  const js = (body) => {
    // no-store: Cloudflare must never keep a copy (it once served a 4-hour-old version), and the billing state is live data
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    res.end(body);
  };
  if (!/^MAN-[A-Za-z0-9._-]{1,76}$/.test(ref) || !dbConfigured()) return js('/* Nadine Cloud billing bar: no client */');
  await ensureSchema();
  const r = await getPool().query(
    `SELECT o.plan, o.amount, o.period, o.domain,
            (SELECT max(x.expires_at) FROM orders x WHERE x.email = o.email AND x.type = 'managed' AND x.status = 'paid'
               AND x.domain IS NOT DISTINCT FROM o.domain) AS paid_until,
            (SELECT bool_or(x.suspended_at IS NOT NULL) FROM orders x WHERE x.email = o.email AND x.type = 'managed'
               AND x.status = 'paid' AND x.domain IS NOT DISTINCT FROM o.domain
               AND x.expires_at = (SELECT max(y.expires_at) FROM orders y WHERE y.email = o.email AND y.type = 'managed' AND y.status = 'paid' AND y.domain IS NOT DISTINCT FROM o.domain)) AS paused
     FROM orders o WHERE o.reference = $1 AND o.type = 'managed' AND o.status = 'paid'`,
    [ref]
  );
  const row = r.rows[0];
  if (!row || !row.paid_until) return js('/* Nadine Cloud billing bar: unknown client */');
  const lusakaDay = (d) => new Date(new Date(d).getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
  const due = lusakaDay(row.paid_until);
  const daysLeft = Math.round((Date.parse(due) - Date.parse(lusakaDay(new Date()))) / 864e5);
  const fmt = (iso, plus = 0) => new Date(Date.parse(iso) + plus * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const amount = `ZMW ${Number(row.amount).toLocaleString('en-US')}`;
  const payUrl = `https://www.nadinecloud.com/checkout/?type=managed&client=${encodeURIComponent(ref)}&plan=${encodeURIComponent(row.plan)}&amount=${encodeURIComponent(Number(row.amount))}&period=${row.period === 'yr' ? 'yr' : 'mo'}`;
  let level; let text;
  if (row.paused || daysLeft < -3) { level = 'red'; text = `Admin tools paused — ${amount} was due on ${fmt(due)}. Pay to switch them back on.`; }
  else if (daysLeft < 0) { level = 'red'; text = `Overdue: ${amount} was due on ${fmt(due)}. Pay by ${fmt(due, 3)} to avoid a pause.`; }
  else if (daysLeft === 0) { level = 'amber'; text = `${amount} is due today (${fmt(due)}).`; }
  else if (daysLeft <= 7) { level = 'amber'; text = `${amount} due on ${fmt(due)} — in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`; }
  else { level = 'calm'; text = `Hosting paid until ${fmt(due)}. Next: ${amount}.`; }
  // ---- Full "Subscription" card (same idea as the Optic Zone app's card), used when the client's admin page
  //      has a spot for it: <div data-nc-subscription></div>. Without such a spot, the small floating bar is shown.
  const hist = await getPool().query(
    `SELECT x.reference, x.amount, x.paid_at, x.created_at, x.expires_at, x.promo_code
       FROM orders x, orders o
      WHERE o.reference = $1 AND x.email = o.email AND x.type = 'managed' AND x.status = 'paid'
        AND x.domain IS NOT DISTINCT FROM o.domain AND x.expires_at IS NOT NULL
      ORDER BY x.expires_at DESC LIMIT 6`,
    [ref]
  );
  const METHOD = { 'manual:momo': 'Mobile money', 'manual:cash': 'Cash', 'manual:bank': 'Bank transfer', 'manual:other': 'Recorded by Nadine Cloud' };
  const history = hist.rows.map((h) => ({
    paidOn: lusakaDay(h.paid_at || h.created_at),
    until: lusakaDay(h.expires_at),
    amount: Number(h.amount),
    how: /^MAN-/.test(h.reference) ? 'Account opened' : (METHOD[h.promo_code] || 'Nadine Pay'),
  }));
  const latest = history[0];
  const prevEnd = history[1] ? history[1].until : null;
  const startIso = prevEnd || new Date(Date.parse(due) - (row.period === 'yr' ? 365 : 30) * 864e5).toISOString().slice(0, 10);
  const span = Math.max(1, (Date.parse(due) - Date.parse(startIso)) / 864e5);
  const used = Math.min(1, Math.max(0, (Date.parse(lusakaDay(new Date())) - Date.parse(startIso)) / 864e5 / span));
  const state = row.paused || daysLeft < -3 ? 'paused' : daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft <= 7 ? 'soon' : 'active';
  const pill = state === 'paused' ? 'Admin tools paused — payment overdue'
    : state === 'overdue' ? `Overdue by ${-daysLeft} day${daysLeft === -1 ? '' : 's'} · pauses ${fmt(due, 4)}`
    : state === 'today' ? 'Payment due today'
    : state === 'soon' ? `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
    : `Active · ${daysLeft} days left`;
  const card = {
    plan: row.plan, amount, per: row.period === 'yr' ? 'year' : 'month', state, pill,
    lastPaid: latest && latest.how !== 'Account opened' ? fmt(latest.paidOn) : '—',
    lastSub: latest && latest.how !== 'Account opened' ? `ZMW ${latest.amount.toLocaleString('en-US')} · ${latest.how}` : '',
    paidUntil: fmt(due), nextDue: fmt(due), usedPct: Math.round(used * 100),
    // Each line shows the period the payment covered (from the previous period's end), then when and how it was paid.
    history: history.map((h, i) => ({ ...h, from: history[i + 1] ? history[i + 1].until : null }))
      .filter((h) => h.how !== 'Account opened').slice(0, 4)
      .map((h) => `${h.from ? `${fmt(h.from)} – ` : 'Until '}${fmt(h.until)} · ZMW ${h.amount.toLocaleString('en-US')} · paid ${fmt(h.paidOn)} · ${h.how}`),
  };
  const data = JSON.stringify({ level, text, payUrl, card, logo: NADINE_PAY_LOGO_JPG });
  js(`/* Nadine Cloud billing */
(function () {
  var d = ${data};
  var NP_ICON = '<svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="13" fill="#FFFFFF"/><circle cx="24" cy="24" r="13" fill="#054194"/><circle cx="24" cy="24" r="10" fill="none" stroke="#FFFFFF" stroke-width="1.6"/><path d="M20.5 17.5v13M20.5 24.5l6.5-7M22.4 22.5l5 8" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var NP_TILE = '<svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="npt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#09AAFE"/><stop offset="1" stop-color="#054194"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#npt)"/><circle cx="24" cy="24" r="13" fill="#FFFFFF"/><circle cx="24" cy="24" r="10" fill="none" stroke="#054194" stroke-width="1.6"/><path d="M20.5 17.5v13M20.5 24.5l6.5-7M22.4 22.5l5 8" fill="none" stroke="#001D54" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function cardHtml() {
    var c = d.card;
    var tone = { active: ['rgba(74,222,128,.12)', '#4ade80'], soon: ['rgba(245,158,11,.14)', '#fbbf24'], today: ['rgba(248,113,113,.14)', '#f87171'], overdue: ['rgba(248,113,113,.14)', '#f87171'], paused: ['#c62828', '#ffffff'] }[c.state];
    var due = c.state !== 'active';
    return '<style>' +
      ':host{display:block}.c{font-family:Raleway,system-ui,sans-serif;background:#111a13;border:1px solid #1e2e22;border-top:3px solid #c9a227;padding:1.4rem 1.5rem;color:#ececec;display:flex;flex-direction:column;gap:1.1rem}' +
      '.h{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem}.ti{flex:1;min-width:200px}.t{font-family:"Playfair Display",Georgia,serif;font-size:1.35rem;color:#f5f0e8}' +
      '.s{font-size:.85rem;color:#cfd5d2;line-height:1.5}.p{display:inline-flex;align-items:center;gap:.45rem;padding:.45rem .9rem;border-radius:999px;font-size:.82rem;font-weight:700}' +
      '.g{display:flex;flex-wrap:wrap;gap:.8rem}.f{flex:1 1 170px;padding:.9rem 1rem;background:rgba(255,255,255,.03);border:1px solid #1e2e22}' +
      '.k{font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#c9a227;margin-bottom:.3rem}.v{font-family:"Playfair Display",Georgia,serif;font-size:1.15rem;color:#f5f0e8}.v.red{color:#f87171}' +
      '.tr{height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden}.fi{height:8px;border-radius:4px}' +
      '.ft{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem}.ft .s{flex:1;min-width:220px}' +
      '.lg{background:#fff;border-radius:10px;padding:4px 8px;display:inline-flex;flex-shrink:0}.lg img{height:52px;width:auto;display:block}' +
      'a.pay{display:inline-flex;align-items:center;gap:.6rem;min-height:46px;padding:0 1.4rem;border-radius:12px;background:#054194;border-bottom:3px solid #09AAFE;color:#fff;text-decoration:none;font-weight:700;font-size:.92rem;letter-spacing:.02em}' +
      'a.pay:hover{background:#0a4fb0}.hi{font-size:.8rem;color:#cfd5d2;line-height:1.8}</style>' +
      '<div class="c">' +
        '<div class="h"><span class="lg"><img src="' + d.logo + '" alt="Nadine Pay"></span><div class="ti"><div class="t">Subscription</div><div class="s">' + esc(c.plan) + ' · ' + esc(c.amount) + ' per ' + esc(c.per) + ' · billed by Nadine Cloud</div></div>' +
          '<span class="p" style="background:' + tone[0] + ';color:' + tone[1] + '">' + esc(c.pill) + '</span></div>' +
        '<div class="g">' +
          '<div class="f"><div class="k">Last payment</div><div class="v">' + esc(c.lastPaid) + '</div>' + (c.lastSub ? '<div class="s">' + esc(c.lastSub) + '</div>' : '') + '</div>' +
          '<div class="f"><div class="k">Paid until</div><div class="v">' + esc(c.paidUntil) + '</div></div>' +
          '<div class="f"><div class="k">Next payment due</div><div class="v' + (due ? ' red' : '') + '">' + esc(c.nextDue) + '</div><div class="s">' + esc(c.amount) + '</div></div>' +
        '</div>' +
        '<div><div class="tr"><div class="fi" style="width:' + c.usedPct + '%;background:' + (c.state === 'active' ? '#4ade80' : tone[1]) + '"></div></div><div class="s" style="margin-top:.35rem">' + c.usedPct + '% of this period used</div></div>' +
        '<div class="ft"><div class="s">Pay by mobile money or card and your admin tools stay switched on. A receipt is emailed straight away. Questions: billing@nadinecloud.com</div>' +
          '<a class="pay" target="_blank" rel="noopener" href="' + esc(d.payUrl) + '">Pay now · Nadine Pay</a></div>' +
        (c.history.length ? '<div><div class="k">Payment history</div><div class="hi">' + c.history.map(esc).join('<br>') + '</div></div>' : '') +
      '</div>';
  }
  function show() {
    var spots = document.querySelectorAll('[data-nc-subscription]');
    if (spots.length) {
      for (var i = 0; i < spots.length; i++) {
        var root = spots[i].shadowRoot || (spots[i].attachShadow ? spots[i].attachShadow({ mode: 'open' }) : spots[i]);
        root.innerHTML = cardHtml();
      }
      return;
    }
    if (document.getElementById('nc-billing-bar')) return;
    var host = document.createElement('div'); host.id = 'nc-billing-bar';
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:calc(100vw - 32px)';
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var c = { calm: ['#0B1220', '#E6EEFF', '#1769FF'], amber: ['#3A2600', '#FFF4DC', '#D97706'], red: ['#fff', '#C62828', '#fff'] }[d.level];
    var btnText = d.level === 'red' ? '#C62828' : '#fff';
    root.innerHTML = '<style>.b{font:500 13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;gap:10px;padding:9px 10px 9px 14px;border-radius:12px;box-shadow:0 6px 24px rgba(11,18,32,.22);color:' + c[0] + ';background:' + c[1] + '}' +
      '.t{flex:1;min-width:0}.k{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.75;font-weight:700}' +
      'a{flex:none;text-decoration:none;font-weight:700;padding:7px 12px;border-radius:9px;background:' + c[2] + ';color:' + btnText + '}' +
      'button{flex:none;border:0;background:none;color:inherit;opacity:.6;font-size:16px;cursor:pointer;padding:2px 4px}</style>' +
      '<div class="b" role="status"><span class="t"><span class="k">Nadine Cloud billing</span></span><a target="_blank" rel="noopener">Pay now</a>' +
      (d.level === 'calm' ? '<button aria-label="Hide">&times;</button>' : '') + '</div>';
    root.querySelector('.t').appendChild(document.createTextNode(d.text));
    root.querySelector('a').href = d.payUrl;
    var x = root.querySelector('button');
    if (x) x.onclick = function () { try { sessionStorage.setItem('ncBarHidden', '1'); } catch (e) {} host.remove(); };
    try { if (d.level === 'calm' && sessionStorage.getItem('ncBarHidden')) return; } catch (e) {}
    document.body.appendChild(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
`);
}

module.exports = { handleBillingBar, handleAdminClients, handleAdminRecordPayment, lookupManagedClient, handleLipilaWebhook, handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook, handleReceiptDownload, handleValidatePromo, handleAdminPromoCodes };
