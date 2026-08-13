/* ---------- mobile nav ---------- */
(function(){
  const btn = document.querySelector('.menu-btn');
  const links = document.getElementById('navLinks');
  if (btn && links) btn.addEventListener('click', () => links.classList.toggle('open'));
})();

/* ---------- domain lookup (visual demo until WHMCS is connected) ---------- */
function lookupDomain(){
  const input = document.getElementById('domInput');
  const out = document.getElementById('domResult');
  if (!input || !out) return;
  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!raw){ out.textContent = 'Type a name to check .com, .co.zm, .org and more'; return; }
  out.innerHTML = 'Checking ' + raw + '…';
  setTimeout(()=>{
    out.innerHTML = '<span class="ok">●</span> ' + raw + '.com — contact us to register from ZMW 450/yr' +
      ' &nbsp;·&nbsp; <a href="contact.html" style="color:#E08A3C">Order now</a>';
  }, 600);
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

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          form.reset();
          status.textContent = "Thanks — we've got your message and will reply the same day.";
          status.classList.add('ok');
        } else {
          status.textContent = 'Something went wrong sending that. Please try WhatsApp or email instead.';
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

/* ---------- count-up stats ---------- */
(function(){
  const nums = document.querySelectorAll('.stat .num[data-count]');
  if (!nums.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate(el){
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    if (reduced || !('IntersectionObserver' in window)) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (!('IntersectionObserver' in window)) {
    nums.forEach(animate);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        io.unobserve(entry.target);
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
