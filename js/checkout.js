(function(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'Nadine Cloud order';
  const amount = parseFloat(params.get('amount'));
  const type = params.get('type') || '';
  const pkg = params.get('pkg') || '';
  const period = params.get('period') === 'mo' ? 'mo' : 'yr';

  document.getElementById('ckPlanTitle').textContent = plan;
  document.getElementById('ckSummaryPlan').textContent = plan;
  document.getElementById('ckAmountLabel').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString()) : 'now';
  document.getElementById('ckSummaryAmount').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString() + ' / ' + period) : 'Amount to be confirmed';
  const billingNote = document.getElementById('ckBillingNote');
  if (billingNote) {
    billingNote.textContent = (period === 'mo' ? 'Billed monthly. ' : 'Billed annually. ') + "Card payments aren't available yet — mobile money only for now.";
  }

  if (type === 'domain') {
    const field = document.getElementById('domainField');
    field.hidden = false;
    field.querySelector('input').required = true;
    document.getElementById('ckPlanSub').textContent = "Tell us the domain you want — we'll confirm the exact price if it differs.";
  } else if (type === 'hosting') {
    const field = document.getElementById('domainField');
    field.hidden = false;
    field.firstChild.textContent = 'Domain for this hosting account';
    field.querySelector('input').required = true;
    field.querySelector('input').placeholder = 'yourbusiness.com (no www)';
    document.getElementById('ckPlanSub').textContent = "Tell us the domain to set up — your hosting account is created automatically as soon as payment clears.";
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
          setStatus("Payment received! We'll set things up and confirm by email shortly.", 'ok');
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
