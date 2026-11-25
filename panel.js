// =====================================================================================================
// Nadine Cloud client panel — modern, automatic controls for a client's own cPanel hosting account,
// shown inside www.nadinecloud.com/account (no need to learn cPanel).
//
//  - One-click "Open cPanel" (a one-time login link made by our reseller WHM; the client never types a password)
//  - Usage at a glance: disk, bandwidth, email accounts, databases, SSL
//  - Email accounts: list, create, delete
//  - Deploy from GitHub (Railway-style): connect a repository once; every new commit is pulled automatically,
//    copied into the website folder (the .git folder is never made public) and listed with its status.
//
// Every request is checked: the logged-in client (confirmed email) may only touch hosting accounts that appear
// in their own paid orders. The owner can test with the admin secret (x-admin-secret + ?as=<domain>).
// Until PANEL_PUBLIC=1 is set, only the owner (admin secret) can use it — clients don't see it yet.
// =====================================================================================================
const crypto = require('crypto');
const { getSessionUser } = require('./auth');
const { isConfigured: dbConfigured, getPool, ensureSchema } = require('./db');

const WHM_HOST = 'https://secure375.servconfig.com:2087';
const WHM_USER = 'nadine14';
const HOSTING_TYPES = new Set(['hosting', 'wordpress', 'builder', 'database']);
const DEPLOY_EVERY_MS = 2 * 60 * 1000;

// ---------- WHM / cPanel API (reseller) ----------
async function whm(pathAndQuery) {
  const token = process.env.WHM_API_TOKEN;
  if (!token) throw new Error('WHM_NOT_CONFIGURED');
  const res = await fetch(`${WHM_HOST}${pathAndQuery}`, { headers: { Authorization: `whm ${WHM_USER}:${token}` } });
  return res.json().catch(() => ({}));
}
async function uapi(user, mod, fn, params = {}) {
  const q = new URLSearchParams({ 'api.version': '1', 'cpanel.user': user, 'cpanel.module': mod, 'cpanel.function': fn, ...params });
  const j = await whm('/json-api/uapi_cpanel?' + q);
  return (j.data && j.data.uapi) || { status: 0, errors: ['No answer from the server'] };
}
async function api2(user, mod, fn, params = {}) {
  const q = new URLSearchParams({ cpanel_jsonapi_user: user, cpanel_jsonapi_apiversion: '2', cpanel_jsonapi_module: mod, cpanel_jsonapi_func: fn, ...params });
  const j = await whm('/json-api/cpanel?' + q);
  return j.cpanelresult || {};
}
const firstError = (u) => (u && u.errors && u.errors.length ? String(u.errors[0]) : 'Something went wrong — please try again.');

// domain -> cPanel user (only accounts owned by our reseller are returned by WHM)
const acctCache = new Map();
async function accountForDomain(domain) {
  const d = String(domain || '').toLowerCase().replace(/^www\./, '');
  const hit = acctCache.get(d);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.acct;
  const j = await whm('/json-api/listaccts?api.version=1&searchtype=domain&searchmethod=exact&search=' + encodeURIComponent(d));
  const a = (j.data && j.data.acct || []).find((x) => String(x.domain).toLowerCase() === d) || null;
  const acct = a ? { user: a.user, domain: a.domain, plan: String(a.plan || '').replace(/^nadine14_/, ''), suspended: !!a.suspended, ip: a.ip, startdate: a.startdate, started: Number(a.unix_startdate) || null } : null;
  acctCache.set(d, { at: Date.now(), acct });
  return acct;
}

// ---------- who is asking, and which accounts may they touch ----------
function adminOk(req) {
  const s = process.env.ADMIN_SECRET; const g = req.headers['x-admin-secret'];
  if (!s || typeof g !== 'string' || g.length !== s.length) return false;
  return crypto.timingSafeEqual(Buffer.from(g), Buffer.from(s));
}
async function allowedDomains(req, q) {
  if (adminOk(req)) return { who: 'owner', domains: q.get('as') ? [q.get('as').toLowerCase()] : [] };
  if (process.env.PANEL_PUBLIC !== '1') return null;            // hidden from clients until approved
  const user = await getSessionUser(req);
  if (!user || !user.email_verified_at) return null;
  const r = await getPool().query(
    `SELECT DISTINCT lower(regexp_replace(domain, '^www\\.', '')) AS d FROM orders
      WHERE (user_id = $1 OR lower(email) = lower($2)) AND status = 'paid' AND domain IS NOT NULL AND type = ANY($3)`,
    [user.id, user.email, [...HOSTING_TYPES]]
  );
  return { who: 'client', user, domains: r.rows.map((x) => x.d) };
}

