const crypto = require('crypto');
const { sendEmail } = require('./email');
const { createAccount, HOSTING_PACKAGES, DATABASE_PACKAGES, WORDPRESS_PACKAGES, BUILDER_PACKAGES } = require('./whm');

// SSL and Care Plans are fully manual products — no WHM package, no
// automatic provisioning. Just used to validate the `pkg` sent at checkout.
const SSL_PRODUCTS = new Set(['ssl-standard', 'ssl-wildcard', 'ssl-ev']);
const CARE_PRODUCTS = new Set(['care-essential', 'care-growth', 'care-premium']);
const { generateReceiptPdf } = require('./receipt');
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
  d.setMonth(d.getMonth() + months);
  return d;
}

// Never trust a client-supplied discount — always re-derive it server-side
// from the stored code so a tampered request can't change what's charged.
async function validatePromoCode(rawCode, subtotal) {
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
    text: `Hi ${order.name},\n\nYour hosting account is set up and ready to go.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe'd recommend logging in and changing your password once you're in.\n\nAny trouble, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
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
    text: `Hi ${order.name},\n\nYour database hosting account is set up and ready to go.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nFrom there, go to MySQL Databases (or PostgreSQL Databases) and use the wizard to create your database(s) — your plan covers up to ${maxsql}. Each database gets its own username/password that your app connects with directly.\n\nWe'd recommend logging in and changing your cPanel password once you're in.\n\nAny trouble, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
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
    text: `Hi ${order.name},\n\nYour hosting account is set up.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe're installing WordPress for you now — you'll get a separate email with your WordPress admin login within a few hours.\n\nWe'd recommend logging in to cPanel and changing your password once you're in.\n\nAny trouble, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`WordPress account email not delivered to customer for ${acct.domain}:`, result.reason);
  return result;
}

async function emailBuilderDetailsToCustomer(order, acct) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud Website Builder account is ready — ${acct.domain}`,
    text: `Hi ${order.name},\n\nYour hosting account is set up.\n\ncPanel login: https://${acct.domain}:2083\nUsername: ${acct.username}\nPassword: ${acct.password}\n\nWe're enabling Website Builder for you now — it'll appear in cPanel within a few hours, and you can start building your site right from there.\n\nWe'd recommend logging in and changing your cPanel password once you're in.\n\nAny trouble, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`Website Builder account email not delivered to customer for ${acct.domain}:`, result.reason);
  return result;
}

async function emailSslOrderConfirmation(order) {
  const result = await sendEmail({
    to: order.email,
    subject: `Your Nadine Cloud SSL certificate order — ${order.domain}`,
    text: `Hi ${order.name},\n\nThanks for your order — we're setting up your SSL certificate for ${order.domain} now. This can take up to 24 hours depending on the certificate type (Wildcard and Extended Validation need extra verification). We'll email you once it's live on your site.\n\nAny questions, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
  });
  if (!result.ok) console.error(`SSL confirmation email not delivered for ${order.domain}:`, result.reason);
  return result;
}

async function emailCarePlanConfirmation(order) {
  const result = await sendEmail({
    to: order.email,
    subject: `Welcome to your Nadine Cloud Care Plan — ${order.plan}`,
    text: `Hi ${order.name},\n\nThanks for signing up for ${order.plan}. Our team will reach out within 24 hours to onboard your website onto the plan and confirm what we'll need access to.\n\nAny questions in the meantime, reach us on WhatsApp at +260 964 068 483.\n\n— Nadine Cloud`,
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
    const r = await getPool().query(
      `SELECT plan, amount, email, expires_at, period FROM orders WHERE reference = $1 AND type = 'managed' AND status = 'paid'`,
      [ref]
    );
    const row = r.rows[0];
    if (!row) return null;
    const period = row.period === 'yr' ? 'yr' : 'mo';
    const next = new Date(row.expires_at || Date.now());
    next.setMonth(next.getMonth() + (period === 'yr' ? 12 : 1)); // keep the same day every month / every year
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
    if (order.promoCode) await redeemPromoCode(order.promoCode);
  }
  updateOrderStatus(reference, outcome, order && order.paidAt ? new Date(order.paidAt) : null);

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
    if (!lipila.isConfigured()) return sendJson(res, 503, { error: 'Card payment isn’t switched on yet — please use mobile money, WhatsApp or the contact form.' });
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
      return sendJson(res, 400, { error: 'A full contact address is required to register a domain — please fill in every field, or message us on WhatsApp if your country isn’t listed.' });
    }
  }

  // Never trust the amount sent by the browser: check it against the real list price
  // (a domain is priced from the registrar's live price) before any payment is started.
  let managed = null;
  if (type === 'managed') {
    managed = await lookupManagedClient(clientRef);
    if (!managed) return sendJson(res, 400, { error: 'This payment link is not valid. Please use the link in your latest email from us, or message us on WhatsApp.' });
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

  const reference = isCard ? genReference().replace(/^NC-/, 'NCC-') : genReference();

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
      sendJson(res, 502, { error: 'Could not start the card payment — please try again, use mobile money, or message us on WhatsApp.' });
      return;
    }
    persistOrder(reference, orderRecord);
    sendJson(res, 200, { reference, redirectUrl: card.redirectUrl });
    return;
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

  const orderRecord = newOrderRecord();
  pendingOrders.set(reference, orderRecord);
  persistOrder(reference, orderRecord);

  sendJson(res, 200, { reference, status: lenco.body.data.status });
}

// Asks Lipila for the real state of a card payment and, when it is really paid, runs the normal
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

  // Card payments (references start NCC-) are confirmed with Lipila, never by what the browser says.
  if (reference.startsWith('NCC-')) {
    const result = await resolveCardPayment(reference);
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
  if (!explicitExpiry) expires.setMonth(expires.getMonth() + months);
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
  if (/^NCC-[A-Za-z0-9-]{1,70}$/.test(reference) && pendingOrders.has(reference)) {
    await resolveCardPayment(reference).catch((err) => console.error('Lipila webhook check failed:', err));
  }
  sendJson(res, 200, { received: true });
}

module.exports = { handleAdminClients, handleLipilaWebhook, handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook, handleReceiptDownload, handleValidatePromo, handleAdminPromoCodes };
