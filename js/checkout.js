(function(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'Nadine Cloud order';
  const amount = parseFloat(params.get('amount'));
  const type = params.get('type') || '';

  document.getElementById('ckPlanTitle').textContent = plan;
  document.getElementById('ckSummaryPlan').textContent = plan;
  document.getElementById('ckAmountLabel').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString()) : 'now';
  document.getElementById('ckSummaryAmount').textContent = Number.isFinite(amount) ? ('ZMW ' + amount.toLocaleString() + ' / yr') : 'Amount to be confirmed';

  if (type === 'domain') {
    const field = document.getElementById('domainField');
    field.hidden = false;
    field.querySelector('input').required = true;
    document.getElementById('ckPlanSub').textContent = "Tell us the domain you want — we'll confirm the exact price if it differs.";
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
  let orderInfo = null;
  let notifiedRef = null;

  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
  }

  function stopPolling(){
    if (polling) { clearInterval(polling); polling = null; }
  }

  // Sent from the browser (not the server) — Web3Forms' free plan blocks
  // server-side API calls, so this mirrors how the contact form already
  // sends mail successfully.
  function notifyByEmail(reference, outcome, reason){
    if (notifiedRef === reference + outcome) return;
    notifiedRef = reference + outcome;
    if (!orderInfo) return;
    const fd = new FormData();
    fd.append('access_key', 'fed74812-296d-4a5e-9f14-c3a5219c5657');
    fd.append('subject', 'Nadine Cloud checkout — payment ' + outcome + ' (' + reference + ')');
    fd.append('from_name', 'Nadine Cloud checkout');
    fd.append('message',
      'Plan: ' + orderInfo.plan +
      '\nAmount: ZMW ' + orderInfo.amount +
      '\nCustomer: ' + orderInfo.name + ' <' + orderInfo.email + '>' +
      '\nPhone: ' + orderInfo.phone +
      '\nDomain requested: ' + (orderInfo.domain || '-') +
      '\nReference: ' + reference +
      '\nStatus: ' + outcome +
      (reason ? '\nReason: ' + reason : '')
    );
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: fd }).catch(() => {});
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
          notifyByEmail(reference, 'paid');
        } else if (data.status === 'failed') {
          stopPolling();
          const reason = data.reason ? ' (' + data.reason + ')' : '';
          setStatus('The payment failed or was declined' + reason + '. You can try again below.', 'err');
          submitBtn.disabled = false;
          notifyByEmail(reference, 'failed', data.reason);
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
      domain: fd.get('domain') || '',
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      operator: fd.get('operator'),
    };
    orderInfo = body;

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
