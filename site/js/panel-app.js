/* Nadine Cloud control panel v2 — full-screen app at /panel.
   Uses the same tested endpoints as before (/api/panel/*); every request is checked server-side against the logged-in owner. */
(function () {
  const root = document.getElementById('ncApp'); if (!root) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (path, opt) => fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opt || {}))
    .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, status: r.status, j })));
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
  const ago = (d) => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; };
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  const P = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.3 7.2l7.4 3.6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5 6-6Z"/><circle cx="15" cy="9" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>', out: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', chev: '<path d="m6 9 6 6 6-6"/>', panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 4v5"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>', box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/>', cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>', up: '<path d="M15 18l-6-6 6-6"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  };
  const ic = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 18}" height="${s || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  const CSS = `
  .nx{--bg:#F4F6FA;--panel:#FFFFFF;--panel2:#F8FAFC;--line:#E4E8F0;--line2:#EEF1F6;--tx:#0B1220;--tx2:#4A5568;--tx3:#7C8798;--acc:#1769FF;--acc2:#0AA8F8;--accbg:#EAF2FF;--ok:#16A34A;--okbg:#E7F7EE;--warn:#D97706;--warnbg:#FFF4E0;--bad:#DC2626;--badbg:#FDECEC;--term:#0B1020;--shadow:0 1px 2px rgba(15,23,42,.04),0 8px 24px rgba(15,23,42,.06)}
  .nx[data-theme=dark]{--bg:#0B1020;--panel:#121A2E;--panel2:#0F1628;--line:#1F2A44;--line2:#19233A;--tx:#EAF0FA;--tx2:#B4BFD3;--tx3:#8390A8;--acc:#4D8DFF;--acc2:#38BDF8;--accbg:rgba(77,141,255,.14);--ok:#34D399;--okbg:rgba(52,211,153,.12);--warn:#FBBF24;--warnbg:rgba(251,191,36,.12);--bad:#F87171;--badbg:rgba(248,113,113,.12);--term:#070B16;--shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.25)}
  .nx{position:fixed;inset:0;z-index:50;display:grid;grid-template-rows:60px 1fr;background:var(--bg);color:var(--tx);font:400 15px/1.5 'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .nx *{box-sizing:border-box} .nx a{color:inherit} .nx button{font-family:inherit}
  .nx h1,.nx h2,.nx h3{font-family:'Plus Jakarta Sans',system-ui,sans-serif;margin:0;letter-spacing:-.02em}
  .nx-top{display:flex;align-items:center;gap:14px;padding:0 18px;background:var(--panel);border-bottom:1px solid var(--line)}
  .nx-logo{display:flex;align-items:center;gap:10px;text-decoration:none;font:800 17px 'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
  .nx-logo img{width:30px;height:30px}
  .nx-slash{color:var(--line);font-size:22px;font-weight:300}
  .nx-switch{position:relative}
  .nx-switch>button{display:flex;align-items:center;gap:9px;height:38px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--tx);font-weight:600;font-size:14.5px;cursor:pointer;max-width:330px}
  .nx-switch>button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nx-menu{position:absolute;top:44px;left:0;min-width:280px;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:6px;display:none;z-index:5}
  .nx-menu.open{display:block}
  .nx-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:8px;background:none;color:var(--tx);font-size:14.5px;font-weight:600;text-align:left;cursor:pointer}
  .nx-menu button:hover,.nx-menu button.on{background:var(--accbg)}
  .nx-sp{flex:1}
  .nx-ib{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--tx2);cursor:pointer;text-decoration:none}
  .nx-ib:hover{color:var(--tx);border-color:var(--tx3)}
  .nx-who{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tx2);font-weight:600;text-decoration:none}
  .nx-av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--acc2),var(--acc));color:#fff;font-weight:800;font-size:13px}
  .nx-body{display:grid;grid-template-columns:236px 1fr;min-height:0}
  .nx-side{border-right:1px solid var(--line);background:var(--panel);padding:16px 12px;display:flex;flex-direction:column;gap:3px;overflow-y:auto}
  .nx-side small{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--tx3);padding:12px 12px 6px}
  .nx-nav{display:flex;align-items:center;gap:11px;height:42px;padding:0 12px;border-radius:10px;border:0;background:none;color:var(--tx2);font-weight:600;font-size:15px;cursor:pointer;text-align:left;text-decoration:none}
  .nx-nav:hover{background:var(--panel2);color:var(--tx)} .nx-nav.on{background:var(--accbg);color:var(--acc)}
  .nx-nav .nx-count{margin-left:auto;font-size:12px;background:var(--line2);color:var(--tx2);padding:1px 8px;border-radius:99px}
  .nx-sidecard{margin-top:auto;border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--panel2);font-size:13.5px;color:var(--tx2)}
  .nx-sidecard b{display:block;color:var(--tx);font-size:14px;margin-bottom:3px}
  .nx-main{overflow-y:auto;padding:28px 34px 60px}
  .nx-wrap{max-width:1180px;margin:0 auto;min-width:0}
  .nx-head{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-bottom:24px}
  .nx-head h1{font-size:28px;font-weight:800}
  .nx-status{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:99px;font-weight:700;font-size:13px;background:var(--okbg);color:var(--ok)}
  .nx-status.off{background:var(--warnbg);color:var(--warn)}
  .nx-pulse{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 currentColor;animation:nxp 2s infinite}
  @keyframes nxp{0%{box-shadow:0 0 0 0 color-mix(in srgb,currentColor 60%,transparent)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
  .nx-chip{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:8px;background:var(--line2);color:var(--tx2)}
  .nx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 15px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--tx);font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;white-space:nowrap;transition:transform .15s,border-color .15s,background .15s}
  .nx-btn:hover{border-color:var(--tx3)} .nx-btn:active{transform:translateY(1px)} .nx-btn:disabled{opacity:.55;cursor:default}
  .nx-btn.pri{background:var(--acc);border-color:var(--acc);color:#fff} .nx-btn.pri:hover{filter:brightness(1.08)}
  .nx-btn.danger{color:var(--bad)} .nx-btn.sm{height:34px;padding:0 11px;font-size:13px}
  .nx-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
  .nx-card-h{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line2)}
  .nx-card-h h3{font-size:16px;font-weight:700} .nx-card-b{padding:18px 20px}
  .nx-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;margin-bottom:20px}
  .nx-prev{padding:14px}
  .nx-browser{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel2)}
  .nx-bar{display:flex;align-items:center;gap:6px;padding:9px 12px;border-bottom:1px solid var(--line)}
  .nx-bar i{width:10px;height:10px;border-radius:50%;background:var(--line)} .nx-bar i:nth-child(1){background:#FF5F57}.nx-bar i:nth-child(2){background:#FEBC2E}.nx-bar i:nth-child(3){background:#28C840}
  .nx-url{flex:1;margin-left:8px;display:flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:7px;background:var(--panel);color:var(--tx2);font-size:12.5px;font-family:'IBM Plex Mono',monospace;overflow:hidden;white-space:nowrap}
  .nx-frame{position:relative;height:300px;overflow:hidden;background:#fff}
  .nx-frame iframe{position:absolute;top:0;left:0;width:1440px;height:1000px;border:0;transform-origin:0 0;pointer-events:none}
  .nx-frame .nx-fallback{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#64748B;background:linear-gradient(135deg,#EEF4FF,#F8FAFF);font-size:14px}
  .nx-frame a.nx-cover{position:absolute;inset:0}
  .nx-facts{display:grid;gap:0}
  .nx-fact{display:flex;align-items:center;gap:12px;padding:13px 20px;border-bottom:1px solid var(--line2);font-size:14.5px}
  .nx-fact:last-child{border-bottom:0}
  .nx-fact .k{display:flex;align-items:center;gap:9px;color:var(--tx3);font-weight:600;width:130px;flex-shrink:0}
  .nx-fact .v{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nx-ok{color:var(--ok)} .nx-muted{color:var(--tx3)}
  .nx-mono{font-family:'IBM Plex Mono',monospace;font-size:13px}
  .nx-code{font-family:'IBM Plex Mono',monospace;font-size:12.5px;padding:2px 7px;border-radius:6px;background:var(--line2);color:var(--tx2)}
  .nx-gauges{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px}
  .nx-g{display:flex;align-items:center;gap:16px;padding:18px}
  .nx-ring{position:relative;width:64px;height:64px;flex-shrink:0}
  .nx-ring svg{transform:rotate(-90deg)} .nx-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;font-weight:800}
  .nx-ring circle{transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)}
  .nx-g small{display:block;font-size:12.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3)}
  .nx-g strong{display:block;font-size:18px;font-weight:800;margin-top:2px} .nx-g span{font-size:13px;color:var(--tx3)}
  .nx-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:20px}
  .nx-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .nx-qa{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--tx);font-weight:700;font-size:14px;cursor:pointer;text-align:left;text-decoration:none;transition:border-color .15s,transform .15s}
  .nx-qa:hover{border-color:var(--acc);transform:translateY(-2px)} .nx-qa span{font-weight:500;font-size:12.5px;color:var(--tx3)}
  .nx-qa .q{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:var(--accbg);color:var(--acc)}
  .nx-dep{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--line2);position:relative}
  .nx-dep:last-child{border-bottom:0}
  .nx-dep::before{content:'';position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--line)}
  .nx-dep.live::before{background:var(--ok)} .nx-dep.failed::before{background:var(--bad)} .nx-dep.building::before{background:var(--acc)}
  .nx-dep .m{flex:1;min-width:0} .nx-dep .m b{display:block;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nx-dep .m small{color:var(--tx3);font-size:13px}
  .nx-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;white-space:nowrap}
  .nx-pill.live{background:var(--okbg);color:var(--ok)} .nx-pill.failed{background:var(--badbg);color:var(--bad)} .nx-pill.building{background:var(--accbg);color:var(--acc)}
  .nx-spin{width:12px;height:12px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:nxs .8s linear infinite}
  @keyframes nxs{to{transform:rotate(360deg)}}
  .nx-term{margin:0;background:var(--term);color:#C9D4E8;font:12.5px/1.7 'IBM Plex Mono',monospace;padding:14px 16px;border-radius:10px;white-space:pre-wrap;overflow-x:auto}
  .nx-term .g{color:#34D399}.nx-term .d{color:#6B7A99}.nx-term .r{color:#F87171}
  .nx-steps{display:flex;align-items:center;gap:0;margin:6px 0 14px}
  .nx-step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--tx3)}
  .nx-step i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:2px solid var(--line);font-style:normal;font-size:11px}
  .nx-step.done{color:var(--ok)} .nx-step.done i{border-color:var(--ok);background:var(--ok);color:#fff}
  .nx-step.now{color:var(--acc)} .nx-step.now i{border-color:var(--acc)}
  .nx-step+.nx-line{flex:1;height:2px;background:var(--line);margin:0 10px;min-width:20px;position:relative;overflow:hidden}
  .nx-line.go::after{content:'';position:absolute;inset:0;width:40%;background:var(--acc);animation:nxl 1.1s ease-in-out infinite}
  .nx-line.done{background:var(--ok)}
  @keyframes nxl{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
  .nx-form{display:grid;gap:14px;max-width:620px}
  .nx-form label{display:grid;gap:6px;font-size:13.5px;font-weight:700;color:var(--tx2)}
  .nx-in{height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 13px;background:var(--panel2);color:var(--tx);font:inherit;font-size:15px}
  .nx-in:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 4px var(--accbg)}
  .nx-check{display:flex!important;grid-template-columns:none!important;align-items:flex-start;gap:12px!important;padding:14px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer;background:var(--panel2)}
  .nx-check input{width:19px;height:19px;margin-top:2px;accent-color:var(--acc)} .nx-check span{font-weight:500;color:var(--tx3);display:block;font-size:13px}
  .nx-check b{color:var(--tx);font-size:14.5px}
  .nx-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
  .nx-3 div{padding:16px;border-radius:12px;background:var(--panel2);border:1px solid var(--line2);font-size:14px;color:var(--tx2)}
  .nx-3 b{display:flex;align-items:center;gap:8px;color:var(--tx);font-size:14.5px;margin-bottom:4px}
  .nx-3 em{font-style:normal;display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--acc);color:#fff;font-size:12px}
  .nx-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--line2)}
  .nx-row:last-child{border-bottom:0}
  .nx-row .m{flex:1;min-width:200px} .nx-row .m b{display:flex;align-items:center;gap:8px;font-size:15px} .nx-row .m small{color:var(--tx3);font-size:13px}
  .nx-empty{padding:34px 20px;text-align:center;color:var(--tx3)} .nx-empty b{display:block;color:var(--tx);font-size:16px;margin-bottom:4px}
  .nx-msg{font-size:14px;font-weight:600;min-height:20px} .nx-msg.bad{color:var(--bad)} .nx-msg.good{color:var(--ok)}
  .nx-creds{border:1.5px solid var(--acc);background:var(--accbg);border-radius:14px;padding:16px 18px;margin:0 0 20px}
  .nx-creds .cr{display:flex;align-items:center;gap:10px;padding:7px 0}
  .nx-creds .cr span:first-child{width:96px;color:var(--tx3);font-weight:700;font-size:13px}
  .nx-creds .cv{flex:1;min-width:0;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:7px 10px;border-radius:8px;background:var(--panel);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nx-note{font-size:13.5px;color:var(--tx3);margin:0}
  .nx-banner{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:12px;background:var(--accbg);color:var(--tx);margin-bottom:20px;font-size:14px}
  .nx-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(30px);opacity:0;background:var(--tx);color:var(--bg);padding:11px 18px;border-radius:10px;font-weight:700;font-size:14px;transition:all .25s;z-index:60;pointer-events:none}
  .nx-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
  .nx-skel{border-radius:10px;background:linear-gradient(90deg,var(--line2),var(--line),var(--line2));background-size:200% 100%;animation:nxk 1.2s infinite}
  @keyframes nxk{to{background-position:-200% 0}}
  .nx-fade{animation:nxf .35s ease both} @keyframes nxf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .nx-mob{display:none}
  @media (max-width:1100px){.nx-gauges{grid-template-columns:repeat(2,minmax(0,1fr))}.nx-hero,.nx-two{grid-template-columns:minmax(0,1fr)}}
  @media (max-width:820px){.nx-body{grid-template-columns:minmax(0,1fr)}.nx-top>a.nx-ib[href='/contact']{display:none}.nx-main{overflow-x:hidden}.nx-side{position:fixed;top:60px;bottom:0;left:0;width:260px;z-index:6;transform:translateX(-105%);transition:transform .25s;box-shadow:var(--shadow)}
    .nx-side.open{transform:none}.nx-mob{display:inline-grid}.nx-main{padding:20px 16px 60px}.nx-who span,.nx-logo b,.nx-slash{display:none}
    .nx-3{grid-template-columns:1fr}.nx-head h1{font-size:23px}.nx-switch>button{max-width:200px}.nx-fact .k{width:104px}.nx-frame{height:220px}}
  @media (max-width:520px){.nx-gauges{grid-template-columns:minmax(0,1fr)}.nx-acts{grid-template-columns:minmax(0,1fr)}.nx-head .nx-btn{flex:1}.nx-chip{display:none}.nx-top{gap:8px;padding:0 10px}.nx-dep{flex-wrap:wrap}}
  .nx-crumb{border:0;background:none;color:var(--acc);font-weight:700;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:2px 4px}
  .nx-frow{display:flex;align-items:center;gap:12px;padding:10px 20px;border-bottom:1px solid var(--line2);font-size:14.5px}
  .nx-frow:hover{background:var(--panel2)} .nx-fi{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--line2);color:var(--tx3);flex-shrink:0} .nx-fi.d{background:var(--accbg);color:var(--acc)}
  .nx-fname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:none;color:var(--tx);font:inherit;font-weight:600;text-align:left;padding:0} button.nx-fname{cursor:pointer;color:var(--acc)}
  .nx-fmeta{font-size:12.5px;width:84px;text-align:right;flex-shrink:0} .nx-facts2{display:flex;gap:6px;flex-shrink:0}
  .nx-drop{position:relative} .nx-dropmsg{display:none;position:absolute;inset:0;border:2px dashed var(--acc);border-radius:16px;background:var(--panel);opacity:.95;place-items:center;align-content:center;gap:8px;color:var(--acc);font-size:16px}
  .nx-drop.over .nx-dropmsg{display:grid}
  .nx-editor{display:block;width:100%;min-height:62vh;border:0;border-radius:0 0 16px 16px;padding:16px 18px;background:var(--term);color:#D7E1F2;font:13.5px/1.65 'IBM Plex Mono',monospace;resize:vertical;tab-size:2}
  .nx-editor:focus{outline:none}
  .nx-big{display:grid;place-items:center;width:54px;height:54px;border-radius:16px} .nx-big.ok{background:var(--okbg);color:var(--ok)} .nx-big.warn{background:var(--warnbg);color:var(--warn)}
  .nx-kv{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line2);font-size:14px} .nx-kv:last-child{border-bottom:0} .nx-kv>span:first-child{flex:1;min-width:0;color:var(--tx2);font-weight:600;overflow:hidden;text-overflow:ellipsis}
  .nx-cv2{font-family:'IBM Plex Mono',monospace;font-size:13px;padding:5px 9px;border-radius:7px;background:var(--line2)}
  .nx-tablewrap{overflow-x:auto} .nx-table{width:100%;border-collapse:collapse;font-size:14px} .nx-table th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--tx3);padding:10px 20px;border-bottom:1px solid var(--line2)}
  .nx-table td{padding:9px 20px;border-bottom:1px solid var(--line2);vertical-align:middle} .nx-val{max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nx-dnsform{display:flex;flex-wrap:wrap;gap:8px} .nx-dnsform .nx-in{flex:1;min-width:110px} .nx-dnsform select.nx-in{flex:0 0 100px}
  @media (max-width:820px){.nx-fmeta{display:none}.nx-frow{flex-wrap:wrap}.nx-facts2{width:100%;justify-content:flex-end}}
  .chat-widget{z-index:40!important}`;

  // ---------- state ----------
  const S = { user: null, accounts: [], cur: null, view: 'overview', deploy: {}, timer: null };
  let theme = 'light';
  try { theme = localStorage.getItem('nx-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { /* ignore */ }

  function toast(t) { const el = document.querySelector('.nx-toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }
  function copy(v) { try { navigator.clipboard.writeText(v); toast('Copied'); } catch (e) { /* ignore */ } }

  function shell() {
    const u = S.user || {}; const name = (u.name || u.email || '').trim(); const init = (name.match(/\b\w/g) || ['N']).slice(0, 2).join('').toUpperCase();
    root.innerHTML = `<div class="nx" data-theme="${theme}">
      <header class="nx-top">
        <button class="nx-ib nx-mob" data-mob aria-label="Menu">${ic('menu')}</button>
        <a class="nx-logo" href="/"><img src="/favicon.svg" alt=""><b>Nadine Cloud</b></a>
        <span class="nx-slash">/</span>
        <div class="nx-switch"><button data-sw>${ic('globe', 16)}<span data-swname></span>${ic('chev', 15)}</button><div class="nx-menu" data-swmenu></div></div>
        <span class="nx-sp"></span>
        <a class="nx-ib" href="/contact" title="Help">${ic('help')}</a>
        <button class="nx-ib" data-theme-btn title="Light / dark">${ic(theme === 'dark' ? 'sun' : 'moon')}</button>
        <a class="nx-who" href="/account" title="My account"><span>${esc(name.split('@')[0])}</span><i class="nx-av" style="font-style:normal">${esc(init)}</i></a>
      </header>
      <div class="nx-body">
        <nav class="nx-side" data-side>
          <small>Website</small>
          <button class="nx-nav" data-v="overview">${ic('grid')} Overview</button>
          <button class="nx-nav" data-v="deploy">${ic('git')} Deployments</button>
          <button class="nx-nav" data-v="db">${ic('db')} Databases</button>
          <button class="nx-nav" data-v="files">${ic('folder')} Files</button>
          <button class="nx-nav" data-v="email">${ic('mail')} Email</button>
          <button class="nx-nav" data-v="domain">${ic('globe')} Domain &amp; SSL</button>
          <button class="nx-nav" data-v="backups">${ic('box')} Backups</button>
          <button class="nx-nav" data-v="settings">${ic('cog')} Settings</button>
          <small>More</small>
          <a class="nx-nav" href="/account">${ic('user')} Billing &amp; account</a>
          <button class="nx-nav" data-logout>${ic('out')} Log out</button>
          <div class="nx-sidecard"><b>Need a hand?</b>Our team can set things up for you. Write to <a href="mailto:support@nadinecloud.com" style="color:var(--acc);font-weight:700">support@nadinecloud.com</a></div>
        </nav>
        <main class="nx-main"><div class="nx-wrap" data-view></div></main>
      </div>
      <div class="nx-toast"></div></div>`;
    const $ = (s) => root.querySelector(s);
    $('[data-theme-btn]').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('nx-theme', theme); } catch (e) { /* ignore */ } $('.nx').dataset.theme = theme; $('[data-theme-btn]').innerHTML = ic(theme === 'dark' ? 'sun' : 'moon'); };
    $('[data-sw]').onclick = (e) => { e.stopPropagation(); $('[data-swmenu]').classList.toggle('open'); };
    document.addEventListener('click', () => { const m = root.querySelector('[data-swmenu]'); if (m) m.classList.remove('open'); });
    $('[data-mob]').onclick = () => $('[data-side]').classList.toggle('open');
    root.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { go(b.dataset.v); $('[data-side]').classList.remove('open'); });
    $('[data-logout]').onclick = () => fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(() => { window.location.href = '/'; });
  }

  function paintSwitcher() {
    const a = S.cur; root.querySelector('[data-swname]').textContent = a.domain;
    root.querySelector('[data-swmenu]').innerHTML = S.accounts.map((x) => `<button data-pick="${esc(x.domain)}" class="${x === a ? 'on' : ''}"><span class="nx-pulse" style="color:${x.locked || x.suspended ? 'var(--warn)' : 'var(--ok)'}"></span>${esc(x.domain)}<span class="nx-chip" style="margin-left:auto">${esc(planName(x.plan))}</span></button>`).join('');
    root.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => { S.cur = S.accounts.find((x) => x.domain === b.dataset.pick); S.deploy = {}; history.replaceState(null, '', '/panel?site=' + encodeURIComponent(S.cur.domain) + (S.view !== 'overview' ? '#' + S.view : '')); paintSwitcher(); go(S.view); });
  }

  async function openCpanel() {
    const w = window.open('about:blank', '_blank');
    const x = await post('/api/panel/open-cpanel', { domain: S.cur.domain });
    if (x.ok && x.j.url) { if (w) w.location = x.j.url; else window.location = x.j.url; } else { if (w) w.close(); toast(x.j.error || 'Could not open cPanel'); }
  }

  function head(title, extra) {
    const a = S.cur;
    return `<div class="nx-head nx-fade"><div style="min-width:0"><div class="nx-muted" style="font-size:13.5px;font-weight:600;margin-bottom:2px">${esc(title)}</div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px"><h1>${esc(a.domain)}</h1>
        <span class="nx-status ${a.suspended ? 'off' : ''}"><span class="nx-pulse"></span>${a.suspended ? 'Paused' : 'Online'}</span>
        <span class="nx-chip">${esc(planName(a.plan))}</span></div></div>
      <span class="nx-sp"></span>${extra || `<a class="nx-btn" href="https://${esc(a.domain)}/webmail" target="_blank" rel="noopener">${ic('mail', 16)} Webmail</a>
      <a class="nx-btn pri" href="https://${esc(a.domain)}" target="_blank" rel="noopener">${ic('ext', 16)} Visit website</a>`}</div>`;
  }

  function go(view) {
    S.view = view; clearTimeout(S.timer);
    root.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
    if (location.hash.slice(1) !== view) history.replaceState(null, '', location.pathname + location.search + (view === 'overview' ? '' : '#' + view));
    const box = root.querySelector('[data-view]');
    if (S.cur && S.cur.locked) return lockedView(box);
    ({ overview, deploy: deployView, db: dbView, email: emailView, files: filesView, domain: domainView, backups: backupsView, settings: settingsView }[view] || overview)(box);
  }

  // ---------- usage ring ----------
  function ring(label, u, color) {
    if (!u) return '';
    const unl = /unlimited/i.test(String(u.max));
    const pct = unl ? 0 : Math.max(0, Math.min(100, Number(u.percent) || 0));
    const size = (v) => { if (/unlimited/i.test(String(v))) return 'Unlimited'; const n = Number(v) || 0; if (u.units !== 'MB') return String(Math.round(n)); return n >= 1024 ? (n / 1024).toFixed(n >= 10240 ? 0 : 1) + ' GB' : Math.round(n) + ' MB'; };
    const c = 2 * Math.PI * 27; const col = pct >= 95 ? 'var(--bad)' : pct >= 80 ? 'var(--warn)' : color;
    return `<div class="nx-card nx-g nx-fade"><div class="nx-ring"><svg width="64" height="64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--line2)" stroke-width="7"/>
      <circle cx="32" cy="32" r="27" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - Math.max(pct, 1.5) / 100)}"/></svg><b>${unl ? '∞' : Math.round(pct) + '%'}</b></div>
      <div><small>${esc(label)}</small><strong>${esc(size(u.used))}</strong><span>of ${esc(size(u.max))}</span></div></div>`;
  }
  const animateRings = (box) => requestAnimationFrame(() => setTimeout(() => box.querySelectorAll('[data-off]').forEach((c) => { c.style.strokeDashoffset = c.dataset.off; }), 60));

  async function loadDeploy(a, force) {
    if (!force && S.deploy[a.domain]) return S.deploy[a.domain];
    const r = await api('/api/panel/deploy?domain=' + encodeURIComponent(a.domain));
    if (r.ok) S.deploy[a.domain] = r.j; return r.ok ? r.j : { error: r.j.error || 'Could not load' };
  }

  // ---------- Overview ----------
  async function overview(box) {
    const a = S.cur; const u = a.usage || {};
    box.innerHTML = `${head('Overview')}
      ${a.justCreated ? `<div class="nx-banner nx-fade">${ic('bolt', 20)}<div><b>Your website is being switched on.</b> New hosting usually starts working within 2–5 minutes. You can already connect GitHub, create databases and email accounts.</div></div>` : ''}
      <div class="nx-hero">
        <div class="nx-card nx-prev nx-fade"><div class="nx-browser"><div class="nx-bar"><i></i><i></i><i></i><div class="nx-url">${ic('lock', 12)} https://${esc(a.domain)}</div></div>
          <div class="nx-frame" data-frame><div class="nx-fallback"><div>${ic('globe', 30)}<br><b style="color:#0B1220">${esc(a.domain)}</b><br>${a.preview === false ? 'Open your website to see it' : 'Loading preview…'}</div></div>
          ${a.preview ? `<iframe title="Live preview of ${esc(a.domain)}" loading="lazy" sandbox="allow-scripts allow-same-origin" src="https://${esc(a.domain)}/" tabindex="-1" style="opacity:0;transition:opacity .4s"></iframe>` : ''}
          <a class="nx-cover" href="https://${esc(a.domain)}" target="_blank" rel="noopener" aria-label="Open your website"></a></div></div></div>
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Website details</h3></div><div class="nx-facts">
          <div class="nx-fact"><span class="k">${ic('bolt', 16)} Status</span><span class="v ${a.suspended ? '' : 'nx-ok'}">${a.suspended ? 'Paused — please renew' : 'Online'}</span></div>
          <div class="nx-fact"><span class="k">${ic('lock', 16)} SSL</span><span class="v ${a.ssl && a.ssl.ok ? 'nx-ok' : ''}">${a.ssl && a.ssl.ok ? 'Secure (https)' + (a.ssl.validUntil ? ' · renews by itself' : '') : 'Being set up'}</span></div>
          <div class="nx-fact"><span class="k">${ic('panel', 16)} Plan</span><span class="v">${esc(planName(a.plan))}</span></div>
          <div class="nx-fact"><span class="k">${ic('git', 16)} GitHub</span><span class="v" data-gh><span class="nx-skel" style="display:inline-block;width:160px;height:14px"></span></span></div>
          <div class="nx-fact"><span class="k">${ic('rocket', 16)} Last deploy</span><span class="v" data-last><span class="nx-skel" style="display:inline-block;width:120px;height:14px"></span></span></div>
          ${a.since ? `<div class="nx-fact"><span class="k">${ic('check', 16)} Online since</span><span class="v">${esc(a.since)}</span></div>` : ''}
        </div></div>
      </div>
      <div class="nx-gauges">${ring('Disk space', u.diskusage, 'var(--acc)')}${ring('Bandwidth (month)', u.bandwidthusage, 'var(--acc2)')}${ring('Email accounts', u.emailaccounts, '#8B5CF6')}${ring('Databases', u.mysqldatabases, '#14B8A6')}</div>
      <div class="nx-two">
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Recent deployments</h3><span class="nx-sp"></span><button class="nx-btn sm" data-goto="deploy">View all</button></div><div data-recent><div class="nx-card-b"><div class="nx-skel" style="height:44px;margin-bottom:10px"></div><div class="nx-skel" style="height:44px"></div></div></div></div>
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Quick actions</h3></div><div class="nx-card-b nx-acts">
          <button class="nx-qa" data-goto="deploy"><span class="q">${ic('git')}</span>Deploy from GitHub<span>Push to update your site</span></button>
          <button class="nx-qa" data-goto="db"><span class="q">${ic('db')}</span>New database<span>Created &amp; connected for you</span></button>
          <button class="nx-qa" data-goto="email"><span class="q">${ic('mail')}</span>New email<span>you@${esc(a.domain)}</span></button>
          <button class="nx-qa" data-goto="files"><span class="q">${ic('upload')}</span>Upload files<span>Drag &amp; drop your site</span></button>
        </div></div>
      </div>`;
    animateRings(box);
    box.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => go(b.dataset.goto));
    // live preview: scale the 1440px-wide page down to the card; if the site refuses to be framed, the fallback stays visible
    const fr = box.querySelector('[data-frame]'); const ifr = fr.querySelector('iframe');
    if (ifr) { const fit = () => { ifr.style.transform = `scale(${fr.clientWidth / 1440})`; }; fit(); window.addEventListener('resize', fit); ifr.addEventListener('load', () => { ifr.style.opacity = '1'; }); }
    const d = await loadDeploy(a);
    if (S.view !== 'overview' || S.cur !== a) return;
    const gh = box.querySelector('[data-gh]'), last = box.querySelector('[data-last]'), rec = box.querySelector('[data-recent]');
    if (d.project) { gh.innerHTML = `<a href="${esc(d.project.repo_url.replace(/\.git$/, ''))}" target="_blank" rel="noopener" style="text-decoration:none">${esc(repoName(d.project.repo_url))}</a> <span class="nx-muted">· ${d.project.auto_deploy ? 'auto-deploy on' : 'auto-deploy paused'}</span>`; }
    else gh.innerHTML = `<button class="nx-btn sm" data-goto2>${ic('plus', 14)} Connect a repository</button>`;
    const runs = (d.runs || []);
    last.innerHTML = runs[0] ? `${pill(runs[0].status)} <span class="nx-muted" style="margin-left:6px">${esc(ago(runs[0].started_at))}</span>` : '<span class="nx-muted">None yet</span>';
    rec.innerHTML = runs.length ? runs.slice(0, 4).map(depRow).join('') : `<div class="nx-empty"><b>No deployments yet</b>Connect GitHub and your site goes live in under a minute.<div style="margin-top:14px"><button class="nx-btn pri" data-goto2>${ic('git', 16)} Deploy from GitHub</button></div></div>`;
    box.querySelectorAll('[data-goto2]').forEach((b) => b.onclick = () => go('deploy'));
  }

  const planName = (p) => { const s = String(p || 'Hosting'); return s.charAt(0).toUpperCase() + s.slice(1); };
  const repoName = (u) => String(u || '').replace(/^https:\/\/(.*@)?github\.com\//, '').replace(/\.git$/, '');
  const pill = (s) => s === 'live' ? `<span class="nx-pill live">${ic('check', 13)} Live</span>` : s === 'failed' ? `<span class="nx-pill failed">${ic('x', 13)} Failed</span>` : `<span class="nx-pill building"><span class="nx-spin"></span> Deploying</span>`;
  const trig = (t) => t === 'auto' ? 'pushed to GitHub' : t === 'first' ? 'first deploy' : 'deployed by you';
  function depRow(d) {
    return `<div class="nx-dep ${esc(d.status)}">${pill(d.status)}<div class="m"><b>${esc((d.message || 'Deployment').split('\n')[0])}</b>
      <small>${d.commit_id ? `<span class="nx-code">${esc(d.commit_id.slice(0, 7))}</span> · ` : ''}${esc(trig(d.trigger))}${d.author && d.trigger !== 'manual' ? ' by ' + esc(d.author) : ''} · ${esc(ago(d.started_at))}</small></div></div>`;
  }

  // ---------- Deployments ----------
  async function deployView(box, fresh) {
    const a = S.cur;
    if (!fresh) box.innerHTML = `${head('Deployments')}<div class="nx-card"><div class="nx-card-b"><div class="nx-skel" style="height:54px;margin-bottom:10px"></div><div class="nx-skel" style="height:54px"></div></div></div>`;
    const d = await loadDeploy(a, true);
    if (S.view !== 'deploy' || S.cur !== a) return;
    if (d.error) { box.innerHTML = head('Deployments') + `<div class="nx-card nx-card-b nx-msg bad">${esc(d.error)}</div>`; return; }
    if (!d.project) return connectView(box, a);
    const runs = d.runs || []; const building = runs.find((r) => r.status === 'building');
    box.innerHTML = `${head('Deployments', `<label class="nx-btn" style="cursor:pointer"><input type="checkbox" data-auto ${d.project.auto_deploy ? 'checked' : ''} style="accent-color:var(--acc);width:17px;height:17px"> Auto-deploy on push</label>
        <button class="nx-btn pri" data-now ${building ? 'disabled' : ''}>${ic('rocket', 16)} ${building ? 'Deploying…' : 'Deploy now'}</button>`)}
      <div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-b" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">
        <span class="nx-qa" style="cursor:default;padding:0;border:0;background:none"><span class="q">${ic('git')}</span></span>
        <div style="flex:1;min-width:220px"><b style="font-size:16px"><a href="${esc(d.project.repo_url.replace(/\.git$/, '').replace(/https:\/\/.*@github/, 'https://github'))}" target="_blank" rel="noopener" style="text-decoration:none">${esc(repoName(d.project.repo_url))}</a></b>
          <div class="nx-muted" style="font-size:13.5px">Branch <span class="nx-code">${esc(d.project.branch || 'default')}</span> · connected ${esc(ago(d.project.created_at))} · every push to GitHub updates <b>${esc(a.domain)}</b></div></div></div></div>
      ${building ? `<div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-h"><h3>Deploying now</h3><span class="nx-sp"></span>${pill('building')}</div><div class="nx-card-b">
          <div class="nx-steps"><span class="nx-step done"><i>${ic('check', 12)}</i>Commit received</span><span class="nx-line done"></span>
          <span class="nx-step now"><i><span class="nx-spin" style="width:10px;height:10px"></span></i>Getting code &amp; copying files</span><span class="nx-line go"></span>
          <span class="nx-step"><i>3</i>Live</span></div>
          <pre class="nx-term"><span class="d">$</span> deploy ${esc(repoName(d.project.repo_url))}@${esc((building.commit_id || '').slice(0, 7))}\n<span class="d">→</span> ${esc((building.message || '').split('\n')[0])}\n<span class="d">→ copying your files to ${esc(a.domain)}…</span></pre></div></div>` : ''}
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>History</h3><span class="nx-muted" style="font-size:13px">${runs.length} deployment${runs.length === 1 ? '' : 's'}</span></div>
        ${runs.length ? runs.map((r, i) => `${depRow(r).replace('</div></div>', `</div><button class="nx-btn sm" data-log="${i}">Logs</button></div>`)}<div data-logbox="${i}" hidden style="padding:0 20px 16px"><pre class="nx-term">${termLog(r, d.project, a)}</pre></div>`).join('') : '<div class="nx-empty"><b>Waiting for the first deployment</b>It starts within a minute.</div>'}</div>`;
    box.querySelectorAll('[data-log]').forEach((b) => b.onclick = () => { const lb = box.querySelector(`[data-logbox="${b.dataset.log}"]`); lb.hidden = !lb.hidden; b.textContent = lb.hidden ? 'Logs' : 'Hide'; });
    box.querySelector('[data-auto]').onchange = async (e) => { await post('/api/panel/deploy/auto', { domain: a.domain, on: e.target.checked }); toast(e.target.checked ? 'Auto-deploy is on' : 'Auto-deploy paused'); };
    box.querySelector('[data-now]').onclick = async (e) => { e.currentTarget.disabled = true; e.currentTarget.innerHTML = `<span class="nx-spin"></span> Starting…`; const x = await post('/api/panel/deploy/now', { domain: a.domain }); toast(x.ok ? 'Deployment finished' : (x.j.error || 'Could not deploy')); deployView(box, true); };
    if (building || (runs[0] && Date.now() - new Date(runs[0].started_at) < 60000)) S.timer = setTimeout(() => { if (S.view === 'deploy') deployView(box, true); }, 3000);
  }
  function termLog(r, p, a) {
    const L = [`<span class="d">$</span> deploy ${esc(repoName(p.repo_url))}${r.commit_id ? '@' + esc(r.commit_id.slice(0, 7)) : ''}`,
      `<span class="d">→</span> ${esc(trig(r.trigger))} · ${esc(fmtDate(r.started_at))} ${esc(new Date(r.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}`];
    if (r.message) L.push(`<span class="d">→</span> ${esc(r.message.split('\n')[0])}`);
    if (r.log) L.push((r.status === 'failed' ? '<span class="r">✗ ' : '') + esc(r.log) + (r.status === 'failed' ? '</span>' : ''));
    if (r.status === 'live') { const secs = r.finished_at ? Math.max(1, Math.round((new Date(r.finished_at) - new Date(r.started_at)) / 1000)) : null; L.push(`<span class="g">✓ Live on https://${esc(a.domain)}${secs ? ' in ' + secs + ' s' : ''}</span>`); }
    return L.join('\n');
  }
  function connectView(box, a) {
    box.innerHTML = `${head('Deploy from GitHub')}
      <div class="nx-3 nx-fade"><div><b><em>1</em> Connect</b>Paste your GitHub repository link.</div><div><b><em>2</em> We deploy</b>Your site goes live on ${esc(a.domain)} in under a minute.</div><div><b><em>3</em> Push to update</b>Every push to GitHub updates your website by itself.</div></div>
      <div class="nx-card nx-fade"><div class="nx-card-b"><form class="nx-form" data-f>
        <label>GitHub repository<input class="nx-in" name="repo" placeholder="https://github.com/your-name/your-site" required autocomplete="off"></label>
        <label><span>Branch <span class="nx-muted" style="font-weight:500">— leave empty for the default branch</span></span><input class="nx-in" name="branch" placeholder="main"></label>
        <label class="nx-check"><input type="checkbox" name="withdb" checked><div><b>Also create a database for this site</b><span>We create it, give it a strong password and save the connection details where your site can read them.</span></div></label>
        <details><summary style="cursor:pointer;font-size:14px;font-weight:600;color:var(--tx2)">Private repository?</summary>
          <label style="margin-top:10px">GitHub access token (read-only)<input class="nx-in" name="token" type="password" placeholder="github_pat_…" autocomplete="off"></label>
          <p class="nx-note" style="margin-top:6px">Create a fine-grained token on GitHub with read-only access to this one repository.</p></details>
        <div><button class="nx-btn pri" type="submit" style="height:46px;padding:0 22px;font-size:15px">${ic('rocket', 17)} Connect &amp; deploy</button></div>
        <div class="nx-msg" data-out></div></form>
        <p class="nx-note" style="margin-top:14px">Works for websites made of HTML, CSS, JavaScript and PHP (including sites exported from builders). Your repository's history is never made public.</p></div></div>`;
    const f = box.querySelector('[data-f]');
    f.onsubmit = async (e) => {
      e.preventDefault(); const btn = f.querySelector('button[type=submit]'); const out = f.querySelector('[data-out]');
      btn.disabled = true; btn.innerHTML = '<span class="nx-spin"></span> Connecting to GitHub…'; out.className = 'nx-msg'; out.textContent = '';
      const x = await post('/api/panel/deploy/connect', { domain: a.domain, repo: f.repo.value, branch: f.branch.value, token: f.token.value || undefined, database: f.withdb.checked ? 'site' : undefined });
      if (!x.ok) { out.className = 'nx-msg bad'; out.textContent = x.j.error || 'Could not connect.'; btn.disabled = false; btn.innerHTML = `${ic('rocket', 17)} Connect &amp; deploy`; return; }
      delete S.deploy[a.domain]; toast('Connected — deploying');
      await deployView(box, true);
      if (x.j.database && x.j.database.password) { const c = document.createElement('div'); c.innerHTML = credsBox(x.j.database); box.querySelector('.nx-head').after(c); bindCreds(c); }
      else if (x.j.database && x.j.database.error) toast('Database not created: ' + x.j.database.error);
    };
  }

  // ---------- Databases ----------
  function credsBox(d) {
    const row = (k, v, secret) => `<div class="cr"><span>${esc(k)}</span><span class="cv" ${secret ? 'data-reveal style="filter:blur(5px);cursor:pointer" title="Click to show"' : ''}>${esc(v)}</span><button class="nx-btn sm" data-copy="${esc(v)}">${ic('copy', 14)} Copy</button></div>`;
    return `<div class="nx-creds nx-fade"><b style="display:flex;align-items:center;gap:8px;font-size:15px">${ic('key', 17)} Connection details for ${esc(d.database)}</b>
      <p class="nx-note" style="margin:3px 0 8px">Copy the password now — for your safety it is not shown again (you can always set a new one).</p>
      ${row('Host', d.host || 'localhost')}${row('Port', String(d.port || 3306))}${row('Database', d.database)}${row('User', d.user)}${row('Password', d.password, true)}
      ${d.configSaved ? `<p class="nx-note" style="margin-top:10px">${ic('check', 14)} <b style="color:var(--tx)">Already connected for your website.</b> PHP: <span class="nx-code">$db = require __DIR__ . '/../${esc(d.configFile)}';</span> · Other apps read <span class="nx-code">${esc(d.envFile)}</span></p>` : ''}</div>`;
  }
  function bindCreds(el) {
    el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.copy));
    el.querySelectorAll('[data-reveal]').forEach((s) => s.onclick = () => { s.style.filter = 'none'; });
  }
  async function dbView(box, fresh) {
    const a = S.cur;
    box.innerHTML = `${head('Databases', ' ')}<div class="nx-card"><div class="nx-card-b"><div class="nx-skel" style="height:50px"></div></div></div>`;
    const r = await api('/api/panel/databases?domain=' + encodeURIComponent(a.domain));
    if (S.view !== 'db' || S.cur !== a) return;
    const list = (r.j && r.j.databases) || []; const max = r.j && r.j.max;
    const full = max !== null && max !== undefined && max !== 'unlimited' && list.length >= Number(max);
    box.querySelector('.nx-card').outerHTML = `${fresh ? credsBox(fresh) : ''}
      <div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-h"><h3>Your databases</h3><span class="nx-muted" style="font-size:13px">${list.length}${max !== null && max !== undefined ? ' of ' + esc(max) : ''} on your plan</span></div>
        ${!r.ok ? `<div class="nx-card-b nx-msg bad">${esc(r.j.error || 'Could not load.')}</div>` : list.length ? list.map((d) => `<div class="nx-row"><div class="m"><b>${ic('db', 16)} ${esc(d.name)}</b><small>${esc(d.sizeMB)} MB · user <span class="nx-code">${esc((d.users || [])[0] || '—')}</span></small></div>
          <button class="nx-btn sm" data-pw="${esc(d.name)}">${ic('key', 14)} New password</button><button class="nx-btn sm danger" data-del="${esc(d.name)}">${ic('trash', 14)} Delete</button></div>`).join('')
          : `<div class="nx-empty"><b>No databases yet</b>Create one below — it's connected to your website automatically.</div>`}</div>
      ${full ? `<div class="nx-banner">${ic('db', 18)} Your plan's database limit is reached. Upgrade your plan for more databases.</div>` : `
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>New database</h3></div><div class="nx-card-b"><form class="nx-form" data-f>
        <label>Name<input class="nx-in" name="name" placeholder="e.g. bookings, shop, site" required maxlength="16"></label>
        <p class="nx-note">We create the database, a user with its own strong password, and connect it to your website — all in one step.</p>
        <div><button class="nx-btn pri" type="submit">${ic('plus', 16)} Create database</button></div><div class="nx-msg" data-out></div></form></div></div>`}`;
    bindCreds(box);
    const pma = box.querySelector('[data-pma]'); if (pma) pma.onclick = async () => { const w = window.open('about:blank', '_blank'); const x = await post('/api/panel/phpmyadmin', { domain: a.domain }); if (x.ok && x.j.url) { if (w) w.location = x.j.url; } else { if (w) w.close(); toast(x.j.error || 'Could not open phpMyAdmin'); } };
    const f = box.querySelector('[data-f]');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); const out = f.querySelector('[data-out]'); const b = f.querySelector('button'); b.disabled = true; b.innerHTML = '<span class="nx-spin"></span> Creating…';
      const x = await post('/api/panel/databases', { domain: a.domain, name: f.name.value });
      if (!x.ok) { out.className = 'nx-msg bad'; out.textContent = x.j.error || 'Could not create it.'; b.disabled = false; b.innerHTML = `${ic('plus', 16)} Create database`; return; }
      toast('Database created'); dbView(box, x.j); };
    box.querySelectorAll('[data-pw]').forEach((b) => b.onclick = async () => { if (!confirm('Set a new password for ' + b.dataset.pw + '? Your website\'s saved connection file is updated automatically.')) return;
      const x = await post('/api/panel/databases/password', { domain: a.domain, database: b.dataset.pw }); if (x.ok) dbView(box, x.j); else toast(x.j.error || 'Could not change it'); });
    box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirm('Delete the database ' + b.dataset.del + ' and ALL its data? This cannot be undone.')) return;
      const x = await post('/api/panel/databases/delete', { domain: a.domain, database: b.dataset.del }); toast(x.ok ? 'Database deleted' : (x.j.error || 'Could not delete it')); dbView(box); });
  }

  // ---------- Email ----------
  const genPassword = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const x = new Uint32Array(14); crypto.getRandomValues(x); return Array.from(x, (n) => c[n % c.length]).join('') + '#' + (x[0] % 9); };
  async function emailView(box) {
    const a = S.cur;
    box.innerHTML = `${head('Email accounts', `<a class="nx-btn" href="https://${esc(a.domain)}/webmail" target="_blank" rel="noopener">${ic('ext', 16)} Open webmail</a>`)}<div class="nx-card"><div class="nx-card-b"><div class="nx-skel" style="height:50px"></div></div></div>`;
    const r = await api('/api/panel/email?domain=' + encodeURIComponent(a.domain));
    if (S.view !== 'email' || S.cur !== a) return;
    const list = (r.j && r.j.accounts) || [];
    box.querySelector('.nx-card').outerHTML = `<div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-h"><h3>Mailboxes</h3><span class="nx-muted" style="font-size:13px">${list.length} account${list.length === 1 ? '' : 's'}</span></div>
        ${!r.ok ? `<div class="nx-card-b nx-msg bad">${esc(r.j.error || 'Could not load.')}</div>` : list.length ? list.map((m) => `<div class="nx-row"><div class="m"><b><span class="nx-av" style="width:30px;height:30px;font-size:12px">${esc(m.email[0].toUpperCase())}</span> ${esc(m.email)}</b><small>${esc(Number(m.usedMB || 0).toFixed(1))} MB used${m.quotaMB ? ' of ' + esc(m.quotaMB) + ' MB' : ''}</small></div>
          <button class="nx-btn sm" data-cp="${esc(m.email)}">${ic('copy', 14)} Copy address</button><button class="nx-btn sm danger" data-del="${esc(m.email)}">${ic('trash', 14)} Delete</button></div>`).join('')
          : `<div class="nx-empty"><b>No email accounts yet</b>Create a professional address like info@${esc(a.domain)} below.</div>`}</div>
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>New email address</h3></div><div class="nx-card-b"><form class="nx-form" data-f>
        <label>Address<span style="display:flex;align-items:center;gap:8px"><input class="nx-in" name="name" placeholder="info" style="flex:1;min-width:0" required> <b style="color:var(--tx2)">@${esc(a.domain)}</b></span></label>
        <label>Password<span style="display:flex;gap:8px"><input class="nx-in" name="password" style="flex:1;min-width:0" required minlength="10" autocomplete="new-password"> <button class="nx-btn" type="button" data-gen style="height:44px">Suggest</button></span></label>
        <div><button class="nx-btn pri" type="submit">${ic('plus', 16)} Create email</button></div><div class="nx-msg" data-out></div></form></div></div>`;
    const f = box.querySelector('[data-f]');
    f.querySelector('[data-gen]').onclick = () => { f.password.value = genPassword(); };
    f.onsubmit = async (e) => { e.preventDefault(); const out = f.querySelector('[data-out]');
      const x = await post('/api/panel/email', { domain: a.domain, name: f.name.value, password: f.password.value });
      if (!x.ok) { out.className = 'nx-msg bad'; out.textContent = x.j.error || 'Could not create it.'; return; }
      toast(x.j.email + ' is ready'); setTimeout(() => emailView(box), 900); };
    box.querySelectorAll('[data-cp]').forEach((b) => b.onclick = () => copy(b.dataset.cp));
    emailExtras(box, a);
    box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirm('Delete ' + b.dataset.del + '? All its emails will be removed.')) return;
      await post('/api/panel/email/delete', { domain: a.domain, email: b.dataset.del }); toast('Deleted'); emailView(box); });
  }

  // ---------- unpaid: everything locked until the renewal is paid ----------
  function lockedView(box) {
    const a = S.cur;
    box.innerHTML = `<div class="nx-head nx-fade"><div style="min-width:0"><div class="nx-muted" style="font-size:13.5px;font-weight:600;margin-bottom:2px">Control panel</div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px"><h1>${esc(a.domain)}</h1><span class="nx-status off"><span class="nx-pulse"></span>${a.sitePaused ? 'Paused' : 'Renewal due'}</span></div></div></div>
      <div class="nx-card nx-fade" style="max-width:720px"><div class="nx-card-b" style="padding:34px 30px;text-align:center">
        <span class="nx-big warn" style="margin:0 auto 14px">${ic('lock', 28)}</span>
        <h2 style="font-size:23px;margin-bottom:8px">${a.sitePaused ? 'Your hosting is paused' : 'Your hosting renewal is due'}</h2>
        <p class="nx-note" style="font-size:15.5px;max-width:520px;margin:0 auto">The renewal for <b style="color:var(--tx)">${esc(a.domain)}</b> has not been paid${a.dueAt ? ' (it was due on <b style="color:var(--tx)">' + esc(fmtDate(a.dueAt)) + '</b>)' : ''}. ${a.sitePaused ? 'Your website and control panel are locked until payment is received.' : 'Your control panel is locked until the renewal is paid. Your website stays online for now' + (a.graceEndsAt ? ' — it will be paused on <b style="color:var(--tx)">' + esc(fmtDate(a.graceEndsAt)) + '</b> if still unpaid' : '') + '.'} <b style="color:var(--tx)">Nothing has been deleted.</b></p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px">
          <a class="nx-btn pri" href="/account" style="height:48px;padding:0 26px;font-size:16px;background:#16A34A;border-color:#16A34A">${ic('bolt', 18)} Pay now to unlock</a>
          <a class="nx-btn" href="mailto:billing@nadinecloud.com?subject=${encodeURIComponent('Hosting renewal — ' + a.domain)}">${ic('mail', 16)} Talk to billing</a></div>
        <p class="nx-note" style="margin-top:16px">Pay by Airtel Money, MTN MoMo, Zamtel Kwacha or card. Everything unlocks automatically within minutes.</p></div></div>`;
  }

  // ---------- small helpers for the new tools ----------
  const sizeTxt = (n) => n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
  const loading = (box, title, extra) => { box.innerHTML = `${head(title, extra)}<div class="nx-card"><div class="nx-card-b"><div class="nx-skel" style="height:50px;margin-bottom:10px"></div><div class="nx-skel" style="height:50px"></div></div></div>`; };
  const errCard = (m) => `<div class="nx-card nx-card-b nx-msg bad">${esc(m || 'Could not load.')}</div>`;
  const still = (v, a) => S.view === v && S.cur === a;

  // ---------- Files ----------
  const TEXT_EXT = /\.(html?|css|js|mjs|json|txt|md|php|xml|svg|htaccess|env|ini|csv|yml|yaml|ts|tsx|jsx|py|sql)$|^\.htaccess$/i;
  async function filesView(box, dir) {
    const a = S.cur; dir = dir == null ? (S.fileDir && S.fileDir[a.domain]) || 'public_html' : dir;
    (S.fileDir = S.fileDir || {})[a.domain] = dir;
    loading(box, 'Files', `<button class="nx-btn" data-mk>${ic('folder', 16)} New folder</button><label class="nx-btn pri" style="cursor:pointer">${ic('upload', 16)} Upload<input type="file" multiple data-up hidden></label>`);
    const r = await api('/api/panel/files?domain=' + encodeURIComponent(a.domain) + '&dir=' + encodeURIComponent(dir));
    if (!still('files', a)) return;
    const card = box.querySelector('.nx-card');
    if (!r.ok) { card.outerHTML = errCard(r.j.error); return; }
    const parts = dir ? dir.split('/') : [];
    const crumbs = `<button class="nx-crumb" data-cd="">${ic('folder', 14)} home</button>` + parts.map((p, i) => `<span class="nx-muted">/</span><button class="nx-crumb" data-cd="${esc(parts.slice(0, i + 1).join('/'))}">${esc(p)}</button>`).join('');
    const join = (n) => (dir ? dir + '/' : '') + n;
    card.outerHTML = `<div class="nx-card nx-fade nx-drop" data-drop>
      <div class="nx-card-h" style="flex-wrap:wrap">${crumbs}<span class="nx-sp"></span>${dir === 'public_html' ? '<span class="nx-muted" style="font-size:12.5px">This folder is your website</span>' : ''}</div>
      ${dir ? `<div class="nx-frow" data-cd="${esc(parts.slice(0, -1).join('/'))}" style="cursor:pointer"><span class="nx-fi">${ic('up', 16)}</span><b>Back</b></div>` : ''}
      ${r.j.items.length ? r.j.items.map((f) => `<div class="nx-frow">
          <span class="nx-fi ${f.dir ? 'd' : ''}">${ic(f.dir ? 'folder' : 'file', 16)}</span>
          ${f.dir ? `<button class="nx-fname" data-cd="${esc(join(f.name))}">${esc(f.name)}</button>` : `<span class="nx-fname">${esc(f.name)}</span>`}
          <span class="nx-muted nx-fmeta">${f.dir ? '' : sizeTxt(f.size)}</span><span class="nx-muted nx-fmeta">${f.at ? esc(fmtDate(f.at)) : ''}</span>
          <span class="nx-facts2">
            ${!f.dir && TEXT_EXT.test(f.name) && f.size < 1500000 ? `<button class="nx-btn sm" data-edit="${esc(join(f.name))}" title="Edit">${ic('edit', 14)} Edit</button>` : ''}
            ${!f.dir && /\.zip$/i.test(f.name) ? `<button class="nx-btn sm" data-unzip="${esc(join(f.name))}">Unzip</button>` : ''}
            <button class="nx-btn sm" data-ren="${esc(join(f.name))}" data-n="${esc(f.name)}">Rename</button>
            <button class="nx-btn sm danger" data-rm="${esc(join(f.name))}" title="Delete">${ic('trash', 14)}</button></span></div>`).join('')
        : `<div class="nx-empty"><b>This folder is empty</b>Drag files here, or press Upload. Tip: upload a .zip of your whole site and press Unzip.</div>`}
      <div class="nx-dropmsg">${ic('upload', 26)}<b>Drop files to upload to /${esc(dir)}</b></div></div>
      <p class="nx-note" style="margin-top:12px">Deleted files go to the bin folder <span class="nx-code">.trash</span> in home, so mistakes can be undone. Files up to 40 MB each.</p>`;
    box.querySelectorAll('[data-cd]').forEach((b) => b.onclick = () => filesView(box, b.dataset.cd));
    const upload = async (files) => {
      for (const f of files) {
        toast('Uploading ' + f.name + '…');
        const x = await fetch(`/api/panel/files/upload?domain=${encodeURIComponent(a.domain)}&dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(f.name)}`, { method: 'POST', credentials: 'same-origin', body: f }).then((r2) => r2.json().catch(() => ({})).then((j) => ({ ok: r2.ok, j })));
        if (!x.ok) { toast(x.j.error || 'Upload failed'); return filesView(box, dir); }
      }
      toast(files.length + ' file' + (files.length === 1 ? '' : 's') + ' uploaded'); filesView(box, dir);
    };
    box.querySelector('[data-up]').onchange = (e) => upload([...e.target.files]);
    const drop = box.querySelector('[data-drop]');
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); };
    box.querySelector('[data-mk]').onclick = async () => { const n = prompt('Folder name'); if (!n) return; const x = await post('/api/panel/files/mkdir', { domain: a.domain, dir, name: n }); toast(x.ok ? 'Folder created' : x.j.error); filesView(box, dir); };
    box.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => { if (!confirm('Delete ' + b.dataset.rm + '? It goes to the .trash folder.')) return; const x = await post('/api/panel/files/delete', { domain: a.domain, path: b.dataset.rm }); toast(x.ok ? 'Deleted' : x.j.error); filesView(box, dir); });
    box.querySelectorAll('[data-ren]').forEach((b) => b.onclick = async () => { const n = prompt('New name', b.dataset.n); if (!n || n === b.dataset.n) return; const x = await post('/api/panel/files/rename', { domain: a.domain, path: b.dataset.ren, newName: n }); toast(x.ok ? 'Renamed' : x.j.error); filesView(box, dir); });
    box.querySelectorAll('[data-unzip]').forEach((b) => b.onclick = async () => { b.disabled = true; b.textContent = 'Unzipping…'; const x = await post('/api/panel/files/extract', { domain: a.domain, path: b.dataset.unzip }); toast(x.ok ? 'Unzipped' : x.j.error); filesView(box, dir); });
    box.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editFile(box, b.dataset.edit, dir));
  }
  async function editFile(box, path, backDir) {
    const a = S.cur;
    loading(box, 'Edit file', `<button class="nx-btn" data-back>${ic('up', 16)} Back to files</button><button class="nx-btn pri" data-save disabled>${ic('check', 16)} Save</button>`);
    box.querySelector('[data-back]').onclick = () => filesView(box, backDir);
    const r = await api('/api/panel/files/read?domain=' + encodeURIComponent(a.domain) + '&path=' + encodeURIComponent(path));
    if (!still('files', a)) return;
    if (!r.ok) { box.querySelector('.nx-card').outerHTML = errCard(r.j.error); return; }
    box.querySelector('.nx-card').outerHTML = `<div class="nx-card nx-fade"><div class="nx-card-h"><span class="nx-code">${esc(path)}</span><span class="nx-sp"></span><span class="nx-muted" style="font-size:12.5px" data-state>No changes</span></div>
      <textarea class="nx-editor" spellcheck="false" data-ta></textarea></div>`;
    const ta = box.querySelector('[data-ta]'); ta.value = r.j.content; const save = box.querySelector('[data-save]'); const st = box.querySelector('[data-state]');
    ta.oninput = () => { save.disabled = false; st.textContent = 'Not saved yet'; };
    ta.onkeydown = (e) => { if (e.key === 'Tab') { e.preventDefault(); const p0 = ta.selectionStart; ta.setRangeText('  ', p0, ta.selectionEnd, 'end'); ta.oninput(); } if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save.click(); } };
    save.onclick = async () => { save.disabled = true; save.innerHTML = '<span class="nx-spin"></span> Saving…'; const x = await post('/api/panel/files/save', { domain: a.domain, path, content: ta.value });
      save.innerHTML = `${ic('check', 16)} Save`; if (x.ok) { st.textContent = 'Saved ✓ — live on your website now'; toast('Saved'); } else { save.disabled = false; toast(x.j.error || 'Could not save'); } };
  }

  // ---------- Domain & SSL ----------
  async function domainView(box) {
    const a = S.cur;
    loading(box, 'Domain & SSL');
    const [d, ssl, subs] = await Promise.all([api('/api/panel/domain?domain=' + encodeURIComponent(a.domain)), api('/api/panel/ssl?domain=' + encodeURIComponent(a.domain)), api('/api/panel/subdomains?domain=' + encodeURIComponent(a.domain))]);
    if (!still('domain', a)) return;
    if (!d.ok) { box.querySelector('.nx-card').outerHTML = errCard(d.j.error); return; }
    const D = d.j; const ns = D.nameservers || []; const usesOurs = ns.length && ns.every((n) => (D.liveNameservers || []).includes(n.toLowerCase()));
    const cert = ((ssl.j && ssl.j.certs) || []).find((c) => c.host === a.domain || (c.aliases || []).includes(a.domain));
    const days = cert && cert.expires ? Math.round((new Date(cert.expires) - Date.now()) / 86400000) : null;
    const cp = (v) => `<span class="nx-cv2">${esc(v)}</span><button class="nx-btn sm" data-copy="${esc(v)}">${ic('copy', 13)} Copy</button>`;
    box.querySelector('.nx-card').outerHTML = `
      <div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-b" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center">
        <span class="nx-big ${D.connected ? 'ok' : 'warn'}">${ic(D.connected ? 'check' : 'bolt', 26)}</span>
        <div style="flex:1;min-width:230px"><h3 style="font-size:19px">${D.connected ? 'Your domain is connected' : 'Your domain is not connected yet'}</h3>
          <div class="nx-muted">${D.connected ? `${esc(a.domain)} opens your website on Nadine Cloud.` : `When ${esc(a.domain)} points to us, your website and email start working. Follow one of the two ways below.`}</div></div>
        <button class="nx-btn" data-recheck>${ic('refresh', 16)} Check again</button></div></div>
      ${D.connected ? '' : `<div class="nx-two" style="margin-bottom:20px">
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Way 1 (easiest): change the nameservers</h3></div><div class="nx-card-b">
          <p class="nx-note" style="margin-bottom:10px">Log in where you bought the domain, open its <b>Nameservers</b> setting, choose <b>Custom</b> and enter:</p>
          ${ns.map((n, i) => `<div class="nx-kv"><span>Nameserver ${i + 1}</span>${cp(n)}</div>`).join('') || '<p class="nx-note">Nameservers not available — use Way 2.</p>'}
          <p class="nx-note" style="margin-top:10px">Changes take from a few minutes up to 24 hours. Press <b>Check again</b> any time.</p></div></div>
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Way 2: add two records</h3></div><div class="nx-card-b">
          <p class="nx-note" style="margin-bottom:10px">Keep your nameservers and add these in your domain's DNS settings:</p>
          <div class="nx-kv"><span>Type A · Name @</span>${cp(D.serverIp || '')}</div>
          <div class="nx-kv"><span>Type A · Name www</span>${cp(D.serverIp || '')}</div>
          <p class="nx-note" style="margin-top:10px">Bought your domain from Nadine Cloud? We connect it for you automatically.</p></div></div></div>`}
      <div class="nx-two" style="margin-bottom:20px">
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>SSL (https)</h3><span class="nx-sp"></span><button class="nx-btn sm" data-ssl>${ic('refresh', 14)} Renew / fix now</button></div><div class="nx-card-b">
          ${cert ? `<div class="nx-kv"><span>Status</span><b class="nx-ok">Secure ✓</b></div><div class="nx-kv"><span>Valid until</span><b>${esc(fmtDate(cert.expires))}${days != null ? ` <span class="nx-muted">(${days} days)</span>` : ''}</b></div><div class="nx-kv"><span>Renews</span><b>Automatically, free</b></div>`
            : `<p class="nx-note">No certificate yet. It is issued automatically once your domain is connected — press <b>Renew / fix now</b> after connecting.</p>`}
          ${(ssl.j && ssl.j.problems || []).length ? `<details style="margin-top:10px"><summary class="nx-muted" style="cursor:pointer">Why it may not be working (${ssl.j.problems.length})</summary>${ssl.j.problems.map((p) => `<p class="nx-note" style="margin-top:6px">${esc(p.domain)}: ${esc(p.problem)}</p>`).join('')}</details>` : ''}</div></div>
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Subdomains</h3></div><div class="nx-card-b">
          ${((subs.j && subs.j.subdomains) || []).map((s) => `<div class="nx-kv"><span><a href="https://${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a></span><button class="nx-btn sm danger" data-delsub="${esc(s)}">${ic('trash', 13)}</button></div>`).join('') || `<p class="nx-note" style="margin-bottom:10px">Like shop.${esc(a.domain)} or blog.${esc(a.domain)}.</p>`}
          <form data-fsub style="display:flex;gap:8px;margin-top:10px;align-items:center"><input class="nx-in" name="name" placeholder="shop" style="flex:1;min-width:0" required><span class="nx-muted" style="white-space:nowrap">.${esc(a.domain)}</span><button class="nx-btn pri">${ic('plus', 15)} Add</button></form></div></div></div>
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>DNS records</h3><span class="nx-muted" style="font-size:12.5px">${usesOurs ? 'Active — your domain uses our nameservers' : 'Used when your domain uses our nameservers'}</span></div>
        <div class="nx-tablewrap"><table class="nx-table"><thead><tr><th>Type</th><th>Name</th><th>Value</th><th></th></tr></thead><tbody>
        ${(D.records || []).map((x) => `<tr><td><span class="nx-chip">${esc(x.type)}</span></td><td class="nx-mono">${esc(x.name === a.domain ? '@' : x.name.replace('.' + a.domain, ''))}</td><td class="nx-mono nx-val" title="${esc(x.value)}">${x.priority != null ? esc(x.priority) + ' ' : ''}${esc(x.value)}</td><td style="text-align:right"><button class="nx-btn sm danger" data-deldns="${esc(x.line)}">${ic('trash', 13)}</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="nx-card-b" style="border-top:1px solid var(--line2)"><form class="nx-dnsform" data-fdns>
          <select class="nx-in" name="type"><option>A</option><option>CNAME</option><option>MX</option><option>TXT</option><option>AAAA</option></select>
          <input class="nx-in" name="name" placeholder="Name (@ or www)" required><input class="nx-in" name="value" placeholder="Value" required style="flex:2">
          <input class="nx-in" name="priority" placeholder="Priority" style="max-width:100px;display:none"><button class="nx-btn pri">${ic('plus', 15)} Add record</button></form>
          <p class="nx-note" style="margin-top:8px">Not sure? Leave DNS as it is — everything your website and email need is already set.</p></div></div>`;
    box.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.copy));
    box.querySelector('[data-recheck]').onclick = () => domainView(box);
    box.querySelector('[data-ssl]').onclick = async (e) => { e.currentTarget.disabled = true; const x = await post('/api/panel/ssl/renew', { domain: a.domain }); toast(x.ok ? 'SSL check started — give it a few minutes' : x.j.error); };
    const fs2 = box.querySelector('[data-fsub]'); fs2.onsubmit = async (e) => { e.preventDefault(); const x = await post('/api/panel/subdomains', { domain: a.domain, name: fs2.name.value }); toast(x.ok ? x.j.subdomain + ' created — its files go in ' + x.j.folder : x.j.error); if (x.ok) domainView(box); };
    box.querySelectorAll('[data-delsub]').forEach((b) => b.onclick = async () => { if (!confirm('Remove ' + b.dataset.delsub + '? Its files are kept.')) return; const x = await post('/api/panel/subdomains/delete', { domain: a.domain, subdomain: b.dataset.delsub }); toast(x.ok ? 'Removed' : x.j.error); domainView(box); });
    const fd = box.querySelector('[data-fdns]'); fd.type.onchange = () => { fd.priority.style.display = fd.type.value === 'MX' ? '' : 'none'; };
    fd.onsubmit = async (e) => { e.preventDefault(); const x = await post('/api/panel/dns/add', { domain: a.domain, type: fd.type.value, name: fd.name.value, value: fd.value.value, priority: fd.priority.value }); toast(x.ok ? 'Record added' : x.j.error); if (x.ok) domainView(box); };
    box.querySelectorAll('[data-deldns]').forEach((b) => b.onclick = async () => { if (!confirm('Delete this DNS record? Your website or email may stop working if it is needed.')) return; const x = await post('/api/panel/dns/delete', { domain: a.domain, line: Number(b.dataset.deldns) }); toast(x.ok ? 'Record deleted' : x.j.error); domainView(box); });
  }

  // ---------- Backups ----------
  async function backupsView(box) {
    const a = S.cur;
    box.innerHTML = `${head('Backups')}
      <div class="nx-card nx-fade" style="margin-bottom:20px"><div class="nx-card-b" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center">
        <span class="nx-big ok">${ic('check', 26)}</span>
        <div style="flex:1;min-width:230px"><h3 style="font-size:19px">Your website is backed up every night</h3>
          <div class="nx-muted">Nadine Cloud automatically keeps a copy of your website files, databases and email every night, stored safely off the server.</div></div></div></div>
      <div class="nx-two">
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Need something restored?</h3></div><div class="nx-card-b">
          <p class="nx-note" style="margin-bottom:14px">Deleted a page by mistake, or an update went wrong? Our team restores it for you — usually the same working day.</p>
          <a class="nx-btn pri" href="mailto:support@nadinecloud.com?subject=${encodeURIComponent('Restore request — ' + a.domain)}&body=${encodeURIComponent('Hello Nadine Cloud,\n\nPlease restore the following for ' + a.domain + ':\n\nWhat: \nFrom which date: \n\nThank you.')}">${ic('mail', 16)} Ask us to restore</a></div></div>
        <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Good to know</h3></div><div class="nx-card-b">
          <div class="nx-kv"><span>How often</span><b>Every night, automatically</b></div>
          <div class="nx-kv"><span>What is included</span><b>Files, databases, email</b></div>
          <div class="nx-kv"><span>Deleted files</span><b>Kept in the bin (.trash) first</b></div>
          <div class="nx-kv"><span>Using GitHub?</span><b>Your code is also safe on GitHub</b></div></div></div></div>`;
  }

  // ---------- Settings: PHP, redirects, error log ----------
  async function settingsView(box) {
    const a = S.cur;
    loading(box, 'Settings');
    const [php, red, logs] = await Promise.all([api('/api/panel/php?domain=' + encodeURIComponent(a.domain)), api('/api/panel/redirects?domain=' + encodeURIComponent(a.domain)), api('/api/panel/logs?domain=' + encodeURIComponent(a.domain))]);
    if (!still('settings', a)) return;
    const vers = (php.j && php.j.versions) || []; const nice = (v) => String(v).replace(/^ea-php(\d)(\d+)$/, 'PHP $1.$2');
    const lines = (logs.j && logs.j.lines) || [];
    box.querySelector('.nx-card').outerHTML = `<div class="nx-two" style="margin-bottom:20px">
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>PHP version</h3></div><div class="nx-card-b">
        ${vers.length ? `<div style="display:flex;gap:8px"><select class="nx-in" data-php style="flex:1">${vers.map((v) => `<option value="${esc(v)}" ${v === php.j.current ? 'selected' : ''}>${esc(nice(v))}${v === php.j.current ? ' (current)' : ''}</option>`).join('')}</select><button class="nx-btn pri" data-setphp>Save</button></div>
          <p class="nx-note" style="margin-top:8px">Most websites work best on the newest version. Change it only if your site needs an older one.</p>` : `<p class="nx-note">${esc((php.j && php.j.error) || 'Not available on this plan.')}</p>`}</div></div>
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Redirects</h3></div><div class="nx-card-b">
        ${((red.j && red.j.redirects) || []).map((x) => `<div class="nx-kv"><span class="nx-mono">${esc(x.from)} → ${esc(x.to)}</span><button class="nx-btn sm danger" data-delred="${esc(x.from)}" data-root="${esc(x.docroot || '')}">${ic('trash', 13)}</button></div>`).join('') || `<p class="nx-note" style="margin-bottom:8px">Send an old address to a new one, e.g. /old-menu → https://${esc(a.domain)}/menu</p>`}
        <form data-fred style="display:grid;gap:8px;margin-top:8px"><input class="nx-in" name="from" placeholder="/old-page" required><input class="nx-in" name="to" placeholder="https://${esc(a.domain)}/new-page" required><button class="nx-btn pri" style="justify-self:start">${ic('plus', 15)} Add redirect</button></form></div></div></div>
      <div class="nx-card nx-fade"><div class="nx-card-h"><h3>Error log</h3><span class="nx-muted" style="font-size:12.5px">Why a page shows an error — newest first</span><span class="nx-sp"></span><button class="nx-btn sm" data-relog>${ic('refresh', 14)} Refresh</button></div><div class="nx-card-b">
        ${lines.length ? `<pre class="nx-term" style="max-height:360px;overflow:auto">${lines.map((l) => `<span class="d">${esc(l.date || '')}</span> ${esc(l.entry || '')}`).join('\n')}</pre>` : '<p class="nx-note">No errors recorded — your website is running cleanly.</p>'}</div></div>`;
    const sp = box.querySelector('[data-setphp]'); if (sp) sp.onclick = async () => { const v = box.querySelector('[data-php]').value; const x = await post('/api/panel/php', { domain: a.domain, version: v }); toast(x.ok ? 'Now using ' + nice(v) : x.j.error); if (x.ok) settingsView(box); };
    const fr = box.querySelector('[data-fred]'); fr.onsubmit = async (e) => { e.preventDefault(); const x = await post('/api/panel/redirects', { domain: a.domain, from: fr.from.value, to: fr.to.value }); toast(x.ok ? 'Redirect added' : x.j.error); if (x.ok) settingsView(box); };
    box.querySelectorAll('[data-delred]').forEach((b) => b.onclick = async () => { const x = await post('/api/panel/redirects/delete', { domain: a.domain, from: b.dataset.delred, docroot: b.dataset.root }); toast(x.ok ? 'Removed' : x.j.error); settingsView(box); });
    box.querySelector('[data-relog]').onclick = () => settingsView(box);
  }

  // ---------- Email extras: change password, forwarders ----------
  async function emailExtras(box, a) {
    box.querySelectorAll('[data-cp]').forEach((b) => {
      const pw = document.createElement('button'); pw.className = 'nx-btn sm'; pw.innerHTML = `${ic('key', 14)} Password`; b.before(pw);
      pw.onclick = async () => { const np = prompt('New password for ' + b.dataset.cp + ' (at least 10 characters). Leave empty for a strong suggested one.'); if (np === null) return;
        const pass = np || genPassword(); const x = await post('/api/panel/email/password', { domain: a.domain, email: b.dataset.cp, password: pass });
        if (x.ok) { if (!np) prompt('Password changed. Copy the new password now:', pass); else toast('Password changed'); } else toast(x.j.error || 'Could not change it'); };
    });
    const card = document.createElement('div'); card.className = 'nx-card nx-fade'; card.style.marginTop = '20px';
    card.innerHTML = `<div class="nx-card-h"><h3>Forwarders</h3><span class="nx-muted" style="font-size:12.5px">Send copies of emails to another address, e.g. your Gmail</span></div><div class="nx-card-b" data-fw><div class="nx-skel" style="height:40px"></div></div>`;
    box.appendChild(card);
    const r = await api('/api/panel/forwarders?domain=' + encodeURIComponent(a.domain));
    if (!still('email', a)) return;
    const fw = card.querySelector('[data-fw]'); const list = (r.j && r.j.forwarders) || [];
    fw.innerHTML = `${list.map((f) => `<div class="nx-kv"><span>${esc(f.from)} → ${esc(f.to)}</span><button class="nx-btn sm danger" data-dfw="${esc(f.from)}" data-to="${esc(f.to)}">${ic('trash', 13)}</button></div>`).join('')}
      <form data-ffw style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center"><input class="nx-in" name="name" placeholder="info" style="flex:1;min-width:120px" required><span class="nx-muted">@${esc(a.domain)} →</span><input class="nx-in" name="to" placeholder="you@gmail.com" style="flex:1;min-width:160px" required><button class="nx-btn pri">${ic('plus', 15)} Add</button></form>`;
    const f = fw.querySelector('[data-ffw]'); f.onsubmit = async (e) => { e.preventDefault(); const x = await post('/api/panel/forwarders', { domain: a.domain, name: f.name.value, to: f.to.value }); toast(x.ok ? 'Forwarder added' : x.j.error); if (x.ok) emailView(box); };
    fw.querySelectorAll('[data-dfw]').forEach((b) => b.onclick = async () => { const x = await post('/api/panel/forwarders/delete', { domain: a.domain, from: b.dataset.dfw, to: b.dataset.to }); toast(x.ok ? 'Removed' : x.j.error); emailView(box); });
  }

  // ---------- start ----------
  function message(title, text, btn) {
    root.innerHTML = `<div class="nx" data-theme="${theme}" style="display:grid;grid-template-rows:1fr;place-items:center;padding:20px;overflow-y:auto"><div class="nx-card" style="max-width:460px;padding:34px;text-align:center">
      <img src="/favicon.svg" alt="" width="44" height="44"><h2 style="margin:14px 0 6px;font-size:22px">${esc(title)}</h2><p class="nx-note" style="font-size:15px">${text}</p>
      <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${btn}</div></div></div>`;
  }
  async function start() {
    if (!document.getElementById('nx-css')) { const s = document.createElement('style'); s.id = 'nx-css'; s.textContent = CSS; document.head.appendChild(s); }
    const me = await api('/api/auth/me').catch(() => ({ ok: false, j: {} }));
    if (!me.j || !me.j.user) { message('Log in to your control panel', 'Manage your websites, deployments, databases and email in one place.', `<a class="nx-btn pri" href="/login?next=/panel">Log in</a><a class="nx-btn" href="/hosting">See hosting plans</a>`); return; }
    S.user = me.j.user;
    const r = await api('/api/panel/accounts').catch(() => null);
    const list = r && r.ok && r.j.accounts ? r.j.accounts.filter((x) => !x.error) : [];
    if (!list.length) { message('No hosting account yet', 'Your control panel appears here as soon as you have a hosting plan with us. Websites we manage for you are looked after by our team.', `<a class="nx-btn pri" href="/hosting">Get hosting</a><a class="nx-btn" href="/account">My account</a>`); return; }
    S.accounts = list;
    const want = new URLSearchParams(location.search).get('site');
    S.cur = list.find((x) => x.domain === want) || list[0];
    shell(); paintSwitcher();
    go(['deploy', 'db', 'email', 'files', 'domain', 'backups', 'settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
  }
  start();
})();
