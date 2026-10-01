const { Readable } = require('stream');
const { WHM_HOST } = require('./whm');

// Deploys straight to the WHM server's own hostname, not the customer's
// domain -- right after createAccount() (and, for a new domain, right
// after Namecheap registration), DNS for the domain almost certainly
// hasn't propagated yet, so connecting FTP to the domain itself would race
// that propagation. cPanel's main-account credentials (what createAccount()
// already returns) are also valid FTP credentials for that account.
const FTP_HOST = new URL(WHM_HOST).hostname;

async function deployDraftHtml({ username, password, html }) {
  if (process.env.FTP_DEPLOY_SANDBOX === 'true') {
    return { ok: false, reason: 'FTP deploy is in sandbox mode — upload the exported file manually via cPanel File Manager or FTP.' };
  }

  const ftp = require('basic-ftp');
  const client = new ftp.Client();
  try {
    await client.access({ host: FTP_HOST, user: username, password, secure: true });
    await client.ensureDir('public_html');
    await client.uploadFrom(Readable.from(html), 'index.html');
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  } finally {
    client.close();
  }
}

module.exports = { deployDraftHtml };