// ---------- tables ----------
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  await ensureSchema();
  await getPool().query(`CREATE TABLE IF NOT EXISTS panel_projects (
    id SERIAL PRIMARY KEY, domain TEXT UNIQUE NOT NULL, cpanel_user TEXT NOT NULL, repo_url TEXT NOT NULL, branch TEXT NOT NULL DEFAULT 'main',
    auto_deploy BOOLEAN NOT NULL DEFAULT TRUE, last_commit TEXT, last_message TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`);
  await getPool().query(`CREATE TABLE IF NOT EXISTS panel_deployments (
    id SERIAL PRIMARY KEY, project_id INT NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE, commit_id TEXT, message TEXT, author TEXT,
    status TEXT NOT NULL, log TEXT, trigger TEXT, started_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ)`);
  await getPool().query('ALTER TABLE panel_projects ADD COLUMN IF NOT EXISTS repo_root TEXT');
  await getPool().query('ALTER TABLE panel_projects ADD COLUMN IF NOT EXISTS deployed_items TEXT');
  tablesReady = true;
}

// ---------- can the panel show a live preview of the site? (it answers, and allows being shown in a frame) ----------
async function canPreview(domain) {
  try {
    const r = await fetch('https://' + domain + '/', { redirect: 'follow', signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'NadineCloudPanel/1.0' } });
    if (r.status >= 400) return false;
    const xfo = String(r.headers.get('x-frame-options') || '').toLowerCase();
    const csp = String(r.headers.get('content-security-policy') || '').toLowerCase();
    if (xfo.includes('deny') || xfo.includes('sameorigin')) return false;
    const fa = csp.match(/frame-ancestors([^;]*)/);
    if (fa && !/\*|nadinecloud\.com/.test(fa[1])) return false;
    return true;
  } catch (e) { return false; }
}

// ---------- account overview ----------
async function overview(acct) {
  const [stats, ssl, pops, preview] = await Promise.all([
    uapi(acct.user, 'StatsBar', 'get_stats', { display: 'diskusage|bandwidthusage|emailaccounts|mysqldatabases|subdomains' }),
    uapi(acct.user, 'SSL', 'installed_hosts'),
    uapi(acct.user, 'Email', 'list_pops'),
    canPreview(acct.domain),
  ]);
  const s = {};
  (stats.data || []).forEach((x) => { s[x.name] = { used: x._count ?? x.count, max: x._max ?? x.max, units: x.units, percent: Number(x.percent) || 0 }; });
  const cert = (ssl.data || []).find((c) => String(c.servername).toLowerCase() === acct.domain.toLowerCase());
  await ensureTables();
  const p = await getPool().query('SELECT repo_url, branch, auto_deploy, last_commit, last_message, updated_at FROM panel_projects WHERE domain = $1', [acct.domain.toLowerCase()]);
  return {
    domain: acct.domain, plan: acct.plan, suspended: acct.suspended, since: acct.startdate,
    // a brand-new account is not served by the web server for a few minutes
    justCreated: !!(acct.started && Date.now() / 1000 - acct.started < 15 * 60),
    usage: s, preview,
    ssl: cert ? { ok: true, validUntil: cert.certificate && cert.certificate.not_after ? new Date(cert.certificate.not_after * 1000).toISOString() : null } : { ok: false },
    emailCount: (pops.data || []).filter((x) => x.login !== 'Main Account').length,
    deploy: p.rows[0] || null,
  };
}

