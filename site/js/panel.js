/* Nadine Cloud client panel — modern controls for the client's own hosting, inside My account → Hosting & websites.
   Shows nothing unless /api/panel/accounts answers (it stays hidden from clients until Nadine Cloud switches it on). */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 4v5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.3 7.2l7.4 3.6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5 6-6Z"/><circle cx="15" cy="9" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  };
  const ic = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 18}" height="${s || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return Math.floor(s / 86400) + ' d ago'; };
  const api = (path, opt) => fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opt || {})).then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, j })));

  const CSS = `
  .ncp{margin:6px 0 34px;display:grid;gap:22px}
  .ncp-card{background:#fff;border:1px solid #E3E8F0;border-radius:16px;box-shadow:0 8px 30px rgba(15,23,42,.06);overflow:hidden}
  .ncp-top{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:20px 22px;background:linear-gradient(135deg,#0B1B3A,#123A8C 60%,#1769FF);color:#fff}
  .ncp-site{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
  .ncp-dot{width:10px;height:10px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,.25);flex-shrink:0}
  .ncp-dot.off{background:#F59E0B;box-shadow:0 0 0 4px rgba(245,158,11,.25)}
  .ncp-site b{font-size:19px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ncp-tag{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.14)}
  .ncp-acts{display:flex;flex-wrap:wrap;gap:8px}
  .ncp-b{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font-family:inherit;font-weight:600;font-size:14px;line-height:1;text-decoration:none;cursor:pointer}
  .ncp-b:hover{background:rgba(255,255,255,.18)}
  .ncp-b.pri{background:#fff;color:#0B1B3A;border-color:#fff}
  .ncp-tabs{display:flex;gap:4px;padding:0 14px;border-bottom:1px solid #E9EDF3;background:#FAFBFD;overflow-x:auto}
  .ncp-tab{display:inline-flex;align-items:center;gap:7px;padding:13px 12px;border:0;background:none;font-family:inherit;font-weight:600;font-size:14px;color:#55607A;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
  .ncp-tab.on{color:#1769FF;border-bottom-color:#1769FF}
  .ncp-body{padding:20px 22px}
  .ncp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
  .ncp-stat{border:1px solid #E9EDF3;border-radius:12px;padding:14px}
  .ncp-stat small{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7A8494}
  .ncp-stat b{display:block;font-size:18px;margin:6px 0 8px;color:#0B1220}
  .ncp-bar{height:7px;border-radius:4px;background:#EEF2F7;overflow:hidden}.ncp-bar i{display:block;height:7px;border-radius:4px;background:#1769FF}
  .ncp-bar i.hi{background:#F59E0B}.ncp-bar i.full{background:#DC2626}
  .ncp-ok{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#15803D}
  .ncp-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F0F2F6}
  .ncp-row:last-child{border-bottom:0}
  .ncp-pill{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px}
  .ncp-pill.live{background:#E8F7EE;color:#15803D}.ncp-pill.failed{background:#FDECEC;color:#B91C1C}.ncp-pill.building{background:#EAF2FF;color:#1D4ED8}
  .ncp-msg{flex:1;min-width:200px}.ncp-msg b{display:block;font-size:14.5px;color:#0B1220}.ncp-msg small{color:#7A8494;font-size:12.5px}
  .ncp-code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;background:#F3F5F9;padding:2px 7px;border-radius:6px;color:#334155}
  .ncp-form{display:grid;gap:10px;max-width:560px}
  .ncp-form label{font-size:13px;font-weight:600;color:#334155}
  .ncp-form input{height:42px;border:1.5px solid #D7DEE8;border-radius:10px;padding:0 12px;font-family:inherit;font-size:15px}
  .ncp-form input:focus{outline:none;border-color:#1769FF}
  .ncp-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:10px;border:0;background:#1769FF;color:#fff;font-family:inherit;font-weight:700;font-size:15px;cursor:pointer}
  .ncp-go{text-decoration:none}.ncp-go:disabled{opacity:.55}.ncp-go.ghost{background:#fff;color:#1769FF;border:1.5px solid #1769FF}
  .ncp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:4px 0 18px}
  .ncp-steps div{background:#F6F8FC;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#334155}.ncp-steps b{display:block;color:#1769FF;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}
  .ncp-note{font-size:13.5px;color:#55607A;margin:6px 0 0}
  .ncp-msgline{font-size:14px;margin-top:6px}.ncp-msgline.bad{color:#B91C1C}.ncp-msgline.good{color:#15803D}
  .ncp-switch{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#334155;cursor:pointer}
  .ncp-switch input{width:18px;height:18px}
  @media (max-width:640px){.ncp-top{padding:16px}.ncp-body{padding:16px}.ncp-acts{width:100%}.ncp-b{flex:1;justify-content:center}}`;

  function usageCard(label, u) {
    if (!u) return '';
    const pct = Math.max(0, Math.min(100, Number(u.percent) || 0));
    const size = (v) => { if (/unlimited/i.test(String(v))) return 'unlimited'; const n = Number(v) || 0; if (u.units !== 'MB') return String(Math.round(n)); return n >= 1024 ? (n / 1024).toFixed(n >= 10240 ? 0 : 1) + ' GB' : Math.round(n) + ' MB'; };
    return `<div class="ncp-stat"><small>${esc(label)}</small><b>${esc(size(u.used))} <span style="color:#94A3B8;font-weight:500;font-size:14px">of ${esc(size(u.max))}</span></b>
      <div class="ncp-bar"><i class="${pct >= 95 ? 'full' : pct >= 80 ? 'hi' : ''}" style="width:${Math.max(pct, 2)}%"></i></div></div>`;
  }

  function overviewTab(a) {
    return `<div class="ncp-grid">
        ${usageCard('Disk space', a.usage.diskusage)}${usageCard('Bandwidth this month', a.usage.bandwidthusage)}
        ${usageCard('Email accounts', a.usage.emailaccounts)}${usageCard('Databases', a.usage.mysqldatabases)}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:16px">
        <span class="ncp-ok">${ic('lock', 16)} ${a.ssl && a.ssl.ok ? 'Free SSL active' + (a.ssl.validUntil ? ' · renews automatically' : '') : 'SSL is being set up'}</span>
        ${a.deploy ? `<span class="ncp-ok" style="color:#1D4ED8">${ic('git', 16)} Auto-deploy from GitHub ${a.deploy.auto_deploy ? 'on' : 'paused'}</span>` : ''}
      </div>`;
  }

  async function deployTab(a, body) {
    body.innerHTML = '<p class="ncp-note">Loading…</p>';
    const r = await api('/api/panel/deploy?domain=' + encodeURIComponent(a.domain));
    if (!r.ok) { body.innerHTML = `<p class="ncp-msgline bad">${esc(r.j.error || 'Could not load.')}</p>`; return; }
    const { project, runs } = r.j;
    if (!project) {
      body.innerHTML = `<div class="ncp-steps">
          <div><b>1 · Connect</b>Paste your GitHub repository link below.</div>
          <div><b>2 · We deploy</b>Your site goes live on ${esc(a.domain)} in under a minute.</div>
          <div><b>3 · Push to update</b>Every time you push to GitHub, your website updates by itself.</div></div>
        <form class="ncp-form" data-f="connect">
          <label>GitHub repository<input name="repo" placeholder="https://github.com/your-name/your-site" required></label>
          <label>Branch <span style="font-weight:400;color:#7A8494">(leave empty for the default branch)</span><input name="branch" placeholder="main"></label>
          <details><summary style="cursor:pointer;font-size:13.5px;color:#55607A">Private repository?</summary>
            <label style="display:block;margin-top:8px">GitHub access token (read-only)<input name="token" type="password" placeholder="github_pat_…" autocomplete="off"></label>
            <p class="ncp-note">Create a fine-grained token on GitHub with read-only access to this one repository.</p></details>
          <label class="ncp-switch" style="font-weight:600"><input type="checkbox" name="withdb" checked> Also create a database for this site</label>
          <p class="ncp-note" style="margin:-4px 0 0">We create it, give it a strong password and save the connection details where your site can read them.</p>
          <div><button class="ncp-go" type="submit">${ic('rocket')} Connect &amp; deploy</button></div>
          <div class="ncp-msgline" data-out></div>
        </form>
        <p class="ncp-note">Works for websites made of HTML, CSS, JavaScript and PHP (including sites exported from builders). Your files are copied into your website folder; your repository's private history is never made public.</p>`;
      const f = body.querySelector('[data-f="connect"]');
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); const btn = f.querySelector('button'); const out = f.querySelector('[data-out]'); btn.disabled = true; out.className = 'ncp-msgline'; out.textContent = 'Connecting to GitHub…';
        const x = await api('/api/panel/deploy/connect', { method: 'POST', body: JSON.stringify({ domain: a.domain, repo: f.repo.value, branch: f.branch.value, token: f.token.value || undefined, database: f.withdb.checked ? 'site' : undefined }) });
        if (!x.ok) { out.className = 'ncp-msgline bad'; out.textContent = x.j.error || 'Could not connect.'; btn.disabled = false; return; }
        out.className = 'ncp-msgline good'; out.textContent = x.j.message || 'Connected.';
        if (x.j.database && x.j.database.password) {           // site + database: show the new database's details once
          const box = document.createElement('div'); box.innerHTML = credsBox(x.j.database); f.after(box); bindCreds(box);
        } else if (x.j.database && x.j.database.error) {
          out.textContent += ' (The database could not be created: ' + x.j.database.error + ' — try again in the Databases tab.)';
        }
        if (!(x.j.database && x.j.database.password)) setTimeout(() => deployTab(a, body), 20000);
      });
      return;
    }
    const pill = (s) => `<span class="ncp-pill ${esc(s)}">${s === 'live' ? 'Live' : s === 'failed' ? 'Failed' : 'Deploying'}</span>`;
    body.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:14px">
        <div class="ncp-msg"><b>${ic('git', 16)} ${esc(project.repo_url.replace('https://github.com/', '').replace(/\.git$/, ''))}</b><small>Branch <span class="ncp-code">${esc(project.branch || 'default')}</span> · connected ${esc(ago(project.created_at))}</small></div>
        <label class="ncp-switch"><input type="checkbox" data-auto ${project.auto_deploy ? 'checked' : ''}> Deploy automatically when I push</label>
        <button class="ncp-go" type="button" data-now>${ic('rocket', 16)} Deploy now</button>
      </div>
      <div>${runs.length ? runs.map((d) => `<div class="ncp-row">${pill(d.status)}
          <div class="ncp-msg"><b>${esc((d.message || 'Deployment').split('\n')[0])}</b><small>${d.commit_id ? `<span class="ncp-code">${esc(d.commit_id.slice(0, 7))}</span> · ` : ''}${esc(d.trigger === 'auto' ? 'pushed to GitHub' : d.trigger === 'first' ? 'first deploy' : 'deployed by you')} · ${esc(ago(d.started_at))}</small></div>
          ${d.log ? `<details style="flex-basis:100%"><summary style="cursor:pointer;font-size:13px;color:#55607A">Details</summary><div class="ncp-code" style="display:block;white-space:pre-wrap;margin-top:6px">${esc(d.log)}</div></details>` : ''}</div>`).join('') : '<p class="ncp-note">No deployments yet — the first one starts within a minute.</p>'}</div>`;
    body.querySelector('[data-now]').addEventListener('click', async (e) => { e.target.disabled = true; e.target.textContent = 'Deploying…'; await api('/api/panel/deploy/now', { method: 'POST', body: JSON.stringify({ domain: a.domain }) }); deployTab(a, body); });
    body.querySelector('[data-auto]').addEventListener('change', (e) => api('/api/panel/deploy/auto', { method: 'POST', body: JSON.stringify({ domain: a.domain, on: e.target.checked }) }));
  }

  // ---------- Databases ----------
  function credsBox(d) {
    const row = (k, v, secret) => `<div class="ncp-row" style="padding:8px 0"><span style="width:110px;color:#55607A;font-size:13px;font-weight:600">${esc(k)}</span>
      <span class="ncp-code" style="flex:1;min-width:160px;${secret ? 'filter:blur(4px);cursor:pointer' : ''}" ${secret ? 'data-reveal title="Click to show"' : ''}>${esc(v)}</span>
      <button class="ncp-go ghost" type="button" data-copy="${esc(v)}" style="height:32px;padding:0 10px">${ic('copy', 14)} Copy</button></div>`;
    return `<div style="border:1.5px solid #BBD3FF;background:#F5F9FF;border-radius:12px;padding:14px 16px;margin:12px 0">
      <b style="color:#0B1220">${ic('key', 16)} Connection details for ${esc(d.database)}</b>
      <p class="ncp-note" style="margin:4px 0 6px">Copy the password now — for your safety it is not shown again (you can always set a new one).</p>
      ${row('Host', d.host || 'localhost')}${row('Port', String(d.port || 3306))}${row('Database', d.database)}${row('User', d.user)}${row('Password', d.password, true)}
      ${d.configSaved ? `<p class="ncp-note" style="margin-top:10px">✓ <b>Already connected for your website:</b> the details are saved in a private file next to your website folder (never visible to visitors).<br>
        PHP: <span class="ncp-code">$db = require __DIR__ . '/../${esc(d.configFile)}';</span><br>
        Other apps: read <span class="ncp-code">${esc(d.envFile)}</span> (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DATABASE_URL).</p>` : ''}
    </div>`;
  }
  function bindCreds(root) {
    root.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { try { navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied ✓'; } catch (e) { /* ignore */ } }));
    root.querySelectorAll('[data-reveal]').forEach((s) => s.addEventListener('click', () => { s.style.filter = 'none'; }));
  }
  async function dbTab(a, body, fresh) {
    body.innerHTML = '<p class="ncp-note">Loading…</p>';
    const r = await api('/api/panel/databases?domain=' + encodeURIComponent(a.domain));
    if (!r.ok) { body.innerHTML = `<p class="ncp-msgline bad">${esc(r.j.error || 'Could not load.')}</p>`; return; }
    const list = r.j.databases || [];
    const full = r.j.max !== null && r.j.max !== 'unlimited' && list.length >= Number(r.j.max);
    body.innerHTML = `${fresh ? credsBox(fresh) : ''}
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">
        <b style="font-size:15px">${list.length} database${list.length === 1 ? '' : 's'}${r.j.max !== null ? ` <span style="color:#94A3B8;font-weight:500">of ${esc(r.j.max)} on your plan</span>` : ''}</b>
        <button class="ncp-go ghost" type="button" data-pma>${ic('db', 16)} Open phpMyAdmin</button></div>
      ${list.map((d) => `<div class="ncp-row"><span class="ncp-msg"><b>${ic('db', 15)} ${esc(d.name)}</b><small>${esc(d.sizeMB)} MB · user ${esc((d.users || [])[0] || '—')}</small></span>
          <button class="ncp-go ghost" type="button" data-pw="${esc(d.name)}" style="height:36px">${ic('key', 15)} New password</button>
          <button class="ncp-go ghost" type="button" data-deldb="${esc(d.name)}" style="height:36px;color:#B91C1C;border-color:#F3B4B4">${ic('trash', 15)} Delete</button></div>`).join('') || '<p class="ncp-note">No databases yet. Create one below — it is connected to your website automatically.</p>'}
      ${full ? '<p class="ncp-msgline bad" style="margin-top:14px">Your plan\'s database limit is reached. Upgrade your plan for more databases.</p>' : `
      <form class="ncp-form" data-f="newdb" style="margin-top:18px">
        <label>New database name<input name="name" placeholder="e.g. bookings, shop, site" required maxlength="16"></label>
        <p class="ncp-note" style="margin:0">We create the database, a user with its own strong password, and connect it to your website — all in one step.</p>
        <div><button class="ncp-go" type="submit">${ic('plus', 16)} Create database</button></div>
        <div class="ncp-msgline" data-out></div></form>`}`;
    bindCreds(body);
    body.querySelector('[data-pma]').addEventListener('click', async (e) => {
      const w = window.open('about:blank', '_blank');
      const x = await api('/api/panel/phpmyadmin', { method: 'POST', body: JSON.stringify({ domain: a.domain }) });
      if (x.ok && x.j.url) { if (w) w.location = x.j.url; } else { if (w) w.close(); alert(x.j.error || 'Could not open phpMyAdmin.'); }
    });
    const f = body.querySelector('[data-f="newdb"]');
    if (f) f.addEventListener('submit', async (e) => {
      e.preventDefault(); const out = f.querySelector('[data-out]'); const btn = f.querySelector('button'); btn.disabled = true; out.className = 'ncp-msgline'; out.textContent = 'Creating…';
      const x = await api('/api/panel/databases', { method: 'POST', body: JSON.stringify({ domain: a.domain, name: f.name.value }) });
      if (!x.ok) { out.className = 'ncp-msgline bad'; out.textContent = x.j.error || 'Could not create it.'; btn.disabled = false; return; }
      dbTab(a, body, x.j);
    });
    body.querySelectorAll('[data-pw]').forEach((b) => b.addEventListener('click', async () => {
      if (!window.confirm('Set a new password for ' + b.dataset.pw + '? Your website\'s saved connection file is updated automatically.')) return;
      const x = await api('/api/panel/databases/password', { method: 'POST', body: JSON.stringify({ domain: a.domain, database: b.dataset.pw }) });
      if (x.ok) dbTab(a, body, x.j); else alert(x.j.error || 'Could not change it.');
    }));
    body.querySelectorAll('[data-deldb]').forEach((b) => b.addEventListener('click', async () => {
      if (!window.confirm('Delete the database ' + b.dataset.deldb + ' and ALL its data? This cannot be undone.')) return;
      const x = await api('/api/panel/databases/delete', { method: 'POST', body: JSON.stringify({ domain: a.domain, database: b.dataset.deldb }) });
      if (x.ok) dbTab(a, body); else alert(x.j.error || 'Could not delete it.');
    }));
  }

  function genPassword() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const a = new Uint32Array(14); crypto.getRandomValues(a); return Array.from(a, (n) => c[n % c.length]).join('') + '#' + (a[0] % 9); }
  async function emailTab(a, body) {
    body.innerHTML = '<p class="ncp-note">Loading…</p>';
    const r = await api('/api/panel/email?domain=' + encodeURIComponent(a.domain));
    if (!r.ok) { body.innerHTML = `<p class="ncp-msgline bad">${esc(r.j.error || 'Could not load.')}</p>`; return; }
    const list = r.j.accounts || [];
    body.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <b style="font-size:15px">${list.length} email account${list.length === 1 ? '' : 's'}</b>
        <a class="ncp-go ghost" href="${esc(r.j.webmail)}" target="_blank" rel="noopener">${ic('mail', 16)} Open webmail</a></div>
      ${list.map((m) => `<div class="ncp-row"><span class="ncp-msg"><b>${esc(m.email)}</b><small>${esc(m.usedMB.toFixed ? m.usedMB.toFixed(1) : m.usedMB)} MB used${m.quotaMB ? ' of ' + esc(m.quotaMB) + ' MB' : ''}</small></span>
          <button class="ncp-go ghost" type="button" data-del="${esc(m.email)}" style="height:36px">${ic('trash', 15)} Delete</button></div>`).join('')}
      <form class="ncp-form" data-f="new" style="margin-top:18px">
        <label>New email address<span style="display:flex;align-items:center;gap:6px"><input name="name" placeholder="info" style="flex:1" required> <span style="color:#55607A">@${esc(a.domain)}</span></span></label>
        <label>Password<span style="display:flex;gap:6px"><input name="password" style="flex:1" required minlength="10"> <button class="ncp-go ghost" type="button" data-gen style="height:42px">Suggest</button></span></label>
        <div><button class="ncp-go" type="submit">${ic('plus', 16)} Create email</button></div>
        <div class="ncp-msgline" data-out></div></form>`;
    const f = body.querySelector('[data-f="new"]');
    f.querySelector('[data-gen]').addEventListener('click', () => { f.password.value = genPassword(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const out = f.querySelector('[data-out]');
      const x = await api('/api/panel/email', { method: 'POST', body: JSON.stringify({ domain: a.domain, name: f.name.value, password: f.password.value }) });
      if (!x.ok) { out.className = 'ncp-msgline bad'; out.textContent = x.j.error; return; }
      out.className = 'ncp-msgline good'; out.textContent = x.j.email + ' is ready. Keep the password somewhere safe.'; setTimeout(() => emailTab(a, body), 2500);
    });
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!window.confirm('Delete ' + b.dataset.del + '? All its emails will be removed.')) return;
      await api('/api/panel/email/delete', { method: 'POST', body: JSON.stringify({ domain: a.domain, email: b.dataset.del }) }); emailTab(a, body);
    }));
  }

  function card(a) {
    const el = document.createElement('div'); el.className = 'ncp-card';
    el.innerHTML = `<div class="ncp-top">
        <div class="ncp-site"><span class="ncp-dot ${a.suspended ? 'off' : ''}"></span><b>${esc(a.domain)}</b><span class="ncp-tag">${esc(a.plan || 'Hosting')}</span></div>
        <div class="ncp-acts">
          <a class="ncp-b" href="https://${esc(a.domain)}" target="_blank" rel="noopener">${ic('globe', 16)} Visit site</a>
          <a class="ncp-b" href="https://${esc(a.domain)}/webmail" target="_blank" rel="noopener">${ic('mail', 16)} Webmail</a>
          <button class="ncp-b pri" type="button" data-cpanel>${ic('panel', 16)} Open cPanel</button>
        </div></div>
      <div class="ncp-tabs" role="tablist">
        <button class="ncp-tab on" data-t="overview">${ic('panel', 16)} Overview</button>
        <button class="ncp-tab" data-t="deploy">${ic('git', 16)} Deploy from GitHub</button>
        <button class="ncp-tab" data-t="db">${ic('db', 16)} Databases</button>
        <button class="ncp-tab" data-t="email">${ic('mail', 16)} Email accounts</button>
      </div><div class="ncp-body">${overviewTab(a)}</div>`;
    const body = el.querySelector('.ncp-body');
    el.querySelectorAll('.ncp-tab').forEach((t) => t.addEventListener('click', () => {
      el.querySelectorAll('.ncp-tab').forEach((x) => x.classList.toggle('on', x === t));
      if (t.dataset.t === 'overview') body.innerHTML = overviewTab(a);
      if (t.dataset.t === 'deploy') deployTab(a, body);
      if (t.dataset.t === 'email') emailTab(a, body);
      if (t.dataset.t === 'db') dbTab(a, body);
    }));
    el.querySelector('[data-cpanel]').addEventListener('click', async (e) => {
      const b = e.currentTarget; const w = window.open('about:blank', '_blank'); b.disabled = true;
      const x = await api('/api/panel/open-cpanel', { method: 'POST', body: JSON.stringify({ domain: a.domain }) });
      b.disabled = false;
      if (x.ok && x.j.url) { if (w) w.location = x.j.url; else window.location = x.j.url; } else { if (w) w.close(); alert(x.j.error || 'Could not open cPanel.'); }
    });
    return el;
  }

  async function render(host) {
    const r = await api('/api/panel/accounts').catch(() => null);
    if (!r || !r.ok || !r.j.accounts || !r.j.accounts.length) return;           // hidden / nothing to show
    if (!document.getElementById('ncp-css')) { const s = document.createElement('style'); s.id = 'ncp-css'; s.textContent = CSS; document.head.appendChild(s); }
    host.innerHTML = ''; const wrap = document.createElement('div'); wrap.className = 'ncp';
    r.j.accounts.filter((a) => !a.error).forEach((a) => wrap.appendChild(card(a)));
    host.appendChild(wrap);
  }

  document.addEventListener('nc:account-page', (e) => {
    if (e.detail !== 'hosting') return;
    const host = document.getElementById('ncPanel'); if (host) render(host);
  });
})();
