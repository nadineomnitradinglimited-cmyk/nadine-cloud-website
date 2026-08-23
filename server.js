const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleChat } = require('./chat');
const { handleCheckoutInitiate, handleCheckoutStatus, handleLencoWebhook } = require('./payments');

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

  if (req.method === 'POST' && urlPath === '/api/lenco-webhook') {
    handleLencoWebhook(req, res);
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
});
