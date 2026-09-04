/* ---------- mobile nav ---------- */
(function(){
  const btn = document.querySelector('.menu-btn');
  const links = document.getElementById('navLinks');
  if (btn && links) btn.addEventListener('click', () => links.classList.toggle('open'));
})();

/* ---------- domain name prompt (not a live availability check — message us to confirm) ---------- */
function lookupDomain(){
  const input = document.getElementById('domInput');
  const out = document.getElementById('domResult');
  if (!input || !out) return;
  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!raw){ out.textContent = 'Type a name to check .com, .co.zm, .org and more'; return; }
  const waText = encodeURIComponent('Hi Nadine Cloud, is ' + raw + '.com available to register?');
  out.innerHTML = 'We\'ll confirm if <strong>' + raw + '.com</strong> is available, from ZMW 450/yr' +
    ' &nbsp;·&nbsp; <a href="https://wa.me/260770346698?text=' + waText + '" target="_blank" rel="noopener" style="color:#E08A3C">Ask on WhatsApp</a>' +
    ' &nbsp;·&nbsp; <a href="contact.html" style="color:#E08A3C">Contact form</a>';
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
