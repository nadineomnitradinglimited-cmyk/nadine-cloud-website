(function () {
  const GREETING = "Hi, I'm Nadine. Ask me about hosting, domains, web design or pricing — or message us on WhatsApp anytime.";
  const NAME_KEY = 'nc_chat_name';
  const SKIPPED_KEY = 'nc_chat_skipped_name';

  const history = [];
  let sending = false;

  function getStoredName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }
  function storeName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
  }
  function nameResolved() {
    try { return Boolean(localStorage.getItem(NAME_KEY) || localStorage.getItem(SKIPPED_KEY)); }
    catch (e) { return true; } // if storage is unavailable, don't block the chat on it
  }
  function markSkipped() {
    try { localStorage.setItem(SKIPPED_KEY, '1'); } catch (e) { /* ignore */ }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const root = document.createElement('div');
  root.className = 'chat-widget';
  root.innerHTML = `
    <button class="chat-bubble" aria-label="Open chat" aria-expanded="false">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>
    <div class="chat-panel" hidden>
      <div class="chat-panel-header">
        <span>Nadine</span>
        <button class="chat-close" aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-gate">
        <p>What's your name? So our team knows who they're talking to if you ever need a hand.</p>
        <input type="text" class="chat-gate-input" placeholder="Your name" aria-label="Your name" autocomplete="name" maxlength="60">
        <button type="button" class="chat-gate-start">Start chatting</button>
        <button type="button" class="chat-gate-skip">Skip for now</button>
      </div>
      <div class="chat-messages" role="log" aria-live="polite" hidden></div>
      <form class="chat-input-row" hidden>
        <input type="text" class="chat-input" placeholder="Type a message…" aria-label="Message" autocomplete="off" maxlength="800">
        <button type="submit" class="chat-send" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const bubbleBtn = root.querySelector('.chat-bubble');
  const panel = root.querySelector('.chat-panel');
  const closeBtn = root.querySelector('.chat-close');
  const gate = root.querySelector('.chat-gate');
  const gateInput = root.querySelector('.chat-gate-input');
  const gateStart = root.querySelector('.chat-gate-start');
  const gateSkip = root.querySelector('.chat-gate-skip');
  const messagesEl = root.querySelector('.chat-messages');
  const form = root.querySelector('.chat-input-row');
  const input = root.querySelector('.chat-input');

  function addMessage(role, text) {
    const row = document.createElement('div');
    row.className = 'chat-msg chat-msg-' + role;
    row.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  function showChat() {
    gate.hidden = true;
    messagesEl.hidden = false;
    form.hidden = false;
    if (!messagesEl.children.length) addMessage('assistant', GREETING);
    input.focus();
  }

  function resolveName(name) {
    if (name) storeName(name); else markSkipped();
    showChat();
  }

  gateStart.addEventListener('click', () => resolveName(gateInput.value.trim()));
  gateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); resolveName(gateInput.value.trim()); }
  });
  gateSkip.addEventListener('click', () => resolveName(''));

  function openPanel() {
    panel.hidden = false;
    bubbleBtn.setAttribute('aria-expanded', 'true');
    if (nameResolved()) {
      showChat();
    } else {
      gate.hidden = false;
      gateInput.focus();
    }
  }

  function closePanel() {
    panel.hidden = true;
    bubbleBtn.setAttribute('aria-expanded', 'false');
  }

  bubbleBtn.addEventListener('click', () => {
    panel.hidden ? openPanel() : closePanel();
  });
  closeBtn.addEventListener('click', closePanel);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message || sending) return;

    addMessage('user', message);
    input.value = '';
    sending = true;

    const typingRow = addMessage('assistant', '…');
    typingRow.classList.add('chat-typing');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, name: getStoredName() }),
      });
      const data = await res.json();
      typingRow.remove();

      if (!res.ok) {
        addMessage('assistant', data.error || 'Something went wrong — please try WhatsApp instead.');
      } else {
        addMessage('assistant', data.reply);
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: data.historyReply || data.reply });
      }
    } catch (err) {
      typingRow.remove();
      addMessage('assistant', "Couldn't reach the server — please try WhatsApp at +260 77 034 6698.");
    } finally {
      sending = false;
      input.focus();
    }
  });
})();
