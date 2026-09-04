(function(){
  // Central billing config — edit discounts/labels here only.
  const BILLING_PERIODS = {
    mo:    { months: 1,  discount: 0,    per: '/month',    name: 'Monthly' },
    '6mo': { months: 6,  discount: 0.10, per: '/6 months', name: '6 Months' },
    yr:    { months: 12, discount: 0.15, per: '/year',     name: '1 Year' },
    '2yr': { months: 24, discount: 0.20, per: '/2 years',  name: '2 Years' },
    '3yr': { months: 36, discount: 0.25, per: '/3 years',  name: '3 Years' },
  };
  const PERIOD_ORDER = ['mo', '6mo', 'yr', '2yr', '3yr'];

  document.querySelectorAll('.pricing').forEach(function(section, sectionIdx){
    const toggle = section.querySelector('.billing-toggle');
    if (!toggle) return;

    const hostingPlans = Array.from(section.querySelectorAll('.plan')).filter(function(plan){
      const cta = plan.querySelector('.cta');
      return cta && /type=hosting/.test(cta.getAttribute('href') || '');
    });
    if (!hostingPlans.length) return;

    function priceFor(baseMo, periodKey) {
      const cfg = BILLING_PERIODS[periodKey];
      const total = Math.round(baseMo * cfg.months * (1 - cfg.discount));
      const perMonth = Math.round(total / cfg.months);
      return { total: total, perMonth: perMonth };
    }

    hostingPlans.forEach(function(plan, planIdx){
      const amtEl = plan.querySelector('.price .amt[data-zmw]');
      if (!amtEl) return;
      plan._baseMo = parseFloat(amtEl.getAttribute('data-zmw'));

      const obEl = plan.querySelector('.other-billing');
      if (!obEl || !isFinite(plan._baseMo)) return;
      const radioName = 'ob-' + sectionIdx + '-' + planIdx;
      let html = '<div class="other-billing-label">Other billing options</div>';
      PERIOD_ORDER.forEach(function(key){
        const cfg = BILLING_PERIODS[key];
        const { total } = priceFor(plan._baseMo, key);
        html += '<label class="ob-option">' +
          '<input type="radio" name="' + radioName + '" value="' + key + '"' + (key === 'mo' ? ' checked' : '') + '>' +
          '<span class="ob-name">' + cfg.name + '</span>' +
          '<span class="ob-price-wrap">' +
            '<span class="ob-price">ZMW ' + total.toLocaleString() + '</span>' +
            (cfg.discount > 0 ? '<span class="ob-save">Save ' + Math.round(cfg.discount * 100) + '%</span>' : '') +
          '</span>' +
          '</label>';
      });
      obEl.innerHTML = html;
      obEl.addEventListener('change', function(e){
        if (e.target && e.target.name === radioName) setPeriod(e.target.value);
      });
    });

    function setPeriod(period){
      const cfg = BILLING_PERIODS[period];
      if (!cfg) return;

      toggle.querySelectorAll('.billing-opt').forEach(function(btn){
        btn.classList.toggle('active', btn.dataset.period === period);
      });

      hostingPlans.forEach(function(plan){
        if (!isFinite(plan._baseMo)) return;
        const amtEl = plan.querySelector('.price .amt[data-zmw]');
        const perEl = plan.querySelector('.price .per');
        const equivEl = plan.querySelector('.price-equiv');
        const savingsEl = plan.querySelector('.price-savings');
        const cta = plan.querySelector('.cta');
        if (!amtEl || !cta) return;

        const { total, perMonth } = priceFor(plan._baseMo, period);

        amtEl.setAttribute('data-zmw', total);
        amtEl.textContent = 'ZMW ' + total.toLocaleString();
        if (perEl) perEl.textContent = cfg.per;

        if (equivEl) {
          if (period === 'mo') {
            equivEl.hidden = true;
          } else {
            equivEl.hidden = false;
            equivEl.textContent = 'Equivalent to ZMW ' + perMonth.toLocaleString() + '/month';
          }
        }

        if (savingsEl) {
          if (cfg.discount > 0) {
            savingsEl.hidden = false;
            savingsEl.textContent = 'Save ' + Math.round(cfg.discount * 100) + '%';
          } else {
            savingsEl.hidden = true;
          }
        }

        const obEl = plan.querySelector('.other-billing');
        if (obEl) {
          const radio = obEl.querySelector('input[value="' + period + '"]');
          if (radio) radio.checked = true;
        }

        const url = new URL(cta.getAttribute('href'), window.location.href);
        url.searchParams.set('amount', total);
        url.searchParams.set('period', period);
        cta.setAttribute('href', url.pathname + url.search);
      });

      if (window.ncRefreshPrices) window.ncRefreshPrices();
    }

    toggle.addEventListener('click', function(e){
      const btn = e.target.closest('.billing-opt');
      if (!btn) return;
      setPeriod(btn.dataset.period);
    });
  });
})();
