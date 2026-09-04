(function(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'Nadine Cloud order';
  const amount = parseFloat(params.get('amount'));
  const type = params.get('type') || '';
  const pkg = params.get('pkg') || '';
  const periodParam = params.get('period');
  const period = periodParam === 'mo' ? 'mo' : periodParam === '2yr' ? '2yr' : 'yr';
  const PERIOD_LABEL = { mo: '/month', yr: '/year', '2yr': '/2 years' };
  const PERIOD_BILLED = { mo: 'Billed monthly. ', yr: 'Billed annually. ', '2yr': 'Billed once, every 2 years. ' };

  document.getElementById('ckPlanTitle').textContent = plan;
  document.getElementById('ckSummaryPlan').textContent = plan;
  document.getElementById('ckAmountLabel').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString()) : 'now';
  document.getElementById('ckSummaryAmount').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString() + ' ' + PERIOD_LABEL[period]) : 'Amount to be confirmed';
  const billingNote = document.getElementById('ckBillingNote');
  if (billingNote) {
    billingNote.textContent = PERIOD_BILLED[period] + "Card payments aren't available yet — mobile money only for now.";
  }

  const domainField = document.getElementById('domainField');
  const domainConfirmField = document.getElementById('domainConfirmField');
  const domainMismatchEl = document.getElementById('domainMismatch');
  const domainChoice = document.getElementById('domainChoice');
  const domainNewNote = document.getElementById('domainNewNote');

  function applyDomainOptionCopy(){
    if (type !== 'hosting') return;
    const opt = (document.querySelector('input[name="domainOption"]:checked') || {}).value || 'existing';
    if (opt === 'new') {
      domainField.firstChild.textContent = 'Domain you’d like to register';
      domainField.querySelector('input').placeholder = 'yourbusiness.com';
      domainNewNote.hidden = false;
    } else {
      domainField.firstChild.textContent = 'Domain for this hosting account';
      domainField.querySelector('input').placeholder = 'yourbusiness.com (no www)';
      domainNewNote.hidden = true;
    }
  }

  if (type === 'domain') {
    domainField.hidden = false;
    domainField.querySelector('input').required = true;
    domainConfirmField.hidden = false;
    domainConfirmField.querySelector('input').required = true;
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
      domain: fd.get('domain') || '',
      domainOption: type === 'hosting' ? (fd.get('domainOption') || 'existing') : '',
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      operator: fd.get('operator'),
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
