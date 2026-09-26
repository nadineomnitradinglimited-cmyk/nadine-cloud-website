(function(){
  const generateForm = document.getElementById('aiGenerateForm');
  if (!generateForm) return;

  const promptInput = document.getElementById('aiPrompt');
  const generateBtn = document.getElementById('aiGenerateBtn');
  const statusEl = document.getElementById('aiStatus');
  const previewWrap = document.getElementById('aiPreviewWrap');
  const previewFrame = document.getElementById('aiPreviewFrame');
  const refineForm = document.getElementById('aiRefineForm');
  const refinePrompt = document.getElementById('aiRefinePrompt');
  const refineBtn = document.getElementById('aiRefineBtn');
  const generationsLeftEl = document.getElementById('aiGenerationsLeft');
  const getBuilderLink = document.getElementById('aiGetBuilder');
  const getLaunchLink = document.getElementById('aiGetLaunch');

  let draftId = null;

  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
  }

  function showPreview(id){
    draftId = id;
    previewFrame.src = '/api/ai-builder/preview/' + encodeURIComponent(id);
    previewWrap.hidden = false;
    getBuilderLink.href = '/checkout?type=builder&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Builder&amount=59&period=mo&draftId=' + encodeURIComponent(id);
    const launchAmount = window.ncLaunchPrice ? window.ncLaunchPrice() : 850; // promo-banner.js
    getLaunchLink.href = '/checkout?type=bundle&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Launch&amount=' + launchAmount + '&period=yr&draftId=' + encodeURIComponent(id);
  }

  function updateGenerationsLeft(remaining){
    if (remaining <= 0) {
      generationsLeftEl.textContent = "You've used all 5 free previews for this site — pay for hosting to keep it, or start a new one below.";
      refinePrompt.disabled = true;
      refineBtn.disabled = true;
    } else {
      generationsLeftEl.textContent = remaining + ' free preview' + (remaining === 1 ? '' : 's') + ' left for this site.';
      refinePrompt.disabled = false;
      refineBtn.disabled = false;
    }
  }

  generateForm.addEventListener('submit', function(e){
    e.preventDefault();
    const prompt = (promptInput.value || '').trim();
    if (!prompt) return;

    generateBtn.disabled = true;
    setStatus('Generating your site — this can take a little while…', '');

    fetch('/api/ai-builder/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        generateBtn.disabled = false;
        if (!ok) {
          setStatus(data.error || 'Something went wrong — please try again.', 'err');
          return;
        }
        setStatus('', '');
        showPreview(data.draftId);
        updateGenerationsLeft(data.generationsRemaining);
      })
      .catch(() => {
        generateBtn.disabled = false;
        setStatus('Something went wrong — please try again.', 'err');
      });
  });

  refineForm.addEventListener('submit', function(e){
    e.preventDefault();
    if (!draftId) return;
    const prompt = (refinePrompt.value || '').trim();
    if (!prompt) return;

    refineBtn.disabled = true;

    fetch('/api/ai-builder/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId, prompt }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        refineBtn.disabled = false;
        if (!ok) {
          generationsLeftEl.textContent = data.error || 'Something went wrong — please try again.';
          return;
        }
        // cache-bust so the iframe actually reloads the updated preview
        previewFrame.src = '/api/ai-builder/preview/' + encodeURIComponent(draftId) + '?t=' + Date.now();
        refinePrompt.value = '';
        updateGenerationsLeft(data.generationsRemaining);
      })
      .catch(() => {
        refineBtn.disabled = false;
        generationsLeftEl.textContent = 'Something went wrong — please try again.';
      });
  });
})();
