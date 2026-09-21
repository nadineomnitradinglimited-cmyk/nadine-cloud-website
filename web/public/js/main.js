/* ---------- mobile nav ---------- */
(function(){
  const btn = document.querySelector('.menu-btn');
  const links = document.getElementById('navLinks');
  if (btn && links) btn.addEventListener('click', () => links.classList.toggle('open'));
})();

/* ---------- auto-expand a <details> FAQ item when linked to directly ---------- */
(function(){
  function openTargetDetails(){
    const el = document.getElementById(location.hash.slice(1));
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  openTargetDetails();
  window.addEventListener('hashchange', openTargetDetails);
})();

/* ---------- domain name search (live availability + real price check via Name.com) ---------- */
const DOMAIN_PRICE_ZMW = { com: 330, net: 315, org: 315 }; // fallback only, if the live price is missing
// Your profit per domain per year, in USD, added on top of Name.com's real price.
// 0 = show exactly what Name.com charges. Example: 3 shows $12.99 as $15.99.
const DOMAIN_MARKUP_USD = 0;
let domainLookupSeq = 0;

function usd(n){ return '$' + Number(n).toFixed(2); }

function lookupDomain(){
  const input = document.getElementById('domInput');
  const out = document.getElementById('domResult');
  if (!input || !out) return;
  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!raw){ out.textContent = 'Type a name to check .com, .org, .net and more'; return; }

  const seq = ++domainLookupSeq;
  out.textContent = 'Checking ' + raw + '.com, .net and .org…';

  fetch('/api/domain-check?name=' + encodeURIComponent(raw))
    .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (seq !== domainLookupSeq) return; // a newer lookup started; drop this stale result
      if (!ok || !data.results) throw new Error(data.error || 'check failed');

      const rows = data.results.map((r) => {
        const tld = r.domain.slice(r.domain.lastIndexOf('.') + 1);
        const price = DOMAIN_PRICE_ZMW[tld];
        if (r.available) {
          const waText = encodeURIComponent('Hi Nadine Cloud, I\'d like to register ' + r.domain);
          // Real price in USD straight from the registrar (+ your optional markup); ZMW table only as a fallback.
          let priceText = price ? ' — from ZMW ' + price + '/yr' : '';
          if (typeof r.price === 'number') {
            const first = r.price + DOMAIN_MARKUP_USD;
            priceText = ' — <strong>' + usd(first) + ' USD</strong>/yr';
            if (typeof r.renewalPrice === 'number' && r.renewalPrice + DOMAIN_MARKUP_USD > first + 0.005) {
              priceText += ' <span style="color:var(--text-mute)">(renews at ' + usd(r.renewalPrice + DOMAIN_MARKUP_USD) + '/yr)</span>';
            }
          }
          return '<span class="ok">✓</span> <strong>' + r.domain + '</strong> is available' + priceText +
            ' &nbsp;<a href="https://wa.me/260964068483?text=' + waText + '" target="_blank" rel="noopener" style="color:#7047FF">Register it</a>';
        }
        return '<span style="color:var(--text-mute)">✗ ' + r.domain + ' is already taken</span>';
      });
      out.innerHTML = rows.join('<br>');
    })
    .catch(() => {
      if (seq !== domainLookupSeq) return;
      const waText = encodeURIComponent('Hi Nadine Cloud, is ' + raw + '.com available to register?');
      out.innerHTML = 'We\'ll confirm if <strong>' + raw + '.com</strong> is available, from ' + usd(12.99 + DOMAIN_MARKUP_USD) + ' USD/yr' +
        ' &nbsp;·&nbsp; <a href="https://wa.me/260964068483?text=' + waText + '" target="_blank" rel="noopener" style="color:#7047FF">Ask on WhatsApp</a>' +
        ' &nbsp;·&nbsp; <a href="contact" style="color:#7047FF">Contact form</a>';
    });
}

/* ---------- contact form ---------- */
(function(){
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const fd = new FormData(form);
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        interest: fd.get('interest'),
        message: fd.get('message'),
        botcheck: fd.get('botcheck'),
      })
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          form.reset();
          status.textContent = "Thanks — we've got your message and will reply the same day.";
          status.classList.add('ok');
        } else {
          status.textContent = data.error || 'Something went wrong sending that. Please try WhatsApp or email instead.';
          status.classList.add('err');
        }
      })
      .catch(() => {
        status.textContent = 'Something went wrong sending that. Please try WhatsApp or email instead.';
        status.classList.add('err');
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Send message';
      });
  });
})();

/* ---------- scroll reveal ---------- */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.section, .stats-bar, .strip, .trust-strip, .cta-band');
  if (!targets.length) return;
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(el => io.observe(el));
})();

/* ---------- looping count-up stats ---------- */
(function(){
  const nums = document.querySelectorAll('.stat .num[data-count]');
  if (!nums.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function format(el, value){
    const decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    const suffix = el.getAttribute('data-suffix') || '';
    el.textContent = value.toFixed(decimals) + suffix;
  }

  if (reduced) {
    nums.forEach(el => format(el, parseFloat(el.getAttribute('data-count'))));
    return;
  }

  const COUNT_MS = 1400;
  const HOLD_MS = 1800;

  function loop(el){
    const target = parseFloat(el.getAttribute('data-count'));
    let cycleStart = null;

    function frame(now){
      if (el.dataset.paused === '1') { cycleStart = null; requestAnimationFrame(frame); return; }
      if (cycleStart === null) cycleStart = now;
      const elapsed = now - cycleStart;
      if (elapsed < COUNT_MS) {
        const eased = 1 - Math.pow(1 - elapsed / COUNT_MS, 3);
        format(el, target * eased);
      } else if (elapsed < COUNT_MS + HOLD_MS) {
        format(el, target);
      } else {
        cycleStart = now;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (!('IntersectionObserver' in window)) {
    nums.forEach(loop);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.dataset.paused = '0';
        if (el.dataset.started !== '1') {
          el.dataset.started = '1';
          loop(el);
        }
      } else {
        el.dataset.paused = '1';
      }
    });
  }, { threshold: 0.4 });
  nums.forEach(el => io.observe(el));
})();

/* ---------- typing placeholder animation ---------- */
(function(){
  const names = ['yourbusiness','myshop','ourchurch','lusakaclinic'];
  const input = document.getElementById('domInput');
  if (!input) return;
  let n=0,i=0,dir=1;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(()=>{
    if(document.activeElement===input) return;
    i+=dir;
    const word = names[n];
    if(i>=word.length+8){dir=-1;i=word.length}
    if(i<=0 && dir===-1){dir=1;n=(n+1)%names.length}
    input.placeholder = word.slice(0, Math.max(0,Math.min(i,word.length)));
  },110);
})();
