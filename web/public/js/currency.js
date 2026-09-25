/* ---------- display currency ----------
   Prices in the HTML are the source of truth, in ZMW (data-zmw="NNN"), and
   checkout always charges that ZMW amount. For display we show every price in
   USD by default, converted at the day's rate. The visitor can pick another
   currency with the small picker in the header (#curPicker); that choice is
   remembered. Nothing changes automatically by location.
   If the live rate can't be fetched we use a built-in fallback rate, so
   prices are never left blank. */
(function(){
  const CHOICE_KEY = 'nc_currency_choice';
  const RATES_KEY = 'nc_rates_v2';
  const RATES_MS = 12 * 60 * 60 * 1000;
  const DEFAULT_CURRENCY = 'USD';
  // Used until the live rates arrive (and if they never do). 1 ZMW in each currency.
  const FALLBACK_RATES = { ZMW: 1, USD: 1 / 19.66 };

  const CHOICES = [
    { code: 'USD', label: 'United States (USD)' },
    { code: 'ZMW', label: 'Zambia (ZMW)' },
    { code: 'EUR', label: 'Europe (EUR)' },
    { code: 'GBP', label: 'United Kingdom (GBP)' },
    { code: 'ZAR', label: 'South Africa (ZAR)' },
    { code: 'BWP', label: 'Botswana (BWP)' },
    { code: 'NAD', label: 'Namibia (NAD)' },
    { code: 'MWK', label: 'Malawi (MWK)' },
    { code: 'TZS', label: 'Tanzania (TZS)' },
    { code: 'KES', label: 'Kenya (KES)' },
    { code: 'UGX', label: 'Uganda (UGX)' },
    { code: 'NGN', label: 'Nigeria (NGN)' },
    { code: 'GHS', label: 'Ghana (GHS)' },
    { code: 'AED', label: 'UAE (AED)' },
    { code: 'CAD', label: 'Canada (CAD)' },
    { code: 'AUD', label: 'Australia (AUD)' },
    { code: 'INR', label: 'India (INR)' },
    { code: 'CNY', label: 'China (CNY)' }
  ];

  let rates = FALLBACK_RATES;
  let currency = DEFAULT_CURRENCY;

  function store(key, value){ try{ localStorage.setItem(key, value); }catch(e){} }
  function load(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }

  const saved = load(CHOICE_KEY);
  if (saved && CHOICES.some(function(c){ return c.code === saved; })) currency = saved;

  try{
    const cached = JSON.parse(load(RATES_KEY) || 'null');
    if (cached && cached.rates && (Date.now() - cached.ts) < RATES_MS) rates = cached.rates;
  }catch(e){}

  function zmwText(zmw){ return 'ZMW ' + Number(zmw).toLocaleString(); }

  // Format a ZMW amount in the chosen display currency.
  function format(zmw){
    zmw = Number(zmw);
    if (!isFinite(zmw)) return '';
    const rate = rates[currency];
    if (currency === 'ZMW' || !rate) return zmwText(zmw);
    const converted = zmw * rate;
    try{
      const whole = converted >= 100;
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2
      }).format(converted);
    }catch(e){
      return zmwText(zmw);
    }
  }

  // "$5.04 (ZMW 99)" -- for places where the kwacha charge matters, like checkout.
  function formatBoth(zmw){
    const shown = format(zmw);
    return (currency === 'ZMW' || shown === zmwText(zmw)) ? shown : shown + ' (' + zmwText(zmw) + ')';
  }

  function applyAll(){
    document.querySelectorAll('[data-zmw]').forEach(function(el){
      const zmw = parseFloat(el.getAttribute('data-zmw'));
      if (!isFinite(zmw)) return;
      el.textContent = format(zmw);
      const scope = el.closest('.price, .offer-price');
      const note = scope && scope.querySelector('.price-note');
      if (note) {
        const showNote = currency !== 'ZMW' && el.textContent !== zmwText(zmw);
        note.hidden = !showNote;
        if (showNote) note.textContent = '≈ ' + zmwText(zmw);
      }
    });
    const btnLabel = document.querySelector('#curPicker .cur-code');
    if (btnLabel) btnLabel.textContent = currency;
    document.querySelectorAll('#curPicker [data-cur]').forEach(function(opt){
      opt.setAttribute('aria-selected', opt.getAttribute('data-cur') === currency ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('nc:currency', { detail: { currency: currency } }));
  }

  window.ncRefreshPrices = applyAll;
  window.ncFormatZmw = format;
  window.ncFormatBoth = formatBoth;
  window.ncCurrency = function(){ return currency; };

  function setCurrency(code){
    currency = code;
    store(CHOICE_KEY, code);
    applyAll();
  }

  function buildPicker(){
    const host = document.getElementById('curPicker');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    host.innerHTML =
      '<button type="button" class="cur-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Change currency">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/>' +
        '</svg>' +
        '<span class="cur-code">' + currency + '</span>' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="cur-menu" role="listbox" hidden>' +
        '<div class="cur-menu-title">Show prices in</div>' +
        CHOICES.map(function(c){
          return '<button type="button" role="option" data-cur="' + c.code + '">' + c.label + '</button>';
        }).join('') +
        '<div class="cur-menu-note">Payments are charged in ZMW at the day\'s rate.</div>' +
      '</div>';

    const btn = host.querySelector('.cur-btn');
    const menu = host.querySelector('.cur-menu');
    function close(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function(e){
      const opt = e.target.closest('[data-cur]');
      if (!opt) return;
      setCurrency(opt.getAttribute('data-cur'));
      close();
    });
    document.addEventListener('click', function(e){ if (!host.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  }

  buildPicker();
  applyAll();

  const cachedFresh = rates !== FALLBACK_RATES;
  if (!cachedFresh) {
    fetch('https://open.er-api.com/v6/latest/ZMW')
      .then(function(r){ return r.json(); })
      .then(function(fx){
        if (!fx || fx.result !== 'success' || !fx.rates || !fx.rates.USD) throw new Error('no live rates');
        const keep = { ZMW: 1 };
        CHOICES.forEach(function(c){ if (fx.rates[c.code]) keep[c.code] = fx.rates[c.code]; });
        rates = keep;
        store(RATES_KEY, JSON.stringify({ ts: Date.now(), rates: keep }));
        applyAll();
      })
      .catch(function(){ /* keep the fallback rate */ });
  }
})();
