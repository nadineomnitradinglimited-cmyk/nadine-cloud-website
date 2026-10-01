const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { isConfigured: dbConfigured, getPool, ensureSchema } = require('./db');

// Same client-construction pattern as chat.js: reads ANTHROPIC_API_KEY from
// env implicitly via the SDK, plus the workspace header identity-linked
// keys require.
const client = new Anthropic({
  defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
    ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
    : undefined,
});

// Sonnet, not chat.js's Haiku -- the output here is the product the
// customer is about to pay to host, not a throwaway chat reply, so it's
// worth the extra cost (still only ~$0.04/generation at this size).
const MODEL = 'claude-sonnet-5';
const MAX_OUTPUT_TOKENS = 8000;
const MAX_PROMPT_LENGTH = 800;
const MAX_GENERATIONS = 5;

const SYSTEM_PROMPT = `You generate complete, professional single-page websites for small businesses, for Nadine Cloud's AI website builder.

Given a business description, output ONE complete, self-contained HTML document:
- Start with <!doctype html> and end with </html> -- nothing before or after it, no markdown code fences, no explanation.
- All CSS inline in a single <style> tag in <head>. All JS (if any) inline in <script> tags. No external stylesheets, fonts, or scripts.
- No external image URLs of any kind (no <img src="http...">, no CSS background-image url()). Build all visuals from CSS gradients, shapes, borders, and inline <svg> elements instead. This is a hard rule, not a suggestion.
- Mobile-responsive (real breakpoints, not just viewport meta).
- Include sections appropriate to the business: a hero with the business name and a one-line pitch, an about/services section reflecting what they described, a contact section (use placeholder contact details like "Message us on WhatsApp" / "info@example.com" unless the prompt gave real ones), and a footer.
- Professional, modern design -- good typography, sensible color palette, generous spacing. Avoid generic "Lorem ipsum" -- write real, specific-sounding copy based on what the business described.
- When asked to refine a previous version, output the FULL revised HTML document again (not a diff, not just the changed part) -- the whole document is always replaced wholesale.`;

const drafts = new Map();

function genDraftId() {
  return 'AID-' + crypto.randomBytes(16).toString('hex');
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
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

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
const DAILY_LIMIT_MAX = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const minuteHits = new Map();
const dailyHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recentMinute = (minuteHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recentMinute.push(now);
  minuteHits.set(ip, recentMinute);
  if (minuteHits.size > 5000) minuteHits.clear();
  if (recentMinute.length > RATE_LIMIT_MAX) return true;

  const recentDay = (dailyHits.get(ip) || []).filter((t) => now - t < DAY_MS);
  recentDay.push(now);
  dailyHits.set(ip, recentDay);
  if (dailyHits.size > 5000) dailyHits.clear();
  return recentDay.length > DAILY_LIMIT_MAX;
}

// Strips accidental ```html fences even though the system prompt asks for
// raw HTML only -- a cheap safety net, same spirit as chat.js's
// HANDOFF_TAG_RE stripping.
function stripFences(text) {
  return text.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function persistDraft(draft) {
  if (!dbConfigured()) return;
  try {
    await ensureSchema();
    await getPool().query(
      `INSERT INTO ai_drafts (draft_id, business_prompt, conversation, html, generation_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (draft_id) DO UPDATE SET
         conversation = EXCLUDED.conversation, html = EXCLUDED.html,
         generation_count = EXCLUDED.generation_count, updated_at = now()`,
      [draft.draftId, draft.businessPrompt, JSON.stringify(draft.conversation), draft.html, draft.generationCount]
    );
  } catch (err) {
    console.error('persistDraft failed (non-fatal):', err);
  }
}

// Drafts live in memory as the source of truth for the live flow, same as
// payments.js's pendingOrders -- but unlike an in-flight payment, a draft
// can represent real spent API cost and real customer work, so a restart
// shouldn't silently lose it. Fall back to Postgres when not in memory.
async function loadDraft(draftId) {
  if (drafts.has(draftId)) return drafts.get(draftId);
  if (!dbConfigured()) return null;
  try {
    await ensureSchema();
    const result = await getPool().query('SELECT * FROM ai_drafts WHERE draft_id = $1', [draftId]);
    const row = result.rows[0];
    if (!row) return null;
    const draft = {
      draftId: row.draft_id,
      businessPrompt: row.business_prompt,
      conversation: row.conversation,
      html: row.html,
      generationCount: row.generation_count,
    };
    drafts.set(draftId, draft);
    return draft;
  } catch (err) {
    console.error('loadDraft failed:', err);
    return null;
  }
}

function sandboxHtml(prompt) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Preview</title><style>body{font-family:sans-serif;padding:40px;background:#0b1220;color:#f5f8fb}</style></head><body><h1>AI_BUILDER_SANDBOX preview</h1><p>Prompt: ${prompt.replace(/[<>&]/g, '')}</p></body></html>`;
}

async function generateSite(conversation) {
  if (process.env.AI_BUILDER_SANDBOX === 'true') {
    const lastUser = [...conversation].reverse().find((m) => m.role === 'user');
    return stripFences(sandboxHtml(typeof lastUser.content === 'string' ? lastUser.content : ''));
  }
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: conversation,
  });
  const response = await stream.finalMessage();
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text in response');
  return stripFences(textBlock.text);
}

