const crypto = require('crypto');

const WHM_HOST = 'https://secure375.servconfig.com:2087';
const WHM_USER = 'nadine14';
const WHM_PKG_PREFIX = 'nadine14_';

const HOSTING_PACKAGES = {
  avara: { QUOTA: 5000, BWLIMIT: 25000, MAXPOP: 5, MAXADDON: 0, MAXSQL: 2 },
  elora: { QUOTA: 10000, BWLIMIT: 75000, MAXPOP: 15, MAXADDON: 0, MAXSQL: 5 },
  veyra: { QUOTA: 20000, BWLIMIT: 150000, MAXPOP: 30, MAXADDON: 2, MAXSQL: 10 },
  zyra: { QUOTA: 40000, BWLIMIT: 300000, MAXPOP: 50, MAXADDON: 4, MAXSQL: 20 },
};

// Standalone database hosting (no website/email included) — the customer
// gets a cPanel login and creates their own MySQL/PostgreSQL databases via
// cPanel's Database Wizard, up to MAXSQL, same self-serve model as email
// accounts on the hosting packages above.
const DATABASE_PACKAGES = {
  orin: { QUOTA: 2000, BWLIMIT: 10000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 1 },
  kaia: { QUOTA: 5000, BWLIMIT: 25000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 3 },
  velora: { QUOTA: 15000, BWLIMIT: 75000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 5 },
  zenix: { QUOTA: 30000, BWLIMIT: 150000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 10 },
  astra: { QUOTA: 60000, BWLIMIT: 300000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 20 },
  vantis: { QUOTA: 120000, BWLIMIT: 600000, MAXPOP: 0, MAXADDON: 0, MAXSQL: 40 },
};

// Managed WordPress hosting — same cPanel account mechanics as regular
// hosting; WordPress itself gets installed via Softaculous in cPanel
// after account creation, which stays a manual step for now (not enough
// certainty about this account's Softaculous API details to automate it).
const WORDPRESS_PACKAGES = {
  wpstarter: { QUOTA: 10000, BWLIMIT: 50000, MAXPOP: 3, MAXADDON: 0, MAXSQL: 2 },
  wpgrowth: { QUOTA: 20000, BWLIMIT: 100000, MAXPOP: 5, MAXADDON: 0, MAXSQL: 3 },
  wppro: { QUOTA: 40000, BWLIMIT: 200000, MAXPOP: 10, MAXADDON: 2, MAXSQL: 5 },
};

// Standalone Website Builder — a cheap cPanel account; enabling the actual
// Website Builder feature for it is a manual step in WHM's Feature Manager
// for the same reason as the WordPress install above.
const BUILDER_PACKAGES = {
  builder: { QUOTA: 2000, BWLIMIT: 10000, MAXPOP: 1, MAXADDON: 0, MAXSQL: 1 },
};

const PACKAGES = { ...HOSTING_PACKAGES, ...DATABASE_PACKAGES, ...WORDPRESS_PACKAGES, ...BUILDER_PACKAGES };

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

// ===================== Pausing sites for unpaid renewals =====================
// Pausing and un-pausing a client's website when a renewal isn't paid.
//
// Two kinds of client sites live on our InMotion server:
//  1. Their OWN cPanel account (created by whm.js after checkout)  -> WHM suspendacct / unsuspendacct.
//  2. An addon domain inside OUR account nadine14 (a client site we host by hand)
//     -> we must NEVER suspend nadine14 (that would take every site and mailbox offline), so instead
//        a small block is put at the top of that site's .htaccess that shows a "paused" page.
// Our own sites can never be paused.
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUR_ACCOUNT = 'nadine14';
const PROTECTED_DOMAINS = new Set(['nadinecloud.com', 'www.nadinecloud.com', 'cpanel-test.nadinecloud.com']);
const START = '# >>> NADINE-CLOUD-PAUSE (added automatically, unpaid renewal) >>>';
const END = '# <<< NADINE-CLOUD-PAUSE <<<';
const PAGE = 'nc-paused.html';

// Some clients keep their PUBLIC website online when unpaid: only the paid "database" services
// (admin panel, booking/package builder and the admin data behind them) are suspended.
// Map: domain -> URL path prefixes to block. Any domain not listed is paused as a whole site.
const SCOPED_SUSPEND = {
  'royalsouthluangwa.com': ['admin', 'builder', 'api/admin'],
};

const clean = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

async function accountForDomain(domain) {
  try {
    const r = await whmRequest(`/json-api/domainuserdata?api.version=1&domain=${encodeURIComponent(domain)}`);
    return r.body?.data?.userdata?.user || null;
  } catch {
    return null; // WHM not reachable / not configured: fall back to the .htaccess method
  }
}

// Folder that serves an addon domain inside our own account (/home/nadine14/<domain>).
function addonDocroot(domain) {
  const dir = path.join(os.homedir(), domain);
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? dir : null;
}

