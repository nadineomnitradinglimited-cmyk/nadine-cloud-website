// Cloudflare Pages Function — forwards every /api/* request to the Nadine Cloud server on InMotion
// (origin.nadinecloud.com). The website PAGES are served by Cloudflare itself, so they stay online even
// if InMotion is down; only /api (sign-in, account, orders, payments) then answers with a friendly 503.
const ORIGIN = 'https://origin.nadinecloud.com';

const down = () => new Response(JSON.stringify({
  error: 'Our account and payment system is briefly unavailable. Please try again shortly, or email info@nadinecloud.com.',
}), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const headers = new Headers();
  for (const [k, v] of request.headers) {
    const key = k.toLowerCase();
    if (key === 'host' || key.startsWith('cf-') || key === 'x-forwarded-for' || key === 'x-real-ip') continue;
    headers.set(k, v);
  }
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-host', url.host);

  let res;
  try {
    res = await fetch(ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
  } catch {
    return down();
  }
  // Cloudflare's own "origin unreachable" errors (520–530) and gateway errors → friendly JSON instead of an HTML error page
  if ((res.status >= 520 && res.status <= 530) || res.status === 502 || res.status === 504) return down();
  return res;
}