async function handleGenerate(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "You're trying too quickly — please wait a moment." });
    return;
  }

  let body;
  try {
    body = await readBody(req, 4000);
  } catch {
    sendJson(res, 413, { error: 'Request too large.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: 'Invalid request.' });
    return;
  }

  const prompt = typeof parsed.prompt === 'string' ? parsed.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : '';
  if (!prompt) {
    sendJson(res, 400, { error: 'Describe your business first.' });
    return;
  }

  const conversation = [{ role: 'user', content: prompt }];
  let html;
  try {
    html = await generateSite(conversation);
  } catch (err) {
    console.error('AI generation error:', err);
    sendJson(res, 502, { error: 'Something went wrong generating your site — please try again.' });
    return;
  }

  const draft = {
    draftId: genDraftId(),
    businessPrompt: prompt,
    conversation: [...conversation, { role: 'assistant', content: html }],
    html,
    generationCount: 1,
  };
  drafts.set(draft.draftId, draft);
  persistDraft(draft);

  sendJson(res, 200, { draftId: draft.draftId, generationsRemaining: MAX_GENERATIONS - draft.generationCount });
}

async function handleRefine(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "You're trying too quickly — please wait a moment." });
    return;
  }

  let body;
  try {
    body = await readBody(req, 4000);
  } catch {
    sendJson(res, 413, { error: 'Request too large.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: 'Invalid request.' });
    return;
  }

  const draftId = typeof parsed.draftId === 'string' ? parsed.draftId.trim() : '';
  const prompt = typeof parsed.prompt === 'string' ? parsed.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : '';
  if (!draftId || !prompt) {
    sendJson(res, 400, { error: 'Missing draft or instruction.' });
    return;
  }

  const draft = await loadDraft(draftId);
  if (!draft) {
    sendJson(res, 404, { error: 'Draft not found.' });
    return;
  }

  // Server-side enforcement -- this is the check that actually matters,
  // a client-side counter alone is trivially bypassed by replaying the
  // fetch with the same draftId.
  if (draft.generationCount >= MAX_GENERATIONS) {
    sendJson(res, 403, { error: "You've used all 5 free previews for this draft — pay for hosting to keep it, or start a new one." });
    return;
  }

  const conversation = [...draft.conversation, { role: 'user', content: prompt }];
  let html;
  try {
    html = await generateSite(conversation);
  } catch (err) {
    console.error('AI refine error:', err);
    sendJson(res, 502, { error: 'Something went wrong updating your site — please try again.' });
    return;
  }

  draft.conversation = [...conversation, { role: 'assistant', content: html }];
  draft.html = html;
  draft.generationCount += 1;
  drafts.set(draft.draftId, draft);
  persistDraft(draft);

  sendJson(res, 200, { draftId: draft.draftId, generationsRemaining: MAX_GENERATIONS - draft.generationCount });
}

async function handlePreview(req, res, draftId) {
  const draft = await loadDraft(draftId);
  if (!draft) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><p>Draft not found.</p>');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(draft.html);
}

// Entitlement-gated export -- no such check existed anywhere in this repo,
// written fresh here. Scoped to both email AND draftId so a paying
// customer's email can't be used to unlock a stranger's unrelated draft.
async function hasPaidBuilderEntitlement(email, draftId) {
  if (!dbConfigured()) return false;
  try {
    await ensureSchema();
    const result = await getPool().query(
      `SELECT 1 FROM orders WHERE email = $1 AND draft_id = $2
         AND type IN ('builder','bundle') AND status = 'paid' LIMIT 1`,
      [email, draftId]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error('hasPaidBuilderEntitlement failed:', err);
    return false;
  }
}

async function handleExport(req, res, draftId, query) {
  const email = (query.get('email') || '').trim();
  if (!email) {
    sendJson(res, 400, { error: 'Missing email.' });
    return;
  }
  const entitled = await hasPaidBuilderEntitlement(email, draftId);
  if (!entitled) {
    sendJson(res, 402, { error: 'This draft isn’t attached to a paid hosting order yet — pay for Builder or Launch to unlock the download.' });
    return;
  }
  const draft = await loadDraft(draftId);
  if (!draft) {
    sendJson(res, 404, { error: 'Draft not found.' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': 'attachment; filename="index.html"',
  });
  res.end(draft.html);
}

module.exports = { handleGenerate, handleRefine, handlePreview, handleExport, loadDraft };