function pausedPage(domain, scoped) {
  const title = scoped ? 'This service is temporarily suspended' : 'This website is temporarily paused';
  const text = scoped
    ? `The admin panel and booking tools for <strong>${domain}</strong> are suspended while the hosting and database renewal is outstanding. Your public website is still online. Please renew to restore access straight away.`
    : `The hosting for <strong>${domain}</strong> is awaiting renewal. If you own this website, please renew to bring it back online straight away.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B1220;color:#E6EEF8;font-family:system-ui,Segoe UI,Arial,sans-serif;text-align:center;padding:24px}
.c{max-width:520px}.b{display:inline-block;margin-top:22px;background:#1769FF;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700}
h1{font-size:26px;margin:18px 0 10px}p{color:#A9B8CC;line-height:1.6}</style></head>
<body><div class="c"><div style="background:#fff;border-radius:14px;padding:14px 18px;display:inline-block"><img src="https://www.nadinecloud.com/assets/email-logo.png" alt="Nadine Cloud" width="180" onerror="this.remove()"></div>
<h1>${title}</h1>
<p>${text}</p>
<a class="b" href="https://wa.me/260964068483">Contact Nadine Cloud</a></div></body></html>`;
}

function stripBlock(text) {
  const s = text.indexOf(START), e = text.indexOf(END);
  if (s === -1 || e === -1) return text;
  return (text.slice(0, s) + text.slice(e + END.length)).replace(/^\s*\n/, '');
}

// Returns { ok, how, user?, reason? }
async function pauseSite(rawDomain, why = 'Unpaid renewal') {
  const domain = clean(rawDomain);
  if (!domain || PROTECTED_DOMAINS.has(domain)) return { ok: false, reason: 'protected_or_missing_domain' };

  const user = await accountForDomain(domain);
  if (user && user !== OUR_ACCOUNT) {
    const r = await whmRequest(`/json-api/suspendacct?api.version=1&user=${encodeURIComponent(user)}&reason=${encodeURIComponent(`${why} (${domain})`)}`);
    const ok = r.body?.metadata?.result === 1;
    return ok ? { ok, how: `whm:${user}`, user } : { ok: false, reason: r.body?.metadata?.reason || `whm_http_${r.httpStatus}` };
  }

  const dir = addonDocroot(domain);
  if (!dir) return { ok: false, reason: 'site_folder_not_found' };
  const ht = path.join(dir, '.htaccess');
  const old = fs.existsSync(ht) ? fs.readFileSync(ht, 'utf8') : '';
  const scope = SCOPED_SUSPEND[domain];
  fs.writeFileSync(path.join(dir, PAGE), pausedPage(domain, Boolean(scope)));
  let rules;
  if (scope) {
    // Only the listed parts: pages go to the "suspended" page, data requests are refused.
    const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pages = scope.filter((p) => !p.startsWith('api/')).map(esc);
    const apis = scope.filter((p) => p.startsWith('api/')).map(esc);
    rules = [
      pages.length ? `RewriteRule ^(${pages.join('|')})(\\.html)?(/.*)?$ /${PAGE} [R=302,L]` : '',
      apis.length ? `RewriteRule ^(${apis.join('|')})(/.*)?$ - [F,L]` : '',
    ].filter(Boolean).join('\n');
  } else {
    rules = `RewriteCond %{REQUEST_URI} !^/nc-paused\\.html$\nRewriteRule ^ /${PAGE} [R=302,L]`;
  }
  const block = `${START}\nRewriteEngine On\n${rules}\n${END}\n`;
  fs.writeFileSync(ht, block + stripBlock(old));
  return { ok: true, how: scope ? 'htaccess-scoped' : 'htaccess' };
}

async function unpauseSite(rawDomain, how) {
  const domain = clean(rawDomain);
  if (!domain) return { ok: false, reason: 'missing_domain' };
  if (how && how.startsWith('whm:')) {
    const user = how.slice(4);
    const r = await whmRequest(`/json-api/unsuspendacct?api.version=1&user=${encodeURIComponent(user)}`);
    return r.body?.metadata?.result === 1 ? { ok: true } : { ok: false, reason: r.body?.metadata?.reason || `whm_http_${r.httpStatus}` };
  }
  const dir = addonDocroot(domain);
  if (!dir) return { ok: false, reason: 'site_folder_not_found' };
  const ht = path.join(dir, '.htaccess');
  if (fs.existsSync(ht)) fs.writeFileSync(ht, stripBlock(fs.readFileSync(ht, 'utf8')));
  try { fs.unlinkSync(path.join(dir, PAGE)); } catch { /* already gone */ }
  return { ok: true };
}

// Database side: un-pause every paused record for this domain (used when a payment arrives).
async function resumePausedSite(rawDomain) {
  const { getPool } = require('./db');
  const domain = clean(rawDomain);
  const r = await getPool().query(
    `SELECT reference, suspended_how FROM orders WHERE lower(regexp_replace(domain, '^www\\.', '')) = $1 AND suspended_at IS NOT NULL`,
    [domain]
  );
  if (!r.rowCount) return { ok: true, reason: 'not_paused' };
  const how = r.rows.find((x) => x.suspended_how)?.suspended_how || 'htaccess';
  const res = await unpauseSite(domain, how);
  if (!res.ok) return res;
  await getPool().query('UPDATE orders SET suspended_at = NULL, suspended_how = NULL WHERE reference = ANY($1)', [r.rows.map((x) => x.reference)]);
  return { ok: true, resumed: true };
}

module.exports = {
  pauseSite, unpauseSite, resumePausedSite, stripBlock,
  whmRequest, ensurePackagesExist, createAccount, PACKAGES, WHM_HOST,
  HOSTING_PACKAGES, DATABASE_PACKAGES, WORDPRESS_PACKAGES, BUILDER_PACKAGES,
};
