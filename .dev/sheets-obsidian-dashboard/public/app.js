const ids = ['spreadsheetRef','stateSheetName','patternRange','targetRange','markdownSourceRange','presetSlot','autoLinkLimitPerPhrase','autoLinkLimitPerFile'];
let presets = [];
const $ = (id) => document.getElementById(id);
const config = () => Object.fromEntries(ids.map(id => [id, id.includes('Limit') || id === 'presetSlot' ? Number($(id).value) : $(id).value]));
async function api(url, body) { const r = await fetch(url, body ? { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) } : undefined); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Request failed'); return j.data; }
function log(level, message) { const p = document.createElement('p'); p.className = level; p.innerHTML = `<time>${new Date().toLocaleTimeString()}</time>${message}`; $('ticker').prepend(p); }
async function run(label, fn) { $('busy').textContent = `(${label})`; try { return await fn(); } catch (e) { log('error', e.message || String(e)); } finally { $('busy').textContent = ''; } }
function fill(p) { if (!p) return; for (const id of ids) if (id in p && id !== 'presetSlot') $(id).value = p[id]; }
function renderPattern(data) { $('patternResult').innerHTML = `<b>${data.changes.length} changes</b>` + data.changes.slice(0,14).map(c => `<p><code>${c.address}</code> ${escape(c.before.slice(0,34))} → ${escape(c.after.slice(0,34))}</p>`).join(''); }
function renderMarkdown(data) { $('metrics').innerHTML = `<span>${data.files.length} files</span><span>${data.linkCount} links</span><span>${data.generatedTagCount} tags</span><span>${data.warnings.length} warnings</span><span>${data.errors.length} errors</span>`; $('markdownResult').innerHTML = [...data.errors.map(e=>`<p class="err">${escape(e)}</p>`), ...data.warnings.slice(0,10).map(w=>`<p class="warn">${escape(w)}</p>`), ...data.files.slice(0,14).map(f=>`<p><code>${f.status}</code> ${escape(f.path)}</p>`)].join('') || '<b>No files</b>'; }
function escape(s) { return String(s).replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }
new EventSource('/events').onmessage = (e) => { const ev = JSON.parse(e.data); log(ev.level, escape(ev.message)); };
api('/api/status').then(data => { presets = data.presets; $('auth').textContent = data.auth.authenticated ? 'Google connected' : data.auth.configured ? 'OAuth configured' : 'OAuth .env missing'; $('auth').className = data.auth.authenticated ? 'ok' : 'warn'; fill(presets[0]); });
$('presetSlot').onchange = () => fill(presets[Number($('presetSlot').value)]);
$('connect').onclick = () => run('auth', async () => window.open((await api('/api/auth/url')).url, '_blank'));
$('savePreset').onclick = () => run('save preset', async () => { presets = await api(`/api/presets/${$('presetSlot').value}`, { ...config(), name:`Slot ${Number($('presetSlot').value)+1}` }); });
$('patternPreview').onclick = () => run('pattern preview', async () => renderPattern(await api('/api/pattern/preview', config())));
$('patternApply').onclick = () => run('pattern apply', async () => renderPattern(await api('/api/pattern/apply', config())));
$('patternReset').onclick = () => run('pattern reset', async () => api('/api/pattern/reset', config())) ;
$('markdownPreview').onclick = () => run('markdown preview', async () => renderMarkdown(await api('/api/markdown/preview', config())));
$('markdownGenerate').onclick = () => run('markdown generate', async () => renderMarkdown(await api('/api/markdown/generate', config())));
$('guideBtn').onclick = () => $('guide').classList.remove('hidden'); $('closeGuide').onclick = () => $('guide').classList.add('hidden'); $('guide').onclick = e => { if (e.target.id === 'guide') $('guide').classList.add('hidden'); };
