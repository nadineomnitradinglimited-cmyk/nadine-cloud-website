/* ---------- Launch offer: price + countdown banner ----------
   Until OFFER_END the Launch bundle (free .com domain + 1 year hosting +
   website builder) costs OFFER_ZMW instead of NORMAL_ZMW:
     - every element marked data-launch-price shows the offer price with the
       normal price crossed out,
     - every Launch checkout link (type=bundle) carries the offer amount,
     - a slim bar at the top of every page counts down to OFFER_END.
   After OFFER_END nothing is changed: the pages show NORMAL_ZMW again and the
   bar is gone. The server (pricing.js launchPrice) uses the same end date --
   keep both in sync. The end date is real; never restart the countdown. */
(function(){
  const NORMAL_ZMW = 850;
  const OFFER_ZMW = 659;
  const OFFER_END = new Date('2026-10-26T23:59:59+02:00'); // 30 days from 26 Sep 2026, Lusaka time
  const HIDE_KEY = 'nc_launch_banner_hidden';

  function offerLive(){ return Date.now() < OFFER_END.getTime(); }
  window.ncLaunchPrice = function(){ return offerLive() ? OFFER_ZMW : NORMAL_ZMW; };
  if (!offerLive()) return;

  function checkoutLink(){
    return '/checkout?type=bundle&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Launch&amount=' + OFFER_ZMW + '&period=yr';
  }

  // 1. Prices and links on the page.
  document.querySelectorAll('[data-launch-price]').forEach(function(el){
    if (el.dataset.launchDone) return;
    el.dataset.launchDone = '1';
    el.setAttribute('data-zmw', OFFER_ZMW);
    const was = document.createElement('s');
    was.className = 'was-price amt-live';
    was.setAttribute('data-zmw', NORMAL_ZMW);
    was.textContent = 'ZMW ' + NORMAL_ZMW;
    el.parentNode.insertBefore(was, el);
    el.parentNode.insertBefore(document.createTextNode(' '), el);
  });
  document.querySelectorAll('a[href*="type=bundle"]').forEach(function(a){
    a.setAttribute('href', a.getAttribute('href').replace(/amount=\d+/, 'amount=' + OFFER_ZMW));
  });

  // 2. The countdown bar (visitors can hide it for this browser session).
  let hidden = false;
  try { hidden = sessionStorage.getItem(HIDE_KEY) === '1'; } catch (e) {}
  if (!hidden && !document.getElementById('ncPromoBar')) {
    const bar = document.createElement('div');
    bar.id = 'ncPromoBar';
    bar.className = 'promo-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Launch offer');
    bar.innerHTML =
      '<div class="promo-bar-inner">' +
        '<span class="promo-bar-tag">Launch offer</span>' +
        '<span class="promo-bar-text"><b>Free .com domain + 1 year hosting + website builder</b> for just ' +
          '<s class="amt-live" data-zmw="' + NORMAL_ZMW + '">ZMW ' + NORMAL_ZMW + '</s> ' +
          '<b class="amt-live" data-zmw="' + OFFER_ZMW + '">ZMW ' + OFFER_ZMW + '</b></span>' +
        '<span class="promo-bar-timer" aria-live="off">Ends in ' +
          '<span class="pt"><b data-u="d">0</b>d</span>' +
          '<span class="pt"><b data-u="h">00</b>h</span>' +
          '<span class="pt"><b data-u="m">00</b>m</span>' +
          '<span class="pt"><b data-u="s">00</b>s</span>' +
        '</span>' +
        '<a class="promo-bar-cta" href="' + checkoutLink() + '">Get the bundle</a>' +
      '</div>' +
      '<button type="button" class="promo-bar-close" aria-label="Hide offer">&times;</button>';
    document.body.insertBefore(bar, document.body.firstChild);

    const units = {};
    bar.querySelectorAll('[data-u]').forEach(function(el){ units[el.getAttribute('data-u')] = el; });
    const pad = function(n){ return n < 10 ? '0' + n : String(n); };
    let timer = null;
    const tick = function(){
      const left = OFFER_END.getTime() - Date.now();
      if (left <= 0) { clearInterval(timer); bar.remove(); return; }
      const s = Math.floor(left / 1000);
      units.d.textContent = Math.floor(s / 86400);
      units.h.textContent = pad(Math.floor(s % 86400 / 3600));
      units.m.textContent = pad(Math.floor(s % 3600 / 60));
      units.s.textContent = pad(s % 60);
    };
    tick();
    timer = setInterval(tick, 1000);

    bar.querySelector('.promo-bar-close').addEventListener('click', function(){
      clearInterval(timer);
      bar.remove();
      try { sessionStorage.setItem(HIDE_KEY, '1'); } catch (e) {}
    });
  }

  if (window.ncRefreshPrices) window.ncRefreshPrices();
})();
