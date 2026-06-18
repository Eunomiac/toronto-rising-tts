const cacheFields = ['presetName', 'sheetUrl', 'range', 'schemaText', 'jsonText', 'templateText'];
const appFields = ['sheetUrl', 'range', 'schemaText', 'jsonText', 'templateText'];
let presets = {};

async function postJson(url, formOrBody) {
  const body = formOrBody instanceof HTMLFormElement ? Object.fromEntries(new FormData(formOrBody).entries()) : formOrBody;
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

function setStatus(element, message, ok) {
  element.textContent = message;
  element.className = ok ? 'ok' : 'err';
}

function field(name) {
  return document.querySelector(`[name="${name}"]`);
}

function collectFields(names = cacheFields) {
  return Object.fromEntries(names.map((name) => [name, field(name)?.value ?? '']));
}

function restoreFields(values) {
  for (const [name, value] of Object.entries(values || {})) {
    const target = field(name);
    if (target && typeof value === 'string') target.value = value;
  }
  updateSaveButton();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function loadCache() {
  const response = await fetch('/api/form-cache');
  const payload = await response.json();
  if (payload.ok) restoreFields(payload.cache);
}

const saveCache = debounce(async () => {
  try {
    await postJson('/api/form-cache', collectFields());
  } catch (error) {
    console.warn('Unable to save form cache:', error);
  }
}, 250);

function updateSaveButton() {
  document.getElementById('savePreset').disabled = !field('presetName')?.value.trim();
}

function renderPresets() {
  const container = document.getElementById('presetButtons');
  container.replaceChildren();
  for (const name of Object.keys(presets).sort((a, b) => a.localeCompare(b))) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.textContent = name;
    button.addEventListener('click', () => {
      restoreFields({ ...presets[name], presetName: name });
      saveCache();
    });
    container.append(button);
  }
}

async function loadPresets() {
  const response = await fetch('/api/presets');
  const payload = await response.json();
  presets = payload.ok ? payload.presets : {};
  renderPresets();
}

async function savePreset() {
  const status = document.getElementById('presetStatus');
  const name = field('presetName')?.value.trim();
  if (!name) return;
  try {
    const values = collectFields(appFields);
    const result = await postJson('/api/presets', { name, values });
    presets = result.presets;
    renderPresets();
    await postJson('/api/form-cache', { ...values, presetName: name });
    setStatus(status, `Saved “${name}”`, true);
  } catch (error) {
    setStatus(status, error.message, false);
  }
}

function wireCache() {
  for (const name of cacheFields) {
    field(name)?.addEventListener('input', () => {
      updateSaveButton();
      saveCache();
    });
  }
  document.getElementById('savePreset').addEventListener('click', savePreset);
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
      await postJson('/api/form-cache', collectFields());
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

await loadCache();
await loadPresets();
wireCache();
wire('sheetForm', '/api/sheet-to-json', 'sheetStatus', 'jsonPreview', 'json');
wire('markdownForm', '/api/json-to-markdown', 'markdownStatus', 'markdownPreview', 'markdown');
