// Lipila (Zambian payment gateway) - card payments on the hosted card page.
// The customer is sent to Lipila's page to enter the card; we never see card numbers.
// The payment result is ALWAYS confirmed by asking Lipila directly (check-status) with our API key,
// never by trusting the browser or a webhook body.
//
// Env: LIPILA_API_KEY (required), LIPILA_MODE ('live' default | 'sandbox'), LIPILA_BASE_URL (tests only).

function isConfigured() {
  return Boolean(process.env.LIPILA_API_KEY);
}

function baseUrl() {
  if (process.env.LIPILA_BASE_URL) return process.env.LIPILA_BASE_URL.replace(/\/+$/, '');
  return String(process.env.LIPILA_MODE || 'live').toLowerCase() === 'sandbox' ? 'https://api.lipila.dev' : 'https://blz.lipila.io';
}

async function lipilaRequest(pathname, { method = 'GET', body, headers } = {}) {
  const res = await fetch(baseUrl() + pathname, {
    method,
    headers: {
      Accept: 'application/json',
      'x-api-key': process.env.LIPILA_API_KEY,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  return { httpStatus: res.status, data };
}

function normaliseStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'successful' || v === 'success' || v === 'completed') return 'successful';
  if (v === 'failed' || v === 'declined' || v === 'cancelled' || v === 'canceled' || v === 'expired') return 'failed';
  return 'pending';
}

// Starts a hosted card payment. Returns { ok:true, redirectUrl } or { ok:false, error }.
async function createCardPayment({ reference, amount, currency = 'ZMW', narration, customer, backUrl, callbackUrl, referenceData }) {
  if (!isConfigured()) return { ok: false, error: 'NOT_CONFIGURED' };
  let r;
  try {
    r = await lipilaRequest('/api/v1/collections/card', {
      method: 'POST',
      headers: callbackUrl ? { callbackUrl } : undefined,
      body: JSON.stringify({
        customerInfo: customer,
        collectionRequest: {
          referenceId: reference,
          amount,
          narration,
          accountNumber: customer.phoneNumber,
          currency,
          backUrl,
          referenceData: referenceData || narration,
        },
      }),
    });
  } catch (err) {
    console.error('Lipila card request failed:', err && err.message);
    return { ok: false, error: 'NETWORK' };
  }
  const d = r.data;
  if (r.httpStatus < 200 || r.httpStatus >= 300 || !d || typeof d !== 'object') {
    console.error('Lipila card rejected:', r.httpStatus, JSON.stringify(d).slice(0, 300));
    return { ok: false, error: (d && (d.message || d.error)) || 'REJECTED' };
  }
  const redirectUrl = d.cardRedirectionUrl;
  if (typeof redirectUrl !== 'string' || !/^https:\/\//i.test(redirectUrl)) {
    console.error('Lipila card: no redirect URL in response:', JSON.stringify(d).slice(0, 300));
    return { ok: false, error: 'NO_REDIRECT' };
  }
  return { ok: true, redirectUrl };
}

// Asks Lipila for the real state of a payment.
// Returns { status: 'pending'|'successful'|'failed', amount, currency, referenceId, message } or { error }.
async function checkStatus(reference) {
  if (!isConfigured()) return { error: 'NOT_CONFIGURED' };
  let r;
  try {
    r = await lipilaRequest('/api/v1/collections/check-status?referenceId=' + encodeURIComponent(reference));
  } catch (err) {
    console.error('Lipila status request failed:', err && err.message);
    return { error: 'NETWORK' };
  }
  if (r.httpStatus === 404) return { status: 'pending', notFound: true };
  const d = r.data;
  if (r.httpStatus < 200 || r.httpStatus >= 300 || !d || typeof d.status !== 'string') return { error: 'BAD_RESPONSE' };
  return {
    status: normaliseStatus(d.status),
    amount: typeof d.amount === 'number' ? d.amount : undefined,
    currency: typeof d.currency === 'string' ? d.currency : undefined,
    referenceId: typeof d.referenceId === 'string' ? d.referenceId : undefined,
    message: typeof d.message === 'string' ? d.message : undefined,
  };
}

module.exports = { isConfigured, createCardPayment, checkStatus, normaliseStatus };
