// Name.com registrar (Core API v4). Drop-in alternative to namecheap.js: exports the same
// { isConfigured, checkAvailability, handleDomainCheck, registerDomain } so the checkout flow
// doesn't care which registrar is behind it. Selected with DOMAIN_REGISTRAR=namecom (see registrar.js).
//
// Auth: HTTP Basic with NAMECOM_USERNAME + NAMECOM_TOKEN (name.com > Account > API Tokens).
// Leave the token's IP allow-list empty (an allow-list would block the server's own address).
// Buying spends the balance/credit on the Name.com account, so registerDomain re-checks the live
// price right before purchasing and refuses anything premium or above NAMECOM_MAX_PRICE_USD.

const API_BASE = process.env.NAMECOM_API_BASE || 'https://api.name.com';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT_MAX;
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function isConfigured() {
  return Boolean(process.env.NAMECOM_USERNAME && process.env.NAMECOM_TOKEN);
}

async function namecomRequest(method, pathname, body) {
  if (!isConfigured()) {
    const err = new Error('NAMECOM_NOT_CONFIGURED');
    err.code = 'NAMECOM_NOT_CONFIGURED';
    throw err;
  }
  const auth = Buffer.from(`${process.env.NAMECOM_USERNAME}:${process.env.NAMECOM_TOKEN}`).toString('base64');
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data.message || data.details || `Name.com API error (${res.status})`);
    err.code = 'NAMECOM_API_ERROR';
    err.status = res.status;
    throw err;
  }
  return data;
}

// domainNames: array of full domain names, e.g. ['example.com', 'example.net'] (Name.com allows up to 50).
// Returns [{ domain, available, isPremium, premiumPrice, price, renewalPrice }].
async function checkAvailability(domainNames) {
  const data = await namecomRequest('POST', '/v4/domains:checkAvailability', { domainNames });
  return (data.results || []).map((r) => ({
    domain: r.domainName,
    available: r.purchasable === true,
    isPremium: r.premium === true,
    premiumPrice: r.premium === true ? r.purchasePrice : null,
    price: r.purchasePrice ?? null,
    renewalPrice: r.renewalPrice ?? null,
  }));
}

// contact: { firstName, lastName, address1, city, stateProvince, postalCode, country, phone, email }
// (same shape the Namecheap path uses; phone like "+260.9770000000", country as a 2-letter code).
function contactBlock(contact) {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    address1: contact.address1,
    city: contact.city,
    state: contact.stateProvince,
    zip: contact.postalCode,
    country: contact.country,
    phone: contact.phone,
    email: contact.email,
  };
}

// Registers a domain. Never throws: returns { ok, domain, orderId, transactionId, chargedAmount }
// on success or { ok: false, reason } so the payment flow can report it instead of crashing.
async function registerDomain(domainName, years, contact) {
  try {
    const [check] = await checkAvailability([domainName]);
    if (!check || !check.available) return { ok: false, reason: `${domainName} is not available to register.` };
    if (check.isPremium) return { ok: false, reason: `${domainName} is a premium domain (price ${check.price}); register it manually.` };
    const maxPrice = parseFloat(process.env.NAMECOM_MAX_PRICE_USD || '40');
    const total = (check.price ?? Infinity) * years;
    if (!(total <= maxPrice * years)) {
      return { ok: false, reason: `${domainName} costs ${check.price} per year, above the safety limit of ${maxPrice}; register it manually.` };
    }

    const block = contactBlock(contact);
    const data = await namecomRequest('POST', '/v4/domains', {
      domain: {
        domainName,
        privacyEnabled: process.env.NAMECOM_PRIVACY === 'true',
        locked: true,
        autorenewEnabled: false,
        contacts: { registrant: block, admin: block, tech: block, billing: block },
      },
      purchasePrice: check.price,
      purchaseType: 'registration',
      years,
    });

    if (!data.domain || !data.domain.domainName) return { ok: false, reason: 'Name.com did not confirm the registration', raw: data };
    return {
      ok: true,
      domain: data.domain.domainName,
      orderId: data.order,
      transactionId: data.order,
      chargedAmount: data.totalPaid,
    };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
}

const TLDS = ['com', 'net', 'org'];

async function handleDomainCheck(req, res, urlParams) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "You're checking too quickly — please wait a moment and try again." });
    return;
  }

  const raw = (urlParams.get('name') || '').trim().toLowerCase();
  const name = raw.replace(/[^a-z0-9-]/g, '');
  if (!name) {
    sendJson(res, 400, { error: 'Missing domain name.' });
    return;
  }

  if (!isConfigured()) {
    sendJson(res, 503, { error: 'Live domain checking isn’t switched on yet.' });
    return;
  }

  try {
    const results = await checkAvailability(TLDS.map((tld) => `${name}.${tld}`));
    // ZMW quote = registrar price x today's rate, rounded up: the same figure pricing.js checks at checkout.
    // (required lazily: pricing.js itself requires the registrar)
    const rate = await require('./pricing').usdToZmw();
    for (const r of results) {
      if (r.available && !r.isPremium && typeof r.price === 'number') r.priceZmw = Math.ceil(r.price * rate);
    }
    sendJson(res, 200, { results });
  } catch (err) {
    console.error('Name.com domain check error:', err);
    sendJson(res, 502, { error: 'Could not check that domain right now — please try again.' });
  }
}

module.exports = { isConfigured, checkAvailability, handleDomainCheck, registerDomain };
