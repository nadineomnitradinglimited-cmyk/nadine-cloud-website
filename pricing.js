// Server-side price check for /api/checkout.
//
// The browser sends the amount in the checkout request, so it can never be trusted: a customer could
// edit it and pay ZMW 1 for something that costs real money (a domain registered automatically,
// a hosting account, ...). This module knows the real prices and rejects any amount below them.
//
// KEEP IN SYNC with the prices on the website pages (web/app/*/page.tsx) and the discount table in
// web/public/js/billing-toggle.js. Prices are in ZMW. Promo codes are applied AFTER this check
// (against the amount that passed), so this only ever sees the list price.

const { checkAvailability } = require('./registrar');

// Same table as billing-toggle.js (months, discount) -- hosting only offers the longer periods.
const PERIODS = {
  mo: { months: 1, discount: 0 },
  '6mo': { months: 6, discount: 0.10 },
  yr: { months: 12, discount: 0.15 },
  '2yr': { months: 24, discount: 0.20 },
  '3yr': { months: 36, discount: 0.25 },
};

// Hosting: real recurring monthly price; `intro` is the first-month price shown for "Monthly".
const HOSTING = {
  avara: { base: 99, intro: 50 },
  elora: { base: 179 },
  veyra: { base: 299 },
  zyra: { base: 499 },
};

// Fixed-price products (price for the billing period the site sells them in).
const DATABASE = { orin: 79, kaia: 149, velora: 249, zenix: 399, astra: 649, vantis: 999 };
const WORDPRESS = { wpstarter: 149, wpgrowth: 279, wppro: 449 };
const CARE = { 'care-essential': 199, 'care-growth': 349, 'care-premium': 599 };
const SSL = { 'ssl-standard': 350, 'ssl-wildcard': 1200, 'ssl-ev': 2500 };
const BUILDER_MONTHLY = 59;
const BUNDLE_LAUNCH = 850;
// Launch offer: ZMW 659 until the end of the site banner's countdown
// (keep in sync with LAUNCH_OFFER in web/public/js/promo-banner.js), then back to 850.
const BUNDLE_LAUNCH_OFFER = 659;
const LAUNCH_OFFER_END = Date.parse('2026-10-26T23:59:59+02:00');
function launchPrice() {
  return Date.now() < LAUNCH_OFFER_END ? BUNDLE_LAUNCH_OFFER : BUNDLE_LAUNCH;
}
const EMAIL_BY_PLAN = { 'basic email': 300, 'business email': 600, 'enterprise email': 1200 };

// Never accept less than 0.5% under the expected price (covers rounding only).
const TOLERANCE = 0.995;
// Domains: exchange rate and registrar price move, so allow a wider margin below the live estimate.
const DOMAIN_TOLERANCE = 0.93;

let rateCache = { value: null, at: 0 };
async function usdToZmw() {
  if (rateCache.value && Date.now() - rateCache.at < 6 * 60 * 60 * 1000) return rateCache.value;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const rate = data && data.rates && data.rates.ZMW;
    if (Number.isFinite(rate) && rate > 1) {
      rateCache = { value: rate, at: Date.now() };
      return rate;
    }
  } catch { /* fall through to the fallback */ }
  return rateCache.value || parseFloat(process.env.USD_ZMW_FALLBACK || '18');
}

function hostingExpected(pkg, period) {
  const plan = HOSTING[pkg];
  const cfg = PERIODS[period];
  if (!plan || !cfg) return null;
  if (period === 'mo' && plan.intro) return plan.intro;
  return Math.round(plan.base * cfg.months * (1 - cfg.discount));
}

// Returns { ok: true } or { ok: false, error, expected } where expected is the list price (ZMW) when known.
async function checkPrice({ type, pkg, period, plan, domain, amount }) {
  const fail = (expected) => ({
    ok: false,
    expected,
    error: 'This price is out of date or incorrect. Please go back, refresh the page, and choose your plan again.',
  });
  const accept = (expected) => (amount >= Math.floor(expected * TOLERANCE) ? { ok: true } : fail(expected));

  switch (type) {
    case 'hosting': {
      const expected = hostingExpected(pkg, period || 'mo');
      return expected === null ? fail(null) : accept(expected);
    }
    case 'database': return DATABASE[pkg] ? accept(DATABASE[pkg]) : fail(null);
    case 'wordpress': return WORDPRESS[pkg] ? accept(WORDPRESS[pkg]) : fail(null);
    case 'care': return CARE[pkg] ? accept(CARE[pkg]) : fail(null);
    case 'ssl': return SSL[pkg] ? accept(SSL[pkg]) : fail(null);
    case 'builder': return accept(BUILDER_MONTHLY);
    case 'bundle': return accept(launchPrice());
    case 'email': {
      const expected = EMAIL_BY_PLAN[String(plan || '').trim().toLowerCase()];
      return expected ? accept(expected) : fail(null);
    }
    case 'domain': {
      // Price comes from the registrar (USD) x the day's exchange rate: a customer must never pay
      // less than the domain costs us.
      let quote;
      try {
        [quote] = await checkAvailability([domain]);
      } catch (err) {
        return { ok: false, error: 'We could not confirm the price of that domain right now. Please try again in a moment.' };
      }
      if (!quote || !quote.available) return { ok: false, error: `${domain} is not available to register.` };
      if (quote.isPremium || typeof quote.price !== 'number') {
        return { ok: false, error: `${domain} is a premium domain. Please contact us on WhatsApp to buy it.` };
      }
      const expected = Math.ceil(quote.price * (await usdToZmw()));
      return amount >= Math.floor(expected * DOMAIN_TOLERANCE) ? { ok: true } : fail(expected);
    }
    default:
      // Unknown or empty product type: nothing is provisioned and no domain is bought automatically for these,
      // so a low amount can't cost money. Allowed as before.
      return { ok: true };
  }
}

module.exports = { checkPrice, hostingExpected, usdToZmw, PERIODS, HOSTING };
