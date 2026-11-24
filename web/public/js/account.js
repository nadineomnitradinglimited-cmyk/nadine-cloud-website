/* My account panel — drawn from /api/auth/me (user + orders). */
(function(){
  const $ = (id) => document.getElementById(id);
  const loading = $('acctLoading');
  const outView = $('loggedOutView');
  const inView = $('loggedInView');
  const main = $('acMain');
  const errorEl = $('acctError');

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (window.ncFormatZmw ? window.ncFormatZmw(Number(n) || 0) : 'ZMW ' + (Number(n) || 0).toLocaleString('en-US'));
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const DAY = 864e5;
  const BILLING = 'billing@nadinecloud.com';

  const ICONS = {
    hosting: '<path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 8.5a4.5 4.5 0 0 1-.5 9.5H7Z"/>',
    managed: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    domain: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    ssl: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    builder: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 20V9"/>',
    wordpress: '<circle cx="12" cy="12" r="9"/><path d="m7 8 3 9 2-6 2 6 3-9"/>',
    care: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/>',
    other: '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    shield: '<path d="M12 3 4 6.5v5c0 5 3.4 8.7 8 9.5 4.6-.8 8-4.5 8-9.5v-5L12 3Z"/><rect x="9" y="10" width="6" height="5" rx="1"/>',
    stack: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  };
  ICONS.bundle = ICONS.builder;
  const TYPE_LABEL = { hosting: 'Hosting', managed: 'Hosting + database', database: 'Database', domain: 'Domain', email: 'Business email', ssl: 'SSL certificate', builder: 'Website builder', bundle: 'Launch bundle', wordpress: 'WordPress', care: 'Care plan' };
  const svg = (name, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.other}</svg>`;

  // ---------- one row per product; the latest renewal wins ----------
  function buildServices(orders) {
    const groups = new Map();
    orders.filter((o) => o.status === 'paid').forEach((o) => {
      const key = [o.type || 'other', o.pkg || '', String(o.domain || o.plan || '').toLowerCase().replace(/^www\./, '')].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    });
    const now = Date.now();
    const rank = { suspended: 0, overdue: 1, due: 2, active: 3 };
    return [...groups.values()].map((list) => {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = list[0];
      const withExpiry = list.filter((o) => o.expires_at).sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at));
      const expires = withExpiry[0] ? new Date(withExpiry[0].expires_at) : null;
      const daysLeft = expires ? Math.ceil((expires - now) / DAY) : null;
      let status = 'active';
      if (list.some((o) => o.suspended_at)) status = 'suspended';
      else if (daysLeft !== null && daysLeft < 0) status = 'overdue';
      else if (daysLeft !== null && daysLeft <= 14) status = 'due';
      const base = list.find((o) => /^MAN-/.test(o.reference)) || latest;
      const amount = Number(base.amount) || Number(latest.amount);
      const isManaged = latest.type === 'managed';
      const payUrl = isManaged
        ? `/checkout/?type=managed&client=${encodeURIComponent(base.reference)}&plan=${encodeURIComponent(latest.plan)}&amount=${encodeURIComponent(amount)}&period=${latest.period === 'yr' ? 'yr' : 'mo'}`
        : `mailto:${BILLING}?subject=${encodeURIComponent('Renew ' + latest.plan + (latest.domain ? ' (' + latest.domain + ')' : ''))}`;
      return { type: latest.type || 'other', plan: latest.plan, domain: latest.domain, amount, period: latest.period, expires, daysLeft, status, payUrl, isManaged };
    }).sort((a, b) => (rank[a.status] - rank[b.status]) || ((a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)));
  }

  const STATUS = { active: ['Active', 'ok'], due: ['Due soon', 'warn'], overdue: ['Overdue', 'bad'], suspended: ['Suspended', 'bad'] };

  function dateCell(s) {
    if (!s.expires) return '<span class="ac-date ok">—<small>No renewal date</small></span>';
    const cls = STATUS[s.status][1];
    let sub = `in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}`;
    if (s.status === 'suspended') sub = 'Paused';
    else if (s.daysLeft < 0) sub = `${-s.daysLeft} day${s.daysLeft === -1 ? '' : 's'} overdue`;
    else if (s.daysLeft === 0) sub = 'Today';
    return `<span class="ac-date ${cls}">${esc(fmtDate(s.expires))}<small>${esc(sub)}</small></span>`;
  }

  function actionCell(s) {
    if (s.status !== 'active') return `<a class="ac-btn pay" href="${esc(s.payUrl)}">${s.isManaged ? 'Pay now' : 'Renew'}</a>`;
    return `<a class="ac-btn" href="${esc(s.payUrl)}">${s.isManaged ? 'Pay early' : 'Manage'}</a>`;
  }

  function serviceTable(list) {
    return `<div class="ac-tbl"><div class="ac-row ac-head"><span>Service</span><span class="ac-type">Product</span><span>Status</span><span>Renews</span><span></span></div>
      ${list.map((s) => `<div class="ac-row">
        <span class="ac-svc"><span class="ac-svc-ic t-${esc(s.type)}">${svg(s.type)}</span><span style="min-width:0"><b>${esc(s.domain || s.plan)}</b><small>${esc(s.domain ? s.plan : (TYPE_LABEL[s.type] || ''))}</small></span></span>
        <span class="ac-type">${esc(TYPE_LABEL[s.type] || 'Service')}<br><small style="color:#7A8494">${esc(money(s.amount))}/${s.period === 'yr' ? 'year' : 'month'}</small></span>
        <span><span class="ac-pill ${STATUS[s.status][1]}">${STATUS[s.status][0]}</span></span>
        ${dateCell(s)}
        <span class="ac-act">${actionCell(s)}</span>
      </div>`).join('')}</div>`;
  }

  function notices() {
    const out = [];
    state.services.filter((s) => s.status !== 'active').slice(0, 2).forEach((s) => {
      const id = 'svc-' + (s.domain || s.plan);
      if (closed(id)) return;
      const title = s.status === 'suspended' ? `${s.domain || s.plan} is paused` : s.status === 'overdue' ? `${s.domain || s.plan} is overdue` : `${s.domain || s.plan} renews soon`;
      const text = s.status === 'suspended'
        ? `Your ${esc(s.plan)} is paused until the renewal of ${esc(money(s.amount))} is paid. Nothing has been deleted.`
        : s.status === 'overdue'
          ? `Your ${esc(s.plan)} was due on ${esc(fmtDate(s.expires))}. Please renew to avoid it being paused.`
          : `Your ${esc(s.plan)} renews on ${esc(fmtDate(s.expires))} (${esc(money(s.amount))}).`;
      out.push(`<div class="ac-note ${STATUS[s.status][1]}" data-note="${esc(id)}"><span class="ac-note-ic">${svg(s.status === 'due' ? 'clock' : 'alert', 1.8)}</span>
        <div><b>${esc(title)}</b>${text} <a href="${esc(s.payUrl)}">${s.isManaged ? 'Pay now →' : 'Renew now →'}</a></div>
        <button type="button" class="x" aria-label="Hide">×</button></div>`);
    });
    if (!closed('vault')) {
      out.push(`<div class="ac-note vault" data-note="vault"><span class="ac-note-ic">${svg('shield', 1.8)}</span>
        <div><b>New: Nadine Vault</b>Back up your phone's photos, videos and documents to the cloud. Start with 2 GB free. <a href="/vault">Find out more →</a></div>
        <button type="button" class="x" aria-label="Hide">×</button></div>`);
    }
    return out.join('');
  }

  function closed(id) { try { return localStorage.getItem('nc-note-' + id) === '1'; } catch (e) { return false; } }

  // ---------- email confirmation ----------
  function verifyPanel() {
    if (!state || state.user.emailVerified) return '';
    return '<div class="ac-note ac-verify" id="acVerify"><span class="ac-note-ic" style="color:#1769FF">' + svg('email', 1.8) + '</span>'
      + '<div style="flex:1"><b>Confirm your email to see your services</b>We sent a 6-digit code to <strong>' + esc(state.user.email) + '</strong>. Enter it below and everything you have with Nadine Cloud under this email will appear here: hosting, domains, databases and receipts.'
      + '<form class="ac-code" id="acCodeForm"><input id="acCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" aria-label="6-digit code"><button type="submit" class="ac-btn pay">Confirm</button>'
      + '<button type="button" class="ac-more" id="acResend" style="margin:0">Send a new code</button></form><p class="ac-code-msg" id="acCodeMsg" role="status"></p></div></div>';
  }

  function bindVerify() {
    const form = document.getElementById('acCodeForm');
    if (!form) return;
    const msg = document.getElementById('acCodeMsg');
    const say = (t, ok) => { msg.textContent = t; msg.className = 'ac-code-msg ' + (ok ? 'ok' : 'err'); };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('acCode').value.replace(/\D/g, '');
      if (code.length !== 6) return say('Please enter the 6-digit code from the email.');
      fetch('/api/auth/verify-code', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => { if (!ok) return say(d.error || 'That code did not work.'); say('Email confirmed — loading your services…', true); setTimeout(load, 600); })
        .catch(() => say('Something went wrong — please try again.'));
    });
    document.getElementById('acResend').addEventListener('click', () => {
      fetch('/api/auth/send-code', { method: 'POST', credentials: 'same-origin' })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => say(ok ? 'A new code is on its way — check your inbox (and spam).' : (d.error || 'Could not send a new code.'), ok))
        .catch(() => say('Something went wrong — please try again.'));
    });
  }

  // ---------- pages ----------
  let state = null;

  function pageDashboard() {
    const { user, services } = state;
    const due = services.filter((s) => s.status !== 'active').length;
    return `${notices()}
      <div class="ac-hello">
        <div class="ac-hello-name"><h1>Hello ${esc(user.name)}</h1><p>${user.created_at ? 'Customer since ' + esc(fmtDate(user.created_at)) : esc(user.email)}</p></div>
        <div class="ac-info"><span class="ac-info-ic">${svg('stack')}</span><div><b>Services</b><span>${services.length} in total <a href="#services" data-go="services">View</a></span></div></div>
        <div class="ac-info"><span class="ac-info-ic ${due ? 'hot' : ''}">${svg('clock')}</span><div><b>Due &amp; renewals</b><span>${due ? due + ' need attention' : 'All paid up'} <a href="#attention" data-go="attention">${due ? 'Pay' : 'View'}</a></span></div></div>
      </div>
      <form class="ac-search" action="/" method="get">
        <input name="q" type="text" placeholder="Search for your next domain" aria-label="Search for a domain">
        <button type="submit" aria-label="Search">${svg('search')}</button>
      </form>
      <h2 class="ac-h2">Your services</h2>
      ${services.length ? serviceTable(services.slice(0, 6)) + (services.length > 6 ? '<button type="button" class="ac-more" data-go="services">View all services</button>' : '') : emptyServices()}
      <div class="ac-quick">
        <a href="/domains">${svg('domain')}<b>Register a domain</b><span>.com, .org, .net and more</span></a>
        <a href="/hosting">${svg('hosting')}<b>Hosting</b><span>Fast NVMe with free SSL</span></a>
        <a href="/database">${svg('database')}<b>Database</b><span>PostgreSQL &amp; MySQL</span></a>
        <a href="/vault">${svg('shield')}<b>Nadine Vault <em>New</em></b><span>2 GB free phone backup</span></a>
      </div>`;
  }

  function emptyServices() {
    if (state && !state.user.emailVerified) return '<div class="ac-empty"><b>Confirm your email to see your services</b>Enter the code we emailed you in the blue box above.</div>';
    return `<div class="ac-empty"><b>No services yet</b>When you buy hosting, a domain or a website from us, it shows up here with its renewal date. <a class="ac-more" href="/hosting">Browse plans</a></div>`;
  }

  function pageAttention() {
    const list = state.services.filter((s) => s.status !== 'active' || (s.daysLeft !== null && s.daysLeft <= 60));
    return `<div class="ac-pagehead"><h1>Due &amp; renewals</h1><p>Overdue, paused and upcoming renewals. Pay by mobile money (MTN, Airtel, Zamtel) or card.</p></div>
      ${list.length ? serviceTable(list) : '<div class="ac-empty"><b>Nothing due</b>We email you 7 days before each renewal and on the day.</div>'}`;
  }

  function pageServices(filter, title, sub) {
    const list = filter ? state.services.filter(filter) : state.services;
    return `<div class="ac-pagehead"><h1>${title || 'My services'}</h1><p>${sub || 'Everything you have with Nadine Cloud and when it renews.'}</p></div>
      ${list.length ? serviceTable(list) : emptyServices()}`;
  }

  function pageBilling() {
    const orders = state.orders;
    const label = { paid: ['Paid', 'ok'], failed: ['Failed', 'bad'] };
    return `<div class="ac-pagehead"><h1>Billing &amp; receipts</h1><p>Every payment on your account. Download a PDF receipt for any paid order.</p></div>
      ${orders.length ? `<div class="ac-tbl"><div class="ac-row ac-head"><span>Item</span><span class="ac-type">Reference</span><span>Status</span><span>Date</span><span></span></div>
      ${orders.map((o) => { const l = label[o.status] || ['Pending', 'warn']; return `<div class="ac-row">
        <span class="ac-svc"><span class="ac-svc-ic">${svg('receipt')}</span><span style="min-width:0"><b>${esc(o.plan)}</b><small>${esc(money(o.amount))}</small></span></span>
        <span class="ac-type" style="font-size:13px;color:#7A8494">${esc(o.reference)}</span>
        <span><span class="ac-pill ${l[1]}">${l[0]}</span></span>
        <span class="ac-date ok">${esc(fmtDate(o.created_at))}</span>
        <span class="ac-act">${o.status === 'paid' ? `<a class="ac-btn" href="/api/checkout/receipt/${encodeURIComponent(o.reference)}">Receipt</a>` : ''}</span></div>`; }).join('')}</div>`
      : '<div class="ac-empty"><b>No payments yet</b>Your receipts will appear here after your first order.</div>'}`;
  }

  function pageProfile() {
    const u = state.user;
    return `<div class="ac-pagehead"><h1>Profile</h1><p>Your account details.</p></div>
      <dl class="ac-profile"><dt>Name</dt><dd>${esc(u.name)}</dd><dt>Email</dt><dd>${esc(u.email)}</dd>${u.created_at ? `<dt>Customer since</dt><dd>${esc(fmtDate(u.created_at))}</dd>` : ''}</dl>
      <p style="margin-top:22px;color:#55607a">Need to change your name, email or password? <a class="ac-more" style="margin:0" href="mailto:support@nadinecloud.com?subject=${encodeURIComponent('Update my account details')}">Email support</a> and we'll update it for you.</p>`;
  }

  function pageHelp() {
    return `<div class="ac-pagehead"><h1>Help &amp; support</h1><p>We reply the same day, by email.</p></div>
      <div class="ac-quick" style="margin-top:0">
        <a href="mailto:support@nadinecloud.com">${svg('managed')}<b>Technical help</b><span>support@nadinecloud.com</span></a>
        <a href="mailto:billing@nadinecloud.com">${svg('receipt')}<b>Payments &amp; renewals</b><span>billing@nadinecloud.com</span></a>
        <a href="mailto:info@nadinecloud.com">${svg('email')}<b>Anything else</b><span>info@nadinecloud.com</span></a>
        <a href="/hosting#faq">${svg('domain')}<b>Help centre</b><span>Answers to common questions</span></a>
      </div>`;
  }

  // Domains & DNS: every domain on the account, from any service, with a DNS change request
  function pageDomains() {
    const owned = state.services.filter((s) => s.type === 'domain');
    const all = [...new Set(state.services.map((s) => String(s.domain || '').toLowerCase().replace(/^www\./, '')).filter(Boolean))];
    const dnsRows = all.map((d) => `<div class="ac-row">
        <span class="ac-svc"><span class="ac-svc-ic t-domain">${svg('domain')}</span><span style="min-width:0"><b>${esc(d)}</b><small>DNS managed by Nadine Cloud</small></span></span>
        <span class="ac-type">Website, email &amp; SSL records</span>
        <span><span class="ac-pill ok">Connected</span></span>
        <span class="ac-date ok" style="font-weight:500;font-size:13px;color:#55607a">Changes done the same day</span>
        <span class="ac-act"><a class="ac-btn" href="mailto:support@nadinecloud.com?subject=${encodeURIComponent('DNS change for ' + d)}&body=${encodeURIComponent('Hello Nadine Cloud,\n\nPlease make this DNS change for ' + d + ':\n\n(e.g. point the domain to a new website, add an email or verification record)\n\nThank you.')}">Change DNS</a></span>
      </div>`).join('');
    return `<div class="ac-pagehead"><h1>Domains &amp; DNS</h1><p>Your domain names and their DNS settings: the records that connect each domain to its website, email and SSL.</p></div>
      ${owned.length ? serviceTable(owned) : '<div class="ac-empty"><b>No domains registered with us yet</b>Register a new domain or transfer one you already own. <a class="ac-more" href="/domains">Search domains</a></div>'}
      ${all.length ? `<h2 class="ac-h2" style="margin-top:38px">DNS settings</h2>${`<div class="ac-tbl"><div class="ac-row ac-head"><span>Domain</span><span class="ac-type">Covers</span><span>Status</span><span>Turnaround</span><span></span></div>${dnsRows}</div>`}
        <p style="color:#55607a;margin-top:14px;font-size:14px">Need to point your domain somewhere new, add a Google or Microsoft verification record, or set up email? Click <b>Change DNS</b> and tell us what you need.</p>` : ''}`;
  }

  function pageSsl() {
    const list = state.services.filter((s) => s.type === 'ssl');
    const hosted = [...new Set(state.services.filter((s) => ['hosting', 'managed', 'builder', 'bundle', 'wordpress'].includes(s.type)).map((s) => s.domain).filter(Boolean))];
    return `<div class="ac-pagehead"><h1>SSL certificates</h1><p>SSL puts the padlock in your visitors' browser and keeps their data private.</p></div>
      ${list.length ? serviceTable(list) : ''}
      ${hosted.length ? `<div class="ac-note" style="margin-top:${list.length ? 26 : 0}px"><span class="ac-note-ic" style="color:#15803D">${svg('ssl', 1.8)}</span><div><b>Free SSL included</b>${hosted.map(esc).join(', ')} ${hosted.length === 1 ? 'has' : 'have'} a free SSL certificate with your hosting, renewed automatically.</div></div>` : ''}
      ${!list.length && !hosted.length ? '<div class="ac-empty"><b>No SSL certificates yet</b>Every hosting plan includes free SSL. For a wildcard or business-validated certificate, see our SSL plans.</div>' : ''}
      <a class="ac-btn pay" style="margin-top:18px" href="/ssl">Buy an SSL certificate</a>`;
  }

  const PAGES = {
    dashboard: pageDashboard,
    attention: pageAttention,
    services: () => pageServices(),
    domains: pageDomains,
    // #ncPanel is filled by /js/panel.js with live controls (open cPanel, email, deploy from GitHub) when available
    hosting: () => pageServices((s) => ['hosting', 'managed', 'builder', 'bundle', 'wordpress', 'care'].includes(s.type), 'Hosting &amp; websites', 'Your hosting plans, websites and care plans.').replace('</p></div>', '</p></div><div id="ncPanel"></div>'),
    databases: () => pageServices((s) => s.type === 'database' || s.type === 'managed', 'Databases', 'Your database hosting. Hosting + Database plans include their database.'),
    email: () => pageServices((s) => s.type === 'email', 'Business email', 'Professional email at your own domain.') + '<a class="ac-btn pay" style="margin-top:18px" href="/hosting#email">Get business email</a>',
    ssl: pageSsl,
    billing: pageBilling,
    profile: pageProfile,
    help: pageHelp,
  };

  function show(tab) {
    if (!PAGES[tab]) tab = 'dashboard';
    document.querySelectorAll('#acNav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    main.innerHTML = verifyPanel() + PAGES[tab]();
    bindVerify();
    main.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); go(b.dataset.go); }));
    main.querySelectorAll('.ac-note .x').forEach((b) => b.addEventListener('click', () => {
      const n = b.closest('.ac-note');
      try { localStorage.setItem('nc-note-' + n.dataset.note, '1'); } catch (e) { /* ignore */ }
      n.remove();
    }));
    try { document.dispatchEvent(new CustomEvent('nc:account-page', { detail: tab })); } catch (e) { /* ignore */ }
  }
  function go(tab) {
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
    show(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  let bound = false;
  function load() {
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((r) => r.json())
    .then((data) => {
      loading.hidden = true;
      if (!data.user) { outView.hidden = false; return; }
      const orders = data.orders || [];
      state = { user: data.user, orders, services: buildServices(orders) };
      const due = state.services.filter((s) => s.status !== 'active').length;
      if (due) { $('acDueBadge').hidden = false; $('acDueBadge').textContent = due >= 10 ? '10+' : String(due); }
      inView.hidden = false;
      if (!bound) {
        bound = true;
        document.querySelectorAll('#acNav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
        $('logoutBtn').addEventListener('click', function(){
          fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(() => { window.location.href = '/'; });
        });
      }
      show((location.hash || '').slice(1));
    })
    .catch(() => {
      loading.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent = 'Could not load your account — please refresh the page.';
    });
  }
  load();
})();
