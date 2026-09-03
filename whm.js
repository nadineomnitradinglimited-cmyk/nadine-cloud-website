const crypto = require('crypto');

const WHM_HOST = 'https://secure375.servconfig.com:2087';
const WHM_USER = 'nadine14';
const WHM_PKG_PREFIX = 'nadine14_';

const PACKAGES = {
  avara: { QUOTA: 5000, BWLIMIT: 25000, MAXPOP: 5, MAXADDON: 0, MAXSQL: 2 },
  elora: { QUOTA: 10000, BWLIMIT: 75000, MAXPOP: 15, MAXADDON: 0, MAXSQL: 5 },
  veyra: { QUOTA: 20000, BWLIMIT: 150000, MAXPOP: 30, MAXADDON: 2, MAXSQL: 10 },
  zyra: { QUOTA: 40000, BWLIMIT: 300000, MAXPOP: 50, MAXADDON: 4, MAXSQL: 20 },
};

async function whmRequest(pathAndQuery) {
  const token = process.env.WHM_API_TOKEN;
  if (!token) {
    const err = new Error('WHM_NOT_CONFIGURED');
    err.code = 'WHM_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${WHM_HOST}${pathAndQuery}`, {
    headers: { Authorization: `whm ${WHM_USER}:${token}` },
  });
  const body = await res.json().catch(() => null);
  return { httpStatus: res.status, body };
}

async function ensurePackagesExist() {
  const results = {};
  for (const [name, limits] of Object.entries(PACKAGES)) {
    const params = new URLSearchParams({
      'api.version': '1',
      name,
      quota: String(limits.QUOTA),
      bwlimit: String(limits.BWLIMIT),
      maxpop: String(limits.MAXPOP),
      maxsub: 'unlimited',
      maxpark: '0',
      maxaddon: String(limits.MAXADDON),
      maxsql: String(limits.MAXSQL),
      maxftp: 'unlimited',
      hasshell: '0',
      cgi: '1',
      cpmod: 'paper_lantern',
      language: 'en',
    });
    try {
      const { body } = await whmRequest(`/json-api/addpkg?${params.toString()}`);
      results[name] = body && body.metadata ? body.metadata : body;
    } catch (err) {
      results[name] = { error: err.message };
    }
  }
  return results;
}

function genPassword() {
  // 16 chars, mixed case + digits + one symbol, avoids characters that
  // commonly break URL/shell/query-string handling downstream
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pw = '';
  const bytes = crypto.randomBytes(15);
  for (let i = 0; i < 15; i++) pw += chars[bytes[i] % chars.length];
  return pw + '!' + Math.floor(Math.random() * 9);
}

function genUsername(domain) {
  const base = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0]
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'site';
  const suffix = crypto.randomBytes(2).toString('hex');
  return (base + suffix).slice(0, 16);
}

/**
 * Creates a real cPanel hosting account on the reseller server.
 * pkgSlug must be one of 'avara' | 'elora' | 'veyra' | 'zyra'.
 */
async function createAccount({ domain, pkgSlug, contactemail }) {
  if (!PACKAGES[pkgSlug]) {
    return { ok: false, reason: 'unknown_package' };
  }
  const username = genUsername(domain);
  const password = genPassword();
  const params = new URLSearchParams({
    'api.version': '1',
    username,
    domain,
    password,
    contactemail,
    plan: WHM_PKG_PREFIX + pkgSlug,
  });

  try {
    const { body } = await whmRequest(`/json-api/createacct?${params.toString()}`);
    const ok = Boolean(body && body.metadata && body.metadata.result === 1);
    return {
      ok,
      username,
      password,
      domain,
      reason: body && body.metadata ? body.metadata.reason : 'unknown',
      raw: body,
    };
  } catch (err) {
    if (err.code === 'WHM_NOT_CONFIGURED') {
      return { ok: false, reason: 'not_configured' };
    }
    return { ok: false, reason: 'request_failed', error: String(err) };
  }
}

module.exports = { whmRequest, ensurePackagesExist, createAccount, PACKAGES };