// ---------- Databases (site + database) ----------
// One click: database + its own user + full access on that database, and the connection details saved in a private
// file the website can read (in the home folder, OUTSIDE public_html, so visitors can never download it).
function strongPassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(22), (b) => c[b % c.length]).join('');
}
async function dbRestrictions(user) {
  const r = await uapi(user, 'Mysql', 'get_restrictions');
  const d = r.data || {};
  return { prefix: d.prefix || (user.slice(0, 16) + '_'), maxDb: Number(d.max_database_name_length) || 64, maxUser: Number(d.max_username_length) || 32 };
}
async function writeDbConfig(acct, short, database, user, password) {
  const php = `<?php\n// Database connection for ${acct.domain} (created by Nadine Cloud). Keep this file private.\n// In your site:  $db = require __DIR__ . '/../nadinecloud-db-${short}.php';\nreturn [\n  'host' => 'localhost',\n  'port' => 3306,\n  'database' => '${database}',\n  'user' => '${user}',\n  'password' => '${password}',\n];\n`;
  const env = `# Database connection for ${acct.domain} (created by Nadine Cloud). Keep this file private.\nDB_HOST=localhost\nDB_PORT=3306\nDB_NAME=${database}\nDB_USER=${user}\nDB_PASSWORD=${password}\nDATABASE_URL=mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:3306/${database}\n`;
  const a = await uapi(acct.user, 'Fileman', 'save_file_content', { dir: `/home/${acct.user}`, file: `nadinecloud-db-${short}.php`, content: php });
  const b = await uapi(acct.user, 'Fileman', 'save_file_content', { dir: `/home/${acct.user}`, file: `nadinecloud-db-${short}.env`, content: env });
  return !!(a.status && b.status);
}
async function createDatabase(acct, rawName) {
  const short = String(rawName || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
  if (!short) return { ok: false, error: 'Use letters and numbers for the database name, e.g. bookings.' };
  const { prefix, maxDb, maxUser } = await dbRestrictions(acct.user);
  const database = (prefix + short).slice(0, maxDb);
  const user = (prefix + short).slice(0, maxUser);
  const password = strongPassword();
  const c = await uapi(acct.user, 'Mysql', 'create_database', { name: database });
  if (!c.status) return { ok: false, error: firstError(c) };
  const u = await uapi(acct.user, 'Mysql', 'create_user', { name: user, password });
  if (!u.status) { await uapi(acct.user, 'Mysql', 'delete_database', { name: database }); return { ok: false, error: firstError(u) }; }
  const g = await uapi(acct.user, 'Mysql', 'set_privileges_on_database', { user, database, privileges: 'ALL PRIVILEGES' });
  if (!g.status) return { ok: false, error: firstError(g) };
  const saved = await writeDbConfig(acct, short, database, user, password);
  return { ok: true, database, user, password, host: 'localhost', port: 3306, configSaved: saved, configFile: `nadinecloud-db-${short}.php`, envFile: `nadinecloud-db-${short}.env`, short };
}

// ---------- GitHub deploys ----------
// each connected repository gets its own folder (stored per project), so leftovers can never block a new connection
const repoRoot = (project) => project.repo_root || `/home/${project.cpanel_user}/repositories/nc-site`;
const repoRel = (project) => repoRoot(project).replace(/^\/home\/[^/]+\//, '');
function cleanRepoUrl(url, token) {
  const u = String(url || '').trim().replace(/\.git$/, '') + '.git';
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(u)) return null;
  return token ? u.replace('https://', `https://${encodeURIComponent(token)}@`) : u;
}
async function copyToWebsite(acct, project) {
  const list = await uapi(acct.user, 'Fileman', 'list_files', { dir: repoRel(project), show_hidden: '1' });
  if (!list.status) return { ok: false, log: 'Could not read the repository: ' + firstError(list) };
  // never publish the .git folder or the deploy settings
  const entries = (list.data || []).filter((f) => f.file !== '.git' && f.file !== '.github' && f.file !== '.cpanel.yml')
    .map((f) => ({ name: f.file, dir: f.type === 'dir' }));
  const items = entries.map((e) => e.name);
  if (!items.length) return { ok: false, log: 'The repository is empty.' };
  // Clear what the PREVIOUS deploy put on the website (only those items, never the client's other files), so files deleted
  // in GitHub disappear and folders don't keep old files: removed items + previously deployed folders (re-copied fresh below).
  let prev = []; try { prev = JSON.parse(project.deployed_items || '[]'); } catch { prev = []; }
  const KEEP = new Set(['cgi-bin', '.well-known']);
  const clear = prev.filter((p) => p && p.name && !KEEP.has(p.name) && !/[\/\\]|^\.\.?$/.test(p.name) && (p.dir || !items.includes(p.name))).map((p) => p.name);
  let removed = 0;
  if (clear.length) {
    const u = await api2(acct.user, 'Fileman', 'fileop', { op: 'unlink', sourcefiles: clear.map((n) => `/home/${acct.user}/public_html/${n}`).join(','), doubledecode: '0' });
    removed = (u.data || []).filter((x) => x.result).length;
  }
  const r = await api2(acct.user, 'Fileman', 'fileop', { op: 'copy', sourcefiles: items.map((f) => repoRel(project) + '/' + f).join(','), destfiles: `/home/${acct.user}/public_html`, doubledecode: '0' });
  const res = r.data || [];
  const failed = res.filter((x) => !x.result);
  const ok = res.length > 0 && failed.length === 0;
  if (ok) await getPool().query('UPDATE panel_projects SET deployed_items = $2 WHERE id = $1', [project.id, JSON.stringify(entries)]);
  const gone = prev.filter((p) => p && p.name && !items.includes(p.name)).length;
  return { ok, log: `Copied ${res.length - failed.length} of ${items.length} items to the website${gone ? `; removed ${gone} item${gone === 1 ? '' : 's'} deleted from GitHub` : ''}${failed.length ? ' — failed: ' + failed.map((x) => x.src.split('/').pop()).join(', ') : ''}.` };
}
async function repoHead(acct, project) {
  const r = await uapi(acct.user, 'VersionControl', 'retrieve');
  const repo = (r.data || []).find((x) => x.repository_root === repoRoot(project));
  return repo ? { branch: repo.branch, id: repo.last_update && repo.last_update.identifier, message: repo.last_update && repo.last_update.message, author: repo.last_update && repo.last_update.author } : null;
}
async function runDeploy(project, acct, trigger) {
  await ensureTables();
  const before = await repoHead(acct, project);
  const branch = project.branch || (before && before.branch) || 'main';   // empty = the repository's own default branch
  const pull = await uapi(acct.user, 'VersionControl', 'update', { repository_root: repoRoot(project), branch });
  const head = await repoHead(acct, project);
  if (!pull.status || !head) {
    await getPool().query('INSERT INTO panel_deployments (project_id, status, log, trigger, finished_at) VALUES ($1, $2, $3, $4, now())', [project.id, 'failed', 'Could not get the latest code from GitHub: ' + firstError(pull), trigger]);
    return { ok: false };
  }
  if (trigger === 'auto' && head.id && head.id === project.last_commit) return { ok: true, unchanged: true };
  const ins = await getPool().query('INSERT INTO panel_deployments (project_id, commit_id, message, author, status, trigger) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [project.id, head.id, String(head.message || '').slice(0, 500), String(head.author || '').replace(/<[^>]*>/, '').trim().slice(0, 120), 'building', trigger]);
  const copy = await copyToWebsite(acct, project);
  await getPool().query('UPDATE panel_deployments SET status = $2, log = $3, finished_at = now() WHERE id = $1', [ins.rows[0].id, copy.ok ? 'live' : 'failed', copy.log]);
  if (copy.ok) await getPool().query('UPDATE panel_projects SET last_commit = $2, last_message = $3, updated_at = now() WHERE id = $1', [project.id, head.id, String(head.message || '').slice(0, 500)]);
  return { ok: copy.ok };
}
let sweeping = false;
async function autoDeploySweep() {
  if (sweeping || !dbConfigured() || !process.env.WHM_API_TOKEN) return;
  sweeping = true;
  try {
    await ensureTables();
    const r = await getPool().query('SELECT * FROM panel_projects WHERE auto_deploy = TRUE');
    for (const p of r.rows) {
      const acct = await accountForDomain(p.domain).catch(() => null);
      if (acct && !acct.suspended) await runDeploy(p, acct, 'auto').catch((e) => console.error('auto deploy', p.domain, e.message));
    }
  } catch (e) { console.error('panel auto-deploy sweep:', e.message); } finally { sweeping = false; }
}
setInterval(() => { autoDeploySweep(); }, DEPLOY_EVERY_MS).unref();

// ---------- HTTP ----------
function send(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 20000) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } }); }); }

