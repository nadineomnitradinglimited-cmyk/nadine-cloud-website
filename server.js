const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleChat } = require('./chat');
const { handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook, handleReceiptDownload } = require('./payments');
const { handleContact } = require('./contact');
const { ensurePackagesExist } = require('./whm');
const { handleSignup, handleLogin, handleLogout, handleMe } = require('./auth');
const { handleDomainCheck } = require('./namecheap');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

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
    handleChat(req, res);
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
    handleContact(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/signup') {
    handleSignup(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/login') {
    handleLogin(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/auth/logout') {
    handleLogout(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/auth/me') {
    handleMe(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/domain-check') {
    handleDomainCheck(req, res, new URLSearchParams(req.url.split('?')[1] || ''));
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/admin/test-email') {
    // temporary diagnostic route: sends a real test email to whatever
    // address is passed, to confirm Resend can now deliver beyond the
    // account owner's own inbox now that nadinecloud.com is verified.
    // Remove once confirmed.
    const to = new URLSearchParams(req.url.split('?')[1] || '').get('to');
    if (!to) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Pass ?to=address@example.com' }));
      return;
    }
    require('./email').sendEmail({
      to,
      subject: 'Nadine Cloud — test email',
      text: 'If you got this, Resend is delivering correctly to addresses other than the account owner.',
    })
      .then((result) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/admin/setup-whm-packages') {
    // one-time setup route: creates the four fixed hosting packages in WHM.
    // Accepts no input and touches nothing customer-facing, so it's left
    // unauthenticated — remove this route once the packages are confirmed
    // created, it has no further purpose after that.
    ensurePackagesExist()
      .then((results) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results, null, 2));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
    return;
  }

  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);

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
});
