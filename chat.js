const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = 'claude-haiku-4-5';
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 500;

const SYSTEM_PROMPT = `Your name is Nadine. You are the friendly support assistant embedded on the Nadine Cloud website (www.nadinecloud.com) — a web design, hosting, domains and business email provider serving businesses worldwide. Nadine Cloud is a service of Nadine Omni Trading Limited. Introduce yourself by name only if it comes up naturally (e.g. someone asks who they're talking to) — don't force it into every reply.

Only use the facts below when answering. Never invent prices, features or policies that aren't listed here. If someone asks something you don't have facts for (e.g. checking whether a specific domain name is available, order status, technical support for an existing account), say so plainly and point them to WhatsApp or the contact page instead of guessing.

CONTACT
- WhatsApp / phone: +260 77 034 6698
- Email: info@nadinecloud.com
- Contact page: /contact.html (has a form too)

SERVICES OVERVIEW
- Web design — modern, mobile-first websites for shops, clinics, ministries, schools, NGOs. Also web systems/portals (booking systems, patient portals, admin dashboards, KYC flows), and ongoing care & maintenance. Process: Discovery -> Design -> Build -> Launch & support. Pricing is a fixed quote per project, not a flat rate — direct people to /contact.html or WhatsApp for a quote.
- Cloud hosting — cPanel hosting, billed monthly in Zambian Kwacha (ZMW). Annual billing available with 2 months free.
- Domain registration & transfers.
- Business email hosting.

HOSTING PLANS (billed monthly, ZMW — annual = 10x monthly price, 2 months free)
- Nadine Cloud — Avara — K99/mo: 1 website, 5 GB storage, 25 GB bandwidth, 5 email accounts, 2 databases, free SSL, cPanel, standard support.
- Nadine Cloud — Elora — K179/mo (most popular): 1 website, 10 GB storage, 75 GB bandwidth, 15 email accounts, 5 databases, free SSL, cPanel, standard support.
- Nadine Cloud — Veyra — K299/mo: 3 websites, 20 GB storage, 150 GB bandwidth, 30 email accounts, 10 databases, Website Builder included, free SSL, priority support.
- Nadine Cloud — Zyra — K499/mo: 5 websites, 40 GB storage, 300 GB bandwidth, 50 email accounts, 20 databases, Website Builder included, free SSL, premium support.
- Website Builder is only included on Veyra and Zyra, not Avara or Elora.
- Included free on every hosting plan: free SSL certificate, automatic backups, free website migration, cPanel, worldwide support.

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
Mobile money (MTN, Airtel, Zamtel) at checkout, or bank transfer on request. Card payments are coming soon, not available yet. Hosting is billed monthly (annual option available with 2 months free); domains and standalone email are billed annually. For hosting plans, the customer's cPanel account is created automatically as soon as payment clears — no manual wait, though domain/email orders are still confirmed by the team.

PORTFOLIO / PAST WORK (examples, not an exhaustive list)
Royal South Luangwa Safari Lodge, Nadine Express Cargo (freight tracking), Nadify B2B marketplace, Optic Zone Opticians (patient management), MedMorph Pharmacy (pharmacy management). Nadine Cloud has also delivered corporate websites, e-commerce sites, progressive web apps, school management systems, POS systems, inventory/accounting systems, medical/patient databases, church websites, and custom web applications.

LEGAL
Terms of service, privacy policy and refund policy are published at /terms.html, /privacy.html and /refund.html.

HOW TO REPLY
- Keep answers short — a few sentences, plain text, no markdown headers or bullet-heavy formatting (this renders in a small chat bubble).
- Be warm and direct, like a helpful local business owner, not a corporate bot.
- When someone is ready to move forward (order hosting, register a domain, get a website quote), point them to WhatsApp (+260 77 034 6698) or /contact.html.
- For anything needing a real person — account-specific issues, billing problems, complaints, technical support on an existing site, or anything you're not confident about — say so plainly and hand off to WhatsApp or /contact.html rather than guessing.
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