async function handlePanel(req, res, urlPath) {
  if (!dbConfigured()) return send(res, 503, { error: 'Not available yet.' });
  // a server cron calls this every 2 minutes (the app may sleep between visits, so a timer alone is not enough)
  if (req.method === 'POST' && urlPath === '/api/panel/sweep') {
    if (!adminOk(req)) return send(res, 401, { error: 'Unauthorized' });
    await autoDeploySweep();
    return send(res, 200, { ok: true });
  }
  const q = new URLSearchParams(req.url.split('?')[1] || '');
  let who;
  try { who = await allowedDomains(req, q); } catch (e) { return send(res, 500, { error: 'Could not check your account.' }); }
  if (!who) return send(res, 401, { error: 'Please log in.' });
  const p = req.method === 'POST' ? await body(req) : {};
  const wanted = String(p.domain || q.get('domain') || '').toLowerCase().replace(/^www\./, '');
  const pick = async () => {
    if (!wanted || !who.domains.includes(wanted)) return null;
    return accountForDomain(wanted);
  };
  try {
    if (req.method === 'GET' && urlPath === '/api/panel/accounts') {
      const list = [];
      for (const d of who.domains) {
        const acct = await accountForDomain(d).catch(() => null);
        if (acct) list.push(await overview(acct).catch((e) => ({ domain: d, error: e.message })));
      }
      return send(res, 200, { accounts: list, publicReady: process.env.PANEL_PUBLIC === '1' });
    }
    const acct = await pick();
    if (!acct) return send(res, 404, { error: 'Hosting account not found.' });

    if (req.method === 'POST' && urlPath === '/api/panel/open-cpanel') {
      const s = await whm('/json-api/create_user_session?api.version=1&user=' + encodeURIComponent(acct.user) + '&service=cpaneld');
      if (!(s.data && s.data.url)) return send(res, 502, { error: 'Could not open cPanel right now.' });
      return send(res, 200, { url: s.data.url });                 // one-time, short-lived login link
    }
    if (req.method === 'GET' && urlPath === '/api/panel/email') {
      const r = await uapi(acct.user, 'Email', 'list_pops_with_disk');
      return send(res, 200, { accounts: (r.data || []).filter((x) => x.login !== 'Main Account').map((x) => ({ email: x.email, usedMB: Number(x.diskused) || 0, quotaMB: x.diskquota === 'unlimited' ? null : Number(x.diskquota) || null })), webmail: `https://${acct.domain}/webmail` });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/email') {
      const local = String(p.name || '').toLowerCase().trim();
      if (!/^[a-z0-9._-]{1,40}$/.test(local)) return send(res, 400, { error: 'Use letters, numbers, dots or dashes for the address.' });
      if (String(p.password || '').length < 10) return send(res, 400, { error: 'The password must be at least 10 characters.' });
      const r = await uapi(acct.user, 'Email', 'add_pop', { email: local, domain: acct.domain, password: String(p.password), quota: String(Math.max(250, Math.min(5000, Number(p.quotaMB) || 1024))) });
      return r.status ? send(res, 200, { ok: true, email: `${local}@${acct.domain}` }) : send(res, 400, { error: firstError(r) });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/email/delete') {
      const email = String(p.email || '').toLowerCase();
      if (!email.endsWith('@' + acct.domain.toLowerCase())) return send(res, 400, { error: 'That address is not on this website.' });
      const r = await uapi(acct.user, 'Email', 'delete_pop', { email: email.split('@')[0], domain: acct.domain });
      return r.status ? send(res, 200, { ok: true }) : send(res, 400, { error: firstError(r) });
    }
    if (req.method === 'GET' && urlPath === '/api/panel/databases') {
      const r = await uapi(acct.user, 'Mysql', 'list_databases');
      const lim = await uapi(acct.user, 'StatsBar', 'get_stats', { display: 'mysqldatabases' });
      const m = (lim.data || [])[0] || {};
      return send(res, 200, {
        databases: (r.data || []).map((d) => ({ name: d.database, sizeMB: Math.round((Number(d.disk_usage) || 0) / 1048576 * 10) / 10, users: d.users || [] })),
        used: Number(m._count ?? m.count) || (r.data || []).length, max: m._max ?? m.max ?? null,
      });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/databases') {
      const r = await createDatabase(acct, p.name);
      return r.ok ? send(res, 200, r) : send(res, 400, { error: r.error });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/databases/password') {
      const database = String(p.database || '');
      const list = await uapi(acct.user, 'Mysql', 'list_databases');
      const db = (list.data || []).find((d) => d.database === database);
      if (!db) return send(res, 404, { error: 'Database not found.' });
      const user = (db.users || [])[0];
      if (!user) return send(res, 400, { error: 'This database has no user yet.' });
      const password = strongPassword();
      const r = await uapi(acct.user, 'Mysql', 'set_password', { user, password });
      if (!r.status) return send(res, 400, { error: firstError(r) });
      const { prefix } = await dbRestrictions(acct.user);
      const short = database.startsWith(prefix) ? database.slice(prefix.length) : database;
      const saved = await writeDbConfig(acct, short, database, user, password);
      return send(res, 200, { ok: true, database, user, password, host: 'localhost', port: 3306, configSaved: saved, configFile: `nadinecloud-db-${short}.php`, envFile: `nadinecloud-db-${short}.env` });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/databases/delete') {
      const database = String(p.database || '');
      const list = await uapi(acct.user, 'Mysql', 'list_databases');
      const db = (list.data || []).find((d) => d.database === database);
      if (!db) return send(res, 404, { error: 'Database not found.' });
      const r = await uapi(acct.user, 'Mysql', 'delete_database', { name: database });
      if (!r.status) return send(res, 400, { error: firstError(r) });
      for (const u of db.users || []) await uapi(acct.user, 'Mysql', 'delete_user', { name: u });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/phpmyadmin') {
      const s = await whm('/json-api/create_user_session?api.version=1&user=' + encodeURIComponent(acct.user) + '&service=cpaneld&app=Database_phpMyAdmin');
      if (!(s.data && s.data.url)) return send(res, 502, { error: 'Could not open phpMyAdmin right now.' });
      return send(res, 200, { url: s.data.url });
    }
    if (req.method === 'GET' && urlPath === '/api/panel/deploy') {
      await ensureTables();
      const pr = await getPool().query('SELECT id, repo_url, branch, auto_deploy, last_commit, last_message, created_at FROM panel_projects WHERE domain = $1', [acct.domain.toLowerCase()]);
      const project = pr.rows[0] || null;
      const runs = project ? (await getPool().query('SELECT id, commit_id, message, author, status, log, trigger, started_at, finished_at FROM panel_deployments WHERE project_id = $1 ORDER BY id DESC LIMIT 25', [project.id])).rows : [];
      if (project) project.repo_url = project.repo_url.replace(/https:\/\/[^@/]+@/, 'https://');  // never send a token back
      return send(res, 200, { project, runs });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/deploy/connect') {
      await ensureTables();
      const url = cleanRepoUrl(p.repo, p.token);
      if (!url) return send(res, 400, { error: 'Paste the GitHub link of your repository, like https://github.com/your-name/your-site' });
      const branch = /^[A-Za-z0-9._/-]{1,80}$/.test(String(p.branch || '').trim()) ? String(p.branch).trim() : '';
      const exists = await getPool().query('SELECT id FROM panel_projects WHERE domain = $1', [acct.domain.toLowerCase()]);
      if (exists.rows[0]) return send(res, 409, { error: 'A repository is already connected to this website.' });
      const root = `/home/${acct.user}/repositories/nc-site-${Date.now().toString(36)}`;
      const c = await uapi(acct.user, 'VersionControl', 'create', { type: 'git', name: 'nc-site-' + Date.now().toString(36), repository_root: root, source_repository: JSON.stringify({ remote_name: 'origin', url }), checkout: '1' });
      if (!c.status) return send(res, 400, { error: 'GitHub refused: ' + firstError(c) + ' (for a private repository, add an access token).' });
      const ins = await getPool().query('INSERT INTO panel_projects (domain, cpanel_user, repo_url, branch, repo_root) VALUES ($1, $2, $3, $4, $5) RETURNING *', [acct.domain.toLowerCase(), acct.user, url, branch, root]);
      setTimeout(() => runDeploy(ins.rows[0], acct, 'first').catch(() => {}), 15000);   // cloning finishes in the background
      // "site + database": optionally create the site's database in the same step
      let database = null;
      if (p.database) {
        const d = await createDatabase(acct, typeof p.database === 'string' ? p.database : 'site');
        database = d.ok ? d : { error: d.error };
      }
      return send(res, 200, { ok: true, message: 'Connected. Your first deploy starts in a few seconds.', database });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/deploy/now') {
      await ensureTables();
      const pr = await getPool().query('SELECT * FROM panel_projects WHERE domain = $1', [acct.domain.toLowerCase()]);
      if (!pr.rows[0]) return send(res, 404, { error: 'Connect a repository first.' });
      const r = await runDeploy(pr.rows[0], acct, 'manual');
      return send(res, 200, { ok: r.ok });
    }
    if (req.method === 'POST' && urlPath === '/api/panel/deploy/auto') {
      await ensureTables();
      await getPool().query('UPDATE panel_projects SET auto_deploy = $2, updated_at = now() WHERE domain = $1', [acct.domain.toLowerCase(), !!p.on]);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('panel', urlPath, err);
    return send(res, 500, { error: 'Something went wrong — please try again.' });
  }
}

module.exports = { handlePanel, autoDeploySweep };
