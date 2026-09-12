const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleChat } = require('./chat');
const { handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook, handleReceiptDownload } = require('./payments');
const { handleContact } = require('./contact');
const { handleSignup, handleLogin, handleLogout, handleMe } = require('./auth');
const { handleDomainCheck } = require('./namecheap');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// Phase 1 of the Node -> Rust migration: these three routes are now
// served by the Rust service (nadine-api-rs) instead of the Node handlers
// below, which stay in place, untouched, as an instant rollback path —
// set USE_RUST_API=false in Railway to revert to Node immediately, with
// no redeploy needed, if anything looks wrong in production.
const RUST_API_HOST = process.env.RUST_API_HOST || 'nadine-api-rs.railway.internal';
const RUST_API_PORT = Number(process.env.RUST_API_PORT) || 8080;
const USE_RUST_API = process.env.USE_RUST_API !== 'false';
// Separate toggle for auth specifically — higher stakes (real user
// accounts/sessions) than domain-check/contact/chat, so it can be rolled
// back independently without affecting those.
const USE_RUST_AUTH = process.env.USE_RUST_AUTH !== 'false';

function proxyToRust(req, res, targetPath) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers, host: RUST_API_HOST };
    if (body.length) headers['content-length'] = String(body.length);
    else delete headers['content-length'];

    const proxyReq = http.request(
      { host: RUST_API_HOST, port: RUST_API_PORT, path: targetPath, method: req.method, headers, timeout: 10000 },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('timeout', () => proxyReq.destroy(new Error('Rust API request timed out')));
    proxyReq.on('error', (err) => {
      console.error(`Rust API proxy error for ${targetPath}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Something went wrong — please try again.' }));
      }
    });
    proxyReq.end(body);
  });
  req.on('error', (err) => console.error(`Request stream error proxying ${targetPath}:`, err.message));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return path.join(root, normalized);
}

function send404(res) {
  const notFoundPath = path.join(ROOT, '404.html');
  fs.readFile(notFoundPath, (err, data) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(err ? 'Not found' : data);
  });
}

const APEX_HOST = 'nadinecloud.com';
const CANONICAL_HOST = 'www.nadinecloud.com';

const server = http.createServer((req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host === APEX_HOST) {
    res.writeHead(301, { Location: `https://${CANONICAL_HOST}${req.url}` });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    if (USE_RUST_API) proxyToRust(req, res, req.url);
    else handleChat(req, res);
    return;
  }

  const urlPath = req.url.split('?')[0];

  if (req.method === 'POST' && urlPath === '/api/checkout') {
    handleCheckoutInitiate(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath.startsWith('/api/checkout/status/')) {
    const reference = decodeURIComponent(urlPath.slice('/api/checkout/status/'.length));
    handleCheckoutStatus(req, res, reference);
    return;
  }

  if (req.method === 'GET' && urlPath.startsWith('/api/checkout/receipt/')) {
    const reference = decodeURIComponent(urlPath.slice('/api/checkout/receipt/'.length));
    handleReceiptDownload(req, res, reference);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/lenco-webhook') {
    handleLencoWebhook(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/contact') {
    if (USE_RUST_API) proxyToRust(req, res, req.url);
    else handleContact(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/signup') {
    if (USE_RUST_AUTH) proxyToRust(req, res, req.url);
    else handleSignup(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/login') {
    if (USE_RUST_AUTH) proxyToRust(req, res, req.url);
    else handleLogin(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/logout') {
    if (USE_RUST_AUTH) proxyToRust(req, res, req.url);
    else handleLogout(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/auth/me') {
    if (USE_RUST_AUTH) proxyToRust(req, res, req.url);
    else handleMe(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/domain-check') {
    if (USE_RUST_API) proxyToRust(req, res, req.url);
    else handleDomainCheck(req, res, new URLSearchParams(req.url.split('?')[1] || ''));
    return;
  }

  // Clean URLs: /hosting.html is only ever reached via this redirect, so a
  // page never actually renders at its .html address -- redirect it to the
  // extension-less URL instead. The Google Search Console verification file
  // is excluded because Google fetches that exact literal path.
  if (urlPath.endsWith('.html') && urlPath !== '/google5b0b24e4fe6f0f29.html') {
    const clean = urlPath === '/index.html' ? '/' : urlPath.slice(0, -'.html'.length);
    const query = req.url.slice(urlPath.length);
    res.writeHead(301, { Location: `${clean}${query}` });
    res.end();
    return;
  }

  let filePath;
  if (urlPath === '/') {
    filePath = safeJoin(ROOT, '/index.html');
  } else if (!path.extname(urlPath)) {
    const htmlCandidate = safeJoin(ROOT, `${urlPath}.html`);
    filePath = fs.existsSync(htmlCandidate) ? htmlCandidate : safeJoin(ROOT, urlPath);
  } else {
    filePath = safeJoin(ROOT, urlPath);
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send404(res);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Nadine Cloud site running on port ${PORT}`);
  console.log(`LENCO_API_KEY configured: ${Boolean(process.env.LENCO_API_KEY)}`);
  console.log(`RESEND_API_KEY configured: ${Boolean(process.env.RESEND_API_KEY)}`);
  console.log(`WHM_API_TOKEN configured: ${Boolean(process.env.WHM_API_TOKEN)}`);
  console.log(`ANTHROPIC_API_KEY configured: ${Boolean(process.env.ANTHROPIC_API_KEY)}`);
  console.log(`ANTHROPIC_WORKSPACE_ID configured: ${Boolean(process.env.ANTHROPIC_WORKSPACE_ID)}`);
  console.log(`DATABASE_URL configured: ${Boolean(process.env.DATABASE_URL)}`);
  console.log(`NAMECHEAP_API_KEY configured: ${Boolean(process.env.NAMECHEAP_API_KEY)}`);
  console.log(`NAMECHEAP_API_USER configured: ${Boolean(process.env.NAMECHEAP_API_USER)}`);
  console.log(`NAMECHEAP_USERNAME configured: ${Boolean(process.env.NAMECHEAP_USERNAME)}`);
  console.log(`NAMECHEAP_SANDBOX: ${process.env.NAMECHEAP_SANDBOX || '(not set)'}`);
  console.log(`USE_RUST_API: ${USE_RUST_API} (domain-check, contact, chat -> ${RUST_API_HOST}:${RUST_API_PORT})`);
  console.log(`USE_RUST_AUTH: ${USE_RUST_AUTH} (signup, login, logout, me -> ${RUST_API_HOST}:${RUST_API_PORT})`);
});
