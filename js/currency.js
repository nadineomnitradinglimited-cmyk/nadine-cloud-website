/* ---------- live local-currency pricing ----------
   Prices in the HTML are the source of truth, in ZMW (data-zmw="NNN").
   On load we detect the visitor's country, map it to their currency,
   fetch a live ZMW exchange rate, and swap the displayed price into
   their local currency — keeping the original ZMW amount as a small
   reference note. If geo lookup, the rate API, or an unsupported
   currency fails at any point, we simply leave the static ZMW price
   already in the markup. */
(function(){
  const CACHE_KEY = 'nc_currency_v1';
  const CACHE_MS = 12 * 60 * 60 * 1000;

  // ISO 3166-1 alpha-2 country -> ISO 4217 currency code.
  const COUNTRY_CURRENCY = {
    ZM:'ZMW',US:'USD',GB:'GBP',IE:'EUR',CA:'CAD',AU:'AUD',NZ:'NZD',
    ZA:'ZAR',ZW:'ZWL',BW:'BWP',NA:'NAD',MW:'MWK',MZ:'MZN',TZ:'TZS',
    KE:'KES',UG:'UGX',RW:'RWF',BI:'BIF',ET:'ETB',SS:'SSP',SD:'SDG',
    SO:'SOS',ER:'ERN',DJ:'DJF',NG:'NGN',GH:'GHS',SL:'SLL',LR:'LRD',
    GM:'GMD',GN:'GNF',SN:'XOF',ML:'XOF',BF:'XOF',NE:'XOF',CI:'XOF',
    TG:'XOF',BJ:'XOF',GW:'XOF',CM:'XAF',CF:'XAF',TD:'XAF',CG:'XAF',
    GA:'XAF',GQ:'XAF',CD:'CDF',AO:'AOA',ST:'STN',CV:'CVE',MR:'MRU',
    EG:'EGP',LY:'LYD',TN:'TND',DZ:'DZD',MA:'MAD',
    EU:'EUR',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',PT:'EUR',NL:'EUR',
    BE:'EUR',AT:'EUR',FI:'EUR',GR:'EUR',LU:'EUR',MT:'EUR',CY:'EUR',
    SK:'EUR',SI:'EUR',EE:'EUR',LV:'EUR',LT:'EUR',HR:'EUR',
    CH:'CHF',NO:'NOK',SE:'SEK',DK:'DKK',IS:'ISK',PL:'PLN',CZ:'CZK',
    HU:'HUF',RO:'RON',BG:'BGN',RS:'RSD',BA:'BAM',MK:'MKD',AL:'ALL',
    ME:'EUR',MD:'MDL',UA:'UAH',BY:'BYN',RU:'RUB',TR:'TRY',
    CN:'CNY',HK:'HKD',MO:'MOP',TW:'TWD',JP:'JPY',KR:'KRW',KP:'KPW',
    IN:'INR',PK:'PKR',BD:'BDT',LK:'LKR',NP:'NPR',BT:'BTN',MV:'MVR',
    AF:'AFN',IR:'IRR',IQ:'IQD',SY:'SYP',LB:'LBP',JO:'JOD',IL:'ILS',
    PS:'ILS',SA:'SAR',YE:'YER',OM:'OMR',AE:'AED',QA:'QAR',BH:'BHD',
    KW:'KWD',GE:'GEL',AM:'AMD',AZ:'AZN',KZ:'KZT',UZ:'UZS',TM:'TMT',
    TJ:'TJS',KG:'KGS',MN:'MNT',
    TH:'THB',VN:'VND',LA:'LAK',KH:'KHR',MM:'MMK',MY:'MYR',SG:'SGD',
    ID:'IDR',PH:'PHP',BN:'BND',TL:'USD',
    FJ:'FJD',PG:'PGK',SB:'SBD',VU:'VUV',WS:'WST',TO:'TOP',
    KI:'AUD',TV:'AUD',NR:'AUD',FM:'USD',MH:'USD',PW:'USD',
    MX:'MXN',GT:'GTQ',BZ:'BZD',HN:'HNL',SV:'USD',NI:'NIO',CR:'CRC',
    PA:'USD',CU:'CUP',DO:'DOP',HT:'HTG',JM:'JMD',TT:'TTD',BB:'BBD',
    BS:'BSD',BM:'BMD',
    CO:'COP',VE:'VES',GY:'GYD',SR:'SRD',EC:'USD',PE:'PEN',BR:'BRL',
    BO:'BOB',PY:'PYG',UY:'UYU',AR:'ARS',CL:'CLP'
  };

  function readCache(){
    try{
      const raw = localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data || (Date.now() - data.ts) > CACHE_MS) return null;
      return data;
    }catch(e){ return null; }
  }

  function writeCache(data){
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify(Object.assign({ ts: Date.now() }, data))); }
    catch(e){ /* localStorage unavailable — skip caching */ }
  }

  function applyRate(currency, rate){
    document.querySelectorAll('[data-zmw]').forEach(function(el){
      const zmw = parseFloat(el.getAttribute('data-zmw'));
      if(!isFinite(zmw)) return;
      const scope = el.closest('.price, .offer-price');
      const note = scope && scope.querySelector('.price-note');

      if(!currency || currency === 'ZMW' || !rate){
        el.textContent = 'ZMW ' + zmw.toLocaleString();
        if(note) note.hidden = true;
        return;
      }

      let formatted;
      try{
        const converted = zmw * rate;
        formatted = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currency,
          maximumFractionDigits: converted >= 100 ? 0 : 2
        }).format(converted);
      }catch(e){
        el.textContent = 'ZMW ' + zmw.toLocaleString();
        if(note) note.hidden = true;
        return;
      }

      el.textContent = formatted;
      if(note){
        note.hidden = false;
        note.textContent = '≈ ZMW ' + zmw.toLocaleString();
      }
    });
  }

  const hit = readCache();
  if(hit){
    applyRate(hit.currency, hit.rate);
    return;
  }

  fetch('https://ipwho.is/')
    .then(function(r){ return r.json(); })
    .then(function(geo){
      if(!geo || !geo.success || !geo.country_code) throw new Error('no country from geo lookup');
      const currency = COUNTRY_CURRENCY[geo.country_code];
      if(!currency) throw new Error('no currency mapping for ' + geo.country_code);

      if(currency === 'ZMW'){
        writeCache({ currency: 'ZMW', rate: 1 });
        applyRate('ZMW', 1);
        return;
      }

      return fetch('https://open.er-api.com/v6/latest/ZMW')
        .then(function(r){ return r.json(); })
        .then(function(fx){
          if(!fx || fx.result !== 'success' || !fx.rates || !fx.rates[currency]){
            throw new Error('no live rate for ' + currency);
          }
          writeCache({ currency: currency, rate: fx.rates[currency] });
          applyRate(currency, fx.rates[currency]);
        });
    })
    .catch(function(){
      /* geo/rate lookup failed, or currency unsupported — static ZMW prices already in the page stand as-is */
    });
})();
