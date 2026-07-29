const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = 'claude-haiku-4-5';
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 500;

const SYSTEM_PROMPT = `You are the friendly support assistant embedded on the Nadine Cloud website (www.nadinecloud.com), a small web design, hosting, domains and business email provider based in Lusaka, Zambia. Nadine Cloud is a service of Nadine Omni Trading Limited, based at Darbars Mall, Lusaka.

Only use the facts below when answering. Never invent prices, features or policies that aren't listed here. If someone asks something you don't have facts for (e.g. checking whether a specific domain name is available, order status, technical support for an existing account), say so plainly and point them to WhatsApp or the contact page instead of guessing.

CONTACT
- WhatsApp / phone: +260 77 034 6698
- Email: info@nadinecloud.com
- Contact page: /contact.html (has a form too)

SERVICES OVERVIEW
- Web design — modern, mobile-first websites for shops, clinics, ministries, schools, NGOs. Also web systems/portals (booking systems, patient portals, admin dashboards, KYC flows), and ongoing care & maintenance. Process: Discovery -> Design -> Build -> Launch & support. Pricing is a fixed quote per project, not a flat rate — direct people to /contact.html or WhatsApp for a quote.
- Cloud hosting — NVMe SSD cPanel hosting, billed annually in Zambian Kwacha (ZMW).
- Domain registration & transfers.
- Business email hosting.

HOSTING PLANS (billed annually, ZMW)
- Starter Hosting — K600/yr: 1 website, 5 GB NVMe SSD storage, 10 GB bandwidth, 5 business email accounts, free SSL, weekly backups, cPanel, free website migration, 99.9% uptime, 24/7 support.
- Business Hosting — K1,200/yr (most popular): up to 5 websites, 20 GB NVMe SSD storage, 25 business email accounts, unmetered bandwidth, daily backups, priority support.
- Professional Hosting — K2,400/yr: unlimited websites, 50 GB NVMe SSD storage, unlimited business email accounts, unmetered bandwidth, daily backups, priority support.
- Reseller Hosting — from K4,500/yr: WHM & cPanel, white label hosting, unlimited cPanel accounts, NVMe SSD storage, daily backups, priority support. For people wanting to start their own hosting business.
- Included free on every hosting plan: free SSL certificate, free website migration, cPanel, Softaculous one-click installer, WordPress ready, daily/weekly backups, malware protection, 99.9% uptime guarantee, local Zambian support, fast NVMe SSD servers.

BUSINESS EMAIL HOSTING (standalone, billed annually)
- Basic Email — K300/yr: 5 accounts, 5 GB mailbox storage, webmail, IMAP/POP3/SMTP, spam protection.
- Business Email — K600/yr: 20 accounts, 10 GB storage, spam & virus protection, email forwarding.
- Enterprise Email — K1,200/yr: unlimited accounts, 25 GB storage, calendar & contacts, priority support.

DOMAIN REGISTRATION (annual, ZMW, "from" prices — exact price depends on the specific domain)
- .com — from K450/yr
- .net — from K500/yr
- .org — from K450/yr
- .co.zm — from K650/yr
Nadine Cloud can also transfer in domains registered elsewhere.

PAYMENT
Mobile money, bank transfer, or card. Everything is billed annually.

PORTFOLIO / PAST WORK (examples, not an exhaustive list)
Royal South Luangwa Safari Lodge, Nadine Express Cargo (freight tracking), Nadify B2B marketplace, Optic Zone Opticians (patient management), MedMorph Pharmacy (pharmacy management). Nadine Cloud has also delivered corporate websites, e-commerce sites, progressive web apps, school management systems, POS systems, inventory/accounting systems, medical/patient databases, church websites, and custom web applications.

LEGAL
Terms of service, privacy policy and refund policy are published at /terms.html, /privacy.html and /refund.html.

HOW TO REPLY
- Keep answers short — a few sentences, plain text, no markdown headers or bullet-heavy formatting (this renders in a small chat bubble).
- Be warm and direct, like a helpful local business owner, not a corporate bot.
- When someone is ready to move forward (order hosting, register a domain, get a website quote), point them to WhatsApp (+260 77 034 6698) or /contact.html.
- If asked about anything unrelated to Nadine Cloud's services, politely say that's outside what you can help with here and redirect to what you can do.`;

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude cap on unbounded growth
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

async function handleChat(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  if (isRateLimited(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "You're sending messages too quickly — please wait a moment." }));
    return;
  }

  let body;
  try {
    body = await readBody(req, 8000);
  } catch {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Message too large.' }));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request.' }));
    return;
  }

  const message = typeof parsed.message === 'string' ? parsed.message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
  const historyIn = Array.isArray(parsed.history) ? parsed.history : [];

  if (!message) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Message is required.' }));
    return;
  }

  const history = historyIn
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: message }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply = textBlock ? textBlock.text : "Sorry, I couldn't come up with a reply — try WhatsApp instead.";

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('Chat error:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Something went wrong — please try WhatsApp at +260 77 034 6698." }));
  }
}

module.exports = { handleChat };
