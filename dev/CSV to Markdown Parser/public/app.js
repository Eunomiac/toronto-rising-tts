async function postJson(url, form) {
  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

function setStatus(element, message, ok) {
  element.textContent = message;
  element.className = ok ? 'ok' : 'err';
}

async function wire(formId, endpoint, statusId, previewId, previewKey) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  const preview = document.getElementById(previewId);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    setStatus(status, 'Processing…', true);
    try {
      const result = await postJson(endpoint, form);
      setStatus(status, `Wrote ${result.filePath}`, true);
      preview.textContent = previewKey === 'json' ? JSON.stringify(result[previewKey], null, 2) : result[previewKey];
    } catch (error) {
      setStatus(status, error.message, false);
    } finally {
      button.disabled = false;
    }
  });
}

wire('sheetForm', '/api/sheet-to-json', 'sheetStatus', 'jsonPreview', 'json');
wire('markdownForm', '/api/json-to-markdown', 'markdownStatus', 'markdownPreview', 'markdown');
