const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

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
  return Boolean(process.env.NAMECHEAP_API_KEY && process.env.NAMECHEAP_API_USER && process.env.NAMECHEAP_USERNAME);
}

function baseUrl() {
  return process.env.NAMECHEAP_SANDBOX === 'true'
    ? 'https://api.sandbox.namecheap.com/xml.response'
    : 'https://api.namecheap.com/xml.response';
}

// Namecheap requires the ClientIp param to exactly match the real source IP
// of the request. Our Railway service has 3 static outbound IPs and traffic
// is load-balanced across them unpredictably, so we can't hardcode one —
// instead we ask a public echo service what IP we're actually calling from
// right before each Namecheap request.
async function getOutboundIp() {
  const res = await fetch('https://api.ipify.org?format=text');
  if (!res.ok) throw new Error('Could not determine outbound IP');
  return (await res.text()).trim();
}

async function namecheapRequest(command, params) {
  if (!isConfigured()) {
    const err = new Error('NAMECHEAP_NOT_CONFIGURED');
    err.code = 'NAMECHEAP_NOT_CONFIGURED';
    throw err;
  }

  const clientIp = await getOutboundIp();

  const query = new URLSearchParams({
    ApiUser: process.env.NAMECHEAP_API_USER,
    ApiKey: process.env.NAMECHEAP_API_KEY,
    UserName: process.env.NAMECHEAP_USERNAME,
    ClientIp: clientIp,
    Command: command,
    ...params,
  });

  const res = await fetch(`${baseUrl()}?${query.toString()}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const apiResponse = parsed.ApiResponse;

  if (!apiResponse) throw new Error('Unexpected response from Namecheap API');

  if (apiResponse.Status === 'ERROR') {
    const errors = apiResponse.Errors && apiResponse.Errors.Error;
    const message = Array.isArray(errors) ? errors.map((e) => e['#text'] || e).join('; ') : (errors && (errors['#text'] || errors)) || 'Unknown Namecheap API error';
    const err = new Error(message);
    err.code = 'NAMECHEAP_API_ERROR';
    throw err;
  }

  return apiResponse.CommandResponse;
}

// domainNames: array of full domain names, e.g. ['example.com', 'example.net']
// Namecheap allows up to 50 domains per check call.
async function checkAvailability(domainNames) {
  const commandResponse = await namecheapRequest('namecheap.domains.check', {
    DomainList: domainNames.join(','),
  });

  let results = commandResponse.DomainCheckResult;
  if (!results) return [];
  if (!Array.isArray(results)) results = [results];

  return results.map((r) => ({
    domain: r.Domain,
    available: r.Available === 'true' || r.Available === true,
    isPremium: r.IsPremiumName === 'true' || r.IsPremiumName === true,
    premiumPrice: r.PremiumRegistrationPrice || null,
  }));
}

// contact: { firstName, lastName, address1, city, stateProvince, postalCode,
//            country, phone, email } — phone must be like "+260.9770000000".
// The same contact is used for Registrant/Tech/Admin/AuxBilling, matching
// what most registrars (including Namecheap's own checkout) do by default
// for individual customers rather than asking for 4 separate contact sets.
function contactParams(contact) {
  const fields = {
    FirstName: contact.firstName,
    LastName: contact.lastName,
    Address1: contact.address1,
    City: contact.city,
    StateProvince: contact.stateProvince,
    PostalCode: contact.postalCode,
    Country: contact.country,
    Phone: contact.phone,
    EmailAddress: contact.email,
  };
  const out = {};
  ['Registrant', 'Tech', 'Admin', 'AuxBilling'].forEach((role) => {
    Object.entries(fields).forEach(([key, value]) => {
      out[`${role}${key}`] = value;
    });
  });
  return out;
}

// Registers a domain the customer already confirmed is available. Returns
// { ok, domain, orderId, transactionId, chargedAmount } on success, or
// { ok: false, reason } on failure — never throws, so a failed registration
// can be reported to the admin/customer instead of crashing the payment flow.
async function registerDomain(domainName, years, contact) {
  try {
    const commandResponse = await namecheapRequest('namecheap.domains.create', {
      DomainName: domainName,
      Years: years,
      AddFreeWhoisguard: 'yes',
      WGEnabled: 'yes',
      ...contactParams(contact),
    });

    const result = commandResponse.DomainCreateResult;
    if (!result || !(result.Registered === 'true' || result.Registered === true)) {
      return { ok: false, reason: 'Namecheap did not confirm registration', raw: result };
    }
    return {
      ok: true,
      domain: result.Domain,
      orderId: result.OrderID,
      transactionId: result.TransactionID,
      chargedAmount: result.ChargedAmount,
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
    const domains = TLDS.map((tld) => `${name}.${tld}`);
    const results = await checkAvailability(domains);
    sendJson(res, 200, { results });
  } catch (err) {
    console.error('Namecheap domain check error:', err);
    sendJson(res, 502, { error: 'Could not check that domain right now — please try again.' });
  }
}

module.exports = { isConfigured, checkAvailability, handleDomainCheck, registerDomain };
