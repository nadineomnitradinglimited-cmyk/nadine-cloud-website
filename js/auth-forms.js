(function(){
  function wire(formId, endpoint, redirectTo){
    const form = document.getElementById(formId);
    if (!form) return;
    const status = document.getElementById('formStatus');
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';
      btn.disabled = true;

      const fd = new FormData(form);
      const body = {};
      fd.forEach((v, k) => { body[k] = v; });

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            status.textContent = data.error || 'Something went wrong.';
            status.classList.add('err');
            btn.disabled = false;
            return;
          }
          status.textContent = 'Success — redirecting…';
          status.classList.add('ok');
          window.location.href = redirectTo;
        })
        .catch(() => {
          status.textContent = 'Something went wrong — please try again.';
          status.classList.add('err');
          btn.disabled = false;
        });
    });
  }

  wire('signupForm', '/api/auth/signup', 'account.html');
  wire('loginForm', '/api/auth/login', 'account.html');
})();
