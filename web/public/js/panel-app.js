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
          <button class="nx-nav" data-v="email">${ic('mail')} Email accounts</button>
          <small>More</small>
          <a class="nx-nav" href="/account">${ic('user')} Billing &amp; account</a>
          <button class="nx-nav" data-cpanel>${ic('panel')} Advanced tools ${ic('ext', 14)}</button>
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
    $('[data-cpanel]').onclick = openCpanel;
    $('[data-logout]').onclick = () => fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(() => { window.location.href = '/'; });
  }

  function paintSwitcher() {
    const a = S.cur; root.querySelector('[data-swname]').textContent = a.domain;
    root.querySelector('[data-swmenu]').innerHTML = S.accounts.map((x) => `<button data-pick="${esc(x.domain)}" class="${x === a ? 'on' : ''}"><span class="nx-pulse" style="color:${x.suspended ? 'var(--warn)' : 'var(--ok)'}"></span>${esc(x.domain)}<span class="nx-chip" style="margin-left:auto">${esc(planName(x.plan))}</span></button>`).join('');
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
    ({ overview, deploy: deployView, db: dbView, email: emailView }[view] || overview)(box);
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
          <button class="nx-qa" data-qcp><span class="q">${ic('panel')}</span>Advanced<span>Open cPanel</span></button>
        </div></div>
      </div>`;
    animateRings(box);
    box.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => go(b.dataset.goto));
    box.querySelector('[data-qcp]').onclick = openCpanel;
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
    box.innerHTML = `${head('Databases', `<button class="nx-btn" data-pma>${ic('ext', 16)} Open phpMyAdmin</button>`)}<div class="nx-card"><div class="nx-card-b"><div class="nx-skel" style="height:50px"></div></div></div>`;
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
    box.querySelector('[data-pma]').onclick = async () => { const w = window.open('about:blank', '_blank'); const x = await post('/api/panel/phpmyadmin', { domain: a.domain }); if (x.ok && x.j.url) { if (w) w.location = x.j.url; } else { if (w) w.close(); toast(x.j.error || 'Could not open phpMyAdmin'); } };
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
    box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirm('Delete ' + b.dataset.del + '? All its emails will be removed.')) return;
      await post('/api/panel/email/delete', { domain: a.domain, email: b.dataset.del }); toast('Deleted'); emailView(box); });
  }

  // ---------- start ----------
  function message(title, text, btn) {
    root.innerHTML = `<div class="nx" data-theme="${theme}" style="display:grid;place-items:center;padding:20px"><div class="nx-card" style="max-width:460px;padding:34px;text-align:center">
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
    go(['deploy', 'db', 'email'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
  }
  start();
})();
