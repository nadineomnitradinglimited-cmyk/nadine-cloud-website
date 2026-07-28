/* ---------- mobile nav ---------- */
(function(){
  const btn = document.querySelector('.menu-btn');
  const links = document.getElementById('navLinks');
  if (btn && links) btn.addEventListener('click', () => links.classList.toggle('open'));
})();

/* ---------- currency ---------- */
let currency = 'USD';
function detectCurrency(){
  try{
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();
    if (tz === 'Africa/Lusaka' || lang.endsWith('-zm')) return 'ZMW';
  }catch(e){}
  return 'USD';
}
function setCurrency(c){
  currency = c;
  const zmwBtn = document.getElementById('btnZMW');
  const usdBtn = document.getElementById('btnUSD');
  if (zmwBtn) zmwBtn.classList.toggle('active', c==='ZMW');
  if (usdBtn) usdBtn.classList.toggle('active', c==='USD');
  const label = document.getElementById('curLabel');
  if (label) label.textContent = c === 'ZMW' ? 'Zambian Kwacha (ZMW)' : 'US Dollars (USD)';
  document.querySelectorAll('[data-zmw]').forEach(el=>{
    el.textContent = c==='ZMW' ? el.dataset.zmw : el.dataset.usd;
  });
}
setCurrency(detectCurrency());

/* ---------- domain lookup (visual demo until WHMCS is connected) ---------- */
function lookupDomain(){
  const input = document.getElementById('domInput');
  const out = document.getElementById('domResult');
  if (!input || !out) return;
  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!raw){ out.textContent = 'Type a name to check .com, .co.zm, .org and more'; return; }
  out.innerHTML = 'Checking ' + raw + '…';
  setTimeout(()=>{
    const price = currency==='ZMW' ? 'K350/yr' : '$14/yr';
    out.innerHTML = '<span class="ok">●</span> ' + raw + '.com — contact us to register from ' + price +
      ' &nbsp;·&nbsp; <a href="contact.html" style="color:#E08A3C">Order now</a>';
  }, 600);
}

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
