(function(){
  const titleEl = document.getElementById('acctTitle');
  const subEl = document.getElementById('acctSub');
  const loggedOutView = document.getElementById('loggedOutView');
  const loggedInView = document.getElementById('loggedInView');
  const errorEl = document.getElementById('acctError');

  function showError(msg){
    titleEl.textContent = 'My account';
    subEl.textContent = 'Something went wrong.';
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  function statusLabel(status){
    if (status === 'paid') return 'Paid';
    if (status === 'failed') return 'Failed';
    return 'Pending';
  }

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((r) => r.json())
    .then((data) => {
      if (!data.user) {
        titleEl.textContent = 'My account';
        subEl.textContent = 'Log in or create an account to see your orders.';
        loggedOutView.hidden = false;
        return;
      }

      titleEl.textContent = 'Welcome back, ' + data.user.name;
      subEl.textContent = 'Here’s everything on your account.';
      loggedInView.hidden = false;
      document.getElementById('acctName').textContent = data.user.name;
      document.getElementById('acctEmail').textContent = data.user.email;

      const orders = data.orders || [];
      const listEl = document.getElementById('ordersList');
      const emptyEl = document.getElementById('ordersEmpty');
      if (!orders.length) {
        emptyEl.hidden = false;
      } else {
        orders.forEach((o) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px dashed var(--line)';
          const left = document.createElement('div');
          left.innerHTML = '<strong>' + o.plan + '</strong><br><span style="color:var(--text-mute);font-size:13px">' +
            new Date(o.created_at).toLocaleDateString() + ' · ZMW ' + Number(o.amount).toLocaleString() + ' · ' + statusLabel(o.status) + '</span>';
          row.appendChild(left);
          if (o.status === 'paid') {
            const link = document.createElement('a');
            link.href = '/api/checkout/receipt/' + encodeURIComponent(o.reference);
            link.textContent = 'Receipt';
            link.style.cssText = 'color:var(--copper);font-weight:600;text-decoration:none';
            row.appendChild(link);
          }
          listEl.appendChild(row);
        });
      }

      document.getElementById('logoutBtn').addEventListener('click', function(){
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .then(() => { window.location.href = 'index.html'; });
      });
    })
    .catch(() => showError('Could not load your account — please try again.'));
})();
