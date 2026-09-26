/* ---------- Launch bundle countdown banner ----------
   A slim bar at the very top of every page promoting the Launch bundle
   (free .com domain + 1 year hosting + website builder, ZMW 850), with a live
   countdown to OFFER_END. When the countdown reaches zero the banner removes
   itself for good -- the end date is real, it never restarts.
   To run a new offer: change the text, link and OFFER_END below. */
(function(){
  const OFFER_END = new Date('2026-10-26T23:59:59+02:00'); // 30 days from 26 Sep 2026, Lusaka time
  const PRICE_ZMW = 850;
  const LINK = '/checkout?type=bundle&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Launch&amount=850&period=yr';
  const HIDE_KEY = 'nc_launch_banner_hidden';

  if (Date.now() >= OFFER_END.getTime()) return;
  try { if (sessionStorage.getItem(HIDE_KEY) === '1') return; } catch (e) {}
  if (document.getElementById('ncPromoBar')) return;

  const bar = document.createElement('div');
  bar.id = 'ncPromoBar';
  bar.className = 'promo-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Launch offer');
  bar.innerHTML =
    '<div class="promo-bar-inner">' +
      '<span class="promo-bar-tag">Launch offer</span>' +
      '<span class="promo-bar-text"><b>Free .com domain + 1 year hosting + website builder</b> for just ' +
        '<b class="amt-live" data-zmw="' + PRICE_ZMW + '">ZMW ' + PRICE_ZMW + '</b></span>' +
      '<span class="promo-bar-timer" aria-live="off">Ends in ' +
        '<span class="pt"><b data-u="d">0</b>d</span>' +
        '<span class="pt"><b data-u="h">00</b>h</span>' +
        '<span class="pt"><b data-u="m">00</b>m</span>' +
        '<span class="pt"><b data-u="s">00</b>s</span>' +
      '</span>' +
      '<a class="promo-bar-cta" href="' + LINK + '">Get the bundle</a>' +
    '</div>' +
    '<button type="button" class="promo-bar-close" aria-label="Hide offer">&times;</button>';

  document.body.insertBefore(bar, document.body.firstChild);
  if (window.ncRefreshPrices) window.ncRefreshPrices();

  const units = {};
  bar.querySelectorAll('[data-u]').forEach(function(el){ units[el.getAttribute('data-u')] = el; });
  const pad = function(n){ return n < 10 ? '0' + n : String(n); };

  let timer = null;
  function tick(){
    const left = OFFER_END.getTime() - Date.now();
    if (left <= 0) { clearInterval(timer); bar.remove(); return; }
    const s = Math.floor(left / 1000);
    units.d.textContent = Math.floor(s / 86400);
    units.h.textContent = pad(Math.floor(s % 86400 / 3600));
    units.m.textContent = pad(Math.floor(s % 3600 / 60));
    units.s.textContent = pad(s % 60);
  }
  tick();
  timer = setInterval(tick, 1000);

  bar.querySelector('.promo-bar-close').addEventListener('click', function(){
    clearInterval(timer);
    bar.remove();
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch (e) {}
  });
})();
