(function(){
  const MULTIPLIER = { mo: 1, yr: 10, '2yr': 20 };
  const PER_LABEL = { mo: '/month', yr: '/year', '2yr': '/2 years' };

  document.querySelectorAll('.pricing').forEach(function(section){
    const toggle = section.querySelector('.billing-toggle');
    if (!toggle) return;

    const hostingPlans = Array.from(section.querySelectorAll('.plan')).filter(function(plan){
      const cta = plan.querySelector('.cta');
      return cta && /type=hosting/.test(cta.getAttribute('href') || '');
    });
    if (!hostingPlans.length) return;

    hostingPlans.forEach(function(plan){
      const amtEl = plan.querySelector('.amt[data-zmw]');
      if (!amtEl) return;
      const mo = parseFloat(amtEl.getAttribute('data-zmw'));
      if (!isFinite(mo)) return;
      plan.setAttribute('data-amt-mo', mo);
      plan.setAttribute('data-amt-yr', Math.round(mo * MULTIPLIER.yr));
      plan.setAttribute('data-amt-2yr', Math.round(mo * MULTIPLIER['2yr']));
    });

    function setPeriod(period){
      toggle.querySelectorAll('.billing-opt').forEach(function(btn){
        btn.classList.toggle('active', btn.dataset.period === period);
      });
      hostingPlans.forEach(function(plan){
        const amtEl = plan.querySelector('.amt[data-zmw]');
        const perEl = plan.querySelector('.per');
        const cta = plan.querySelector('.cta');
        if (!amtEl || !cta) return;
        const amount = plan.getAttribute(period === 'yr' ? 'data-amt-yr' : period === '2yr' ? 'data-amt-2yr' : 'data-amt-mo');
        amtEl.setAttribute('data-zmw', amount);
        amtEl.textContent = 'ZMW ' + Number(amount).toLocaleString();
        if (perEl) perEl.textContent = PER_LABEL[period] || '/month';
        const url = new URL(cta.getAttribute('href'), window.location.href);
        url.searchParams.set('amount', amount);
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
