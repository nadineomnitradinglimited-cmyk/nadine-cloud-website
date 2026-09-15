(function(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'Nadine Cloud order';
  const amount = parseFloat(params.get('amount'));
  const type = params.get('type') || '';
  const pkg = params.get('pkg') || '';
  const draftId = params.get('draftId') || '';
  const PERIOD_LABEL = { mo: '/month', '6mo': '/6 months', yr: '/year', '2yr': '/2 years', '3yr': '/3 years' };
  const PERIOD_BILLED = {
    mo: 'Billed monthly. ',
    '6mo': 'Billed every 6 months. ',
    yr: 'Billed annually. ',
    '2yr': 'Billed once, every 2 years. ',
    '3yr': 'Billed once, every 3 years. ',
  };
  const periodParam = params.get('period');
  const period = PERIOD_LABEL[periodParam] ? periodParam : 'yr';

  document.getElementById('ckPlanTitle').textContent = plan;
  document.getElementById('ckSummaryPlan').textContent = plan;
  document.getElementById('ckAmountLabel').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString()) : 'now';
  const billingNote = document.getElementById('ckBillingNote');
  if (billingNote) {
    billingNote.textContent = PERIOD_BILLED[period] + "Card payments aren't available yet — mobile money only for now.";
  }

  // Promo codes: the amount actually charged is always re-derived
  // server-side (see /api/checkout/validate-promo and /api/checkout
  // itself) -- this just mirrors that result so the customer sees the
  // real total before paying.
  let appliedPromo = null; // { code, discountAmount, finalAmount }

  function currentTotal(){
    return appliedPromo ? appliedPromo.finalAmount : amount;
  }

  function renderSummaryAmount(){
    if (!Number.isFinite(amount)) {
      document.getElementById('ckSummaryAmount').textContent = 'Amount to be confirmed';
      return;
    }
    const total = currentTotal();
    document.getElementById('ckAmountLabel').textContent = 'ZMW ' + total.toLocaleString();
    if (appliedPromo) {
      document.getElementById('ckSummaryAmount').innerHTML =
        '<span style="text-decoration:line-through;color:var(--text-mute);font-size:16px">ZMW ' + amount.toLocaleString() + '</span> ' +
        'ZMW ' + total.toLocaleString() + ' ' + PERIOD_LABEL[period] +
        ' <span style="color:var(--ok);font-size:13px;font-weight:600">(' + appliedPromo.code + ' applied)</span>';
    } else {
      document.getElementById('ckSummaryAmount').textContent = 'ZMW ' + amount.toLocaleString() + ' ' + PERIOD_LABEL[period];
    }
  }
  renderSummaryAmount();

  const promoInput = document.getElementById('promoCode');
  const promoApplyBtn = document.getElementById('promoApply');
  const promoStatus = document.getElementById('promoStatus');
  if (promoInput && promoApplyBtn) {
    promoApplyBtn.addEventListener('click', function(){
      const code = (promoInput.value || '').trim();
      promoStatus.className = 'form-status';
      if (!code) { promoStatus.textContent = ''; return; }
      promoApplyBtn.disabled = true;
      promoStatus.textContent = 'Checking…';
      fetch('/api/checkout/validate-promo?code=' + encodeURIComponent(code) + '&amount=' + encodeURIComponent(amount))
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          promoApplyBtn.disabled = false;
          if (!ok) {
            appliedPromo = null;
            promoStatus.textContent = data.error || 'That code didn’t work.';
            promoStatus.classList.add('err');
            renderSummaryAmount();
            return;
          }
          appliedPromo = data;
          promoStatus.textContent = 'Applied — you saved ZMW ' + data.discountAmount.toLocaleString() + '.';
          promoStatus.classList.add('ok');
          renderSummaryAmount();
        })
        .catch(() => {
          promoApplyBtn.disabled = false;
          promoStatus.textContent = 'Could not check that code — please try again.';
          promoStatus.classList.add('err');
        });
    });
  }

  const domainField = document.getElementById('domainField');
  const domainConfirmField = document.getElementById('domainConfirmField');
  const domainMismatchEl = document.getElementById('domainMismatch');
  const domainChoice = document.getElementById('domainChoice');
  const domainNewNote = document.getElementById('domainNewNote');
  const registrantFields = document.getElementById('registrantFields');

  function setRegistrantRequired(required){
    registrantFields.hidden = !required;
    registrantFields.querySelectorAll('input').forEach((el) => { el.required = required; });
  }

  // Any hosting plan includes a free .com domain when billed annually or
  // longer. Monthly signups -- including Avara's ZMW 50 first-month intro
  // rate, which is only ever period=mo -- still pay for the domain
  // separately.
  const freeDomainEligible = type === 'hosting' && (period === 'yr' || period === '2yr' || period === '3yr');

  function applyDomainOptionCopy(){
    if (type !== 'hosting') return;
    const opt = (document.querySelector('input[name="domainOption"]:checked') || {}).value || 'existing';
    if (opt === 'new') {
      domainField.firstChild.textContent = 'Domain you’d like to register';
      domainField.querySelector('input').placeholder = 'yourbusiness.com';
      domainNewNote.hidden = false;
      domainNewNote.textContent = freeDomainEligible
        ? "Your first year of a .com domain is included free with Zyra. Choosing a different extension may cost extra — we'll confirm before registering."
        : "This payment covers hosting only. We'll check availability and message you to confirm the exact domain price before registering it.";
      setRegistrantRequired(true);
    } else {
      domainField.firstChild.textContent = 'Domain for this hosting account';
      domainField.querySelector('input').placeholder = 'yourbusiness.com (no www)';
      domainNewNote.hidden = true;
      setRegistrantRequired(false);
    }
  }

  if (type === 'domain') {
    domainField.hidden = false;
    domainField.querySelector('input').required = true;
    domainConfirmField.hidden = false;
    domainConfirmField.querySelector('input').required = true;
    setRegistrantRequired(true);
    document.getElementById('ckPlanSub').textContent = "Tell us the domain you want — we'll confirm the exact price if it differs.";
  } else if (type === 'hosting') {
    domainChoice.hidden = false;
    domainChoice.addEventListener('change', applyDomainOptionCopy);
    domainField.hidden = false;
    domainField.querySelector('input').required = true;
    domainConfirmField.hidden = false;
    domainConfirmField.querySelector('input').required = true;
    applyDomainOptionCopy();
    document.getElementById('ckPlanSub').textContent = "Tell us the domain to use — double-check the spelling, this is exactly what we'll set up.";
  } else if (type === 'bundle') {
    domainField.hidden = false;
    domainField.querySelector('input').required = true;
    domainConfirmField.hidden = false;
    domainConfirmField.querySelector('input').required = true;
    setRegistrantRequired(true);
    document.getElementById('ckPlanSub').textContent = "Tell us the domain you want — it's registered free as part of this bundle, then your hosting and website builder are set up on it.";
  } else if (type === 'wordpress' || type === 'builder' || type === 'ssl') {
    domainField.hidden = false;
    domainField.querySelector('input').required = true;
    domainConfirmField.hidden = false;
    domainConfirmField.querySelector('input').required = true;
    domainField.firstChild.textContent = type === 'ssl' ? 'Domain this certificate is for' : 'Domain for this account';
    domainField.querySelector('input').placeholder = 'yourbusiness.com (no www)';
    document.getElementById('ckPlanSub').textContent = "Tell us the domain to use — double-check the spelling, this is exactly what we'll set up.";
  }

  function domainsMatch(){
    const a = (domainField.querySelector('input').value || '').trim().toLowerCase();
    const b = (domainConfirmField.querySelector('input').value || '').trim().toLowerCase();
    return !domainConfirmField.hidden ? a && a === b : true;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    document.getElementById('ckSubmit').disabled = true;
    document.getElementById('ckStatus').textContent = 'Missing order details — please go back and pick a plan again.';
    document.getElementById('ckStatus').classList.add('err');
    return;
  }

  const statusEl = document.getElementById('ckStatus');
  const submitBtn = document.getElementById('ckSubmit');
  let polling = null;

  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
  }

  function stopPolling(){
    if (polling) { clearInterval(polling); polling = null; }
  }

  function pollStatus(reference, attemptsLeft){
    if (attemptsLeft <= 0) {
      stopPolling();
      setStatus("Still waiting on confirmation — if you approved it on your phone, we'll follow up by email once it clears.", '');
      submitBtn.disabled = false;
      return;
    }
    fetch('/api/checkout/status/' + encodeURIComponent(reference))
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'successful') {
          stopPolling();
          statusEl.className = 'form-status ok';
          statusEl.innerHTML = "Payment received! We'll set things up and confirm by email shortly. " +
            '<a href="/api/checkout/receipt/' + encodeURIComponent(reference) + '" style="color:var(--copper);font-weight:600">Download your receipt (PDF)</a>';
        } else if (data.status === 'failed') {
          stopPolling();
          const reason = data.reason ? ' (' + data.reason + ')' : '';
          setStatus('The payment failed or was declined' + reason + '. You can try again below.', 'err');
          submitBtn.disabled = false;
        } else if (data.status === 'pay-offline') {
          setStatus('Check your phone and approve the payment prompt to continue…', '');
        }
      })
      .catch(() => {});
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();

    if (!domainsMatch()) {
      domainMismatchEl.hidden = false;
      domainConfirmField.querySelector('input').focus();
      return;
    }
    domainMismatchEl.hidden = true;

    stopPolling();
    setStatus('Starting payment…', '');
    submitBtn.disabled = true;

    const fd = new FormData(form);
    const body = {
      plan,
      amount,
      type,
      pkg,
      period,
      draftId,
      promoCode: appliedPromo ? appliedPromo.code : '',
      domain: fd.get('domain') || '',
      domainOption: type === 'hosting' ? (fd.get('domainOption') || 'existing') : '',
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      operator: fd.get('operator'),
      address1: fd.get('address1') || '',
      city: fd.get('city') || '',
      stateProvince: fd.get('stateProvince') || '',
      postalCode: fd.get('postalCode') || '',
      country: fd.get('country') || '',
    };

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus(data.error || 'Something went wrong starting the payment.', 'err');
          submitBtn.disabled = false;
          return;
        }
        setStatus('Check your phone for a payment prompt and approve it…', '');
        let attempts = 0;
        polling = setInterval(() => {
          attempts++;
          pollStatus(data.reference, 40 - attempts);
        }, 3000);
      })
      .catch(() => {
        setStatus('Something went wrong — please try again or use WhatsApp.', 'err');
        submitBtn.disabled = false;
      });
  });
})();
