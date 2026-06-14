import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(appRoot, 'public');
const dataDir = path.join(appRoot, '.local');
const outputRoot = path.join(appRoot, 'output');
const logDir = path.join(outputRoot, '_logs');
const backupRoot = path.join(outputRoot, '_backups');
const testingRoot = path.join(appRoot, 'testing');
const validOutputRoot = path.join(testingRoot, 'validOutput');
const testOutputRoot = path.join(testingRoot, 'testOutput');
const tokenPath = path.join(dataDir, 'google-token.json');
const presetPath = path.join(dataDir, 'presets.json');
const port = Number(process.env.PORT || 8787);
const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

for (const dir of [dataDir, outputRoot, logDir, backupRoot, validOutputRoot, testOutputRoot]) fs.mkdirSync(dir, { recursive: true });
loadEnv();

const clients = new Set();
const history = [];
function emit(level, message) {
  const event = { ts: new Date().toISOString(), level, message };
  history.push(event); if (history.length > 300) history.shift();
  for (const res of clients) res.write(`data: ${JSON.stringify(event)}\n\n`);
}
function loadEnv() {
  const file = path.join(appRoot, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim(); if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('='); if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim(); const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
function json(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); }
async function wrap(res, fn) { try { json(res, 200, { ok: true, data: await fn() }); } catch (err) { const message = err?.message || String(err); emit('error', message); json(res, 200, { ok: false, error: message }); } }
async function readBody(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
function defaultPresets() { return Array.from({ length: 5 }, (_, i) => ({ name: `Slot ${i + 1}`, spreadsheetRef: '', stateSheetName: 'Dashboard State', patternRange: '', targetRange: '', markdownSourceRange: '', testPatternRange: '', testDataRange: '', testValidOutputFolder: '', autoLinkLimitPerPhrase: 25, autoLinkLimitPerFile: 100 })); }
function readPresets() { if (!fs.existsSync(presetPath)) return defaultPresets(); const saved = JSON.parse(fs.readFileSync(presetPath, 'utf8')); return defaultPresets().map((p, i) => ({ ...p, ...(saved[i] || {}) })); }
function writePreset(slot, preset) { const presets = readPresets(); presets[slot] = preset; fs.writeFileSync(presetPath, JSON.stringify(presets, null, 2)); return presets; }
function authStatus() { return { configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), authenticated: fs.existsSync(tokenPath) }; }
function authUrl() { if (!authStatus().configured) throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.'); const u = new URL('https://accounts.google.com/o/oauth2/v2/auth'); u.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID); u.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/callback`); u.searchParams.set('response_type', 'code'); u.searchParams.set('access_type', 'offline'); u.searchParams.set('prompt', 'consent'); u.searchParams.set('scope', scopes.join(' ')); return u.toString(); }
async function saveCode(code) { const body = new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/callback`, grant_type: 'authorization_code' }); const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body }); if (!r.ok) throw new Error(await r.text()); fs.writeFileSync(tokenPath, JSON.stringify(await r.json(), null, 2)); }
async function token() { if (!fs.existsSync(tokenPath)) throw new Error('Google account is not authenticated yet.'); const t = JSON.parse(fs.readFileSync(tokenPath, 'utf8')); if (t.expiry_date && Date.now() < t.expiry_date - 60000) return t.access_token; if (!t.refresh_token) return t.access_token; const body = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: t.refresh_token, grant_type: 'refresh_token' }); const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body }); if (!r.ok) throw new Error(await r.text()); const next = { ...t, ...(await r.json()) }; fs.writeFileSync(tokenPath, JSON.stringify(next, null, 2)); return next.access_token; }
function spreadsheetId(ref) { const s = String(ref || '').trim(); const m = s.match(/\/spreadsheets\/d\/([\w-]+)/); if (m) return m[1]; if (/^[\w-]{20,}$/.test(s)) return s; throw new Error('Enter a Google Sheets URL or spreadsheet ID.'); }
async function sheets(method, id, endpoint, body) { const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${endpoint}`, { method, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error(await r.text()); return r.status === 204 ? {} : r.json(); }
async function readRange(id, range) { const q = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' }); const data = await sheets('GET', id, `/values/${encodeURIComponent(range)}?${q}`); return data.values || []; }
async function writeRange(id, range, values) { await sheets('PUT', id, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { values }); }
async function ensureStateSheet(id, stateSheet) {
  const meta = await sheets('GET', id, '?fields=sheets.properties.title');
  if (!meta.sheets?.some(sheet => sheet.properties?.title === stateSheet)) {
    await sheets('POST', id, ':batchUpdate', { requests: [{ addSheet: { properties: { title: stateSheet } } }] });
  }
}
async function appendState(id, stateSheet, rows) {
  await ensureStateSheet(id, stateSheet);
  await sheets('POST', id, `/values/${encodeURIComponent(`'${stateSheet.replaceAll("'", "''")}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { values: rows });
}
function colNum(label) { return [...label.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0); }
function colLabel(n) { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }
function parseStart(range) { const a1 = range.includes('!') ? range.split('!').pop() : range; const m = a1.match(/^([A-Za-z]+)(\d+)/); return { row: m ? Number(m[2]) : 1, col: m ? colNum(m[1]) : 1 }; }
function regexLiteral(raw) { const v = String(raw || '').trim(); if (!v.startsWith('/')) throw new Error(`Pattern must be a JS regex literal: ${v}`); let escaped = false, close = -1; for (let i = 1; i < v.length; i++) { const ch = v[i]; if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '/') { close = i; break; } } if (close < 0) throw new Error(`Regex literal is missing closing slash: ${v}`); const body = v.slice(1, close), flags = v.slice(close + 1); if (!/^[dgimsuvy]*$/.test(flags)) throw new Error(`Invalid regex flags: ${flags}`); return new RegExp(body, flags); }
function normRows(values, rows, cols) { return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => String(values[r]?.[c] ?? ''))); }
async function patternPreview(config) { const id = spreadsheetId(config.spreadsheetRef); emit('info', 'Reading pattern pairs and target cells.'); const pairs = (await readRange(id, config.patternRange)).map((r, i) => ({ regex: regexLiteral(r[0]), replacement: String(r[1] || ''), row: i + 1 })); const target = await readRange(id, config.targetRange); const width = Math.max(1, ...target.map(r => r.length)); const original = normRows(target, target.length, width); const changed = original.map(row => row.map(cell => pairs.reduce((txt, p) => txt.replace(p.regex, p.replacement), cell))); const start = parseStart(config.targetRange), changes = []; for (let r = 0; r < original.length; r++) for (let c = 0; c < width; c++) if (original[r][c] !== changed[r][c]) changes.push({ address: `${colLabel(start.col + c)}${start.row + r}`, before: original[r][c], after: changed[r][c] }); emit('success', `Pattern preview complete: ${changes.length} changed cells.`); return { changes, errors: [], backupKey: crypto.createHash('sha256').update(id + config.targetRange).digest('hex').slice(0, 16) }; }
async function patternApply(config) { const id = spreadsheetId(config.spreadsheetRef); const preview = await patternPreview(config); const target = await readRange(id, config.targetRange); const width = Math.max(1, ...target.map(r => r.length)); const original = normRows(target, target.length, width); const key = preview.backupKey; fs.mkdirSync(path.join(dataDir, 'pattern-backups'), { recursive: true }); fs.writeFileSync(path.join(dataDir, 'pattern-backups', `${key}.json`), JSON.stringify({ range: config.targetRange, values: original }, null, 2)); await appendState(id, config.stateSheetName, [['# sheets-obsidian-dashboard', new Date().toISOString(), 'pattern-backup', key], ['targetRange', config.targetRange], ...original.map(r => ['backup', ...r])]); const pairs = (await readRange(id, config.patternRange)).map(r => ({ regex: regexLiteral(r[0]), replacement: String(r[1] || '') })); await writeRange(id, config.targetRange, original.map(row => row.map(cell => pairs.reduce((txt, p) => txt.replace(p.regex, p.replacement), cell)))); emit('success', `Applied ${preview.changes.length} pattern changes.`); return preview; }
async function patternReset(config) { const id = spreadsheetId(config.spreadsheetRef); const key = crypto.createHash('sha256').update(id + config.targetRange).digest('hex').slice(0, 16); const file = path.join(dataDir, 'pattern-backups', `${key}.json`); if (!fs.existsSync(file)) throw new Error(`No local backup exists for ${config.targetRange}.`); const backup = JSON.parse(fs.readFileSync(file, 'utf8')); await writeRange(id, config.targetRange, backup.values); emit('success', `Restored ${backup.values.length} backed-up rows.`); return { restored: backup.values.length }; }
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function cleanCell(s) { return String(s ?? '').replace(/\r?\n/g, '\n').replace(/\u00a0/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[–—]/g, '—').replace(/---/g, '—').replace(/(^|\s)--(\s|$)/g, '$1—$2').replace(/(^|[\s([])-(\d)/g, '$1−$2').replace(/([^\n ]) {2,}/g, '$1 ').replace(/— — —/g, '---'); }
function normalizeMd(parts) { return parts.map(cleanCell).map(s => s.trim()).filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2').replace(/\n(#{1,6}\s+)/g, '\n\n$1').replace(/\n{3,}/g, '\n\n').trim() + '\n'; }
function tagify(text) { const words = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^A-Za-z0-9_]+/).map(w => w.replace(/[^A-Za-z0-9_]/g, '')).filter(Boolean); return words.map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(''); }
function yamlParse(text) { const obj = {}; for (const line of String(text || '').replace(/^---\s*/, '').replace(/\s*---$/, '').split(/\r?\n/)) { const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/); if (m) obj[m[1]] = m[2] ? m[2] : []; else if (line.trim().startsWith('-') && Array.isArray(obj[Object.keys(obj).at(-1)])) obj[Object.keys(obj).at(-1)].push(line.trim().slice(1).trim()); } return obj; }
function yamlDump(obj) { return Object.entries(obj).map(([k, v]) => Array.isArray(v) ? `${k}:\n${v.map(x => `  - ${x}`).join('\n')}` : `${k}: ${v}`).join('\n'); }
function safePath(raw, seen, root = outputRoot) { const rel = String(raw || '').trim().replaceAll('\\', '/'); if (!rel || path.isAbsolute(rel) || rel.includes('..') || !rel.endsWith('.md')) throw new Error(`Unsafe Markdown path: ${raw}`); const normal = path.posix.normalize(rel); const full = path.resolve(root, normal); if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path escapes output root: ${raw}`); const key = normal.toLowerCase(); if (seen.has(key)) throw new Error(`Duplicate output path: ${normal}`); seen.add(key); return normal; }
const wiki = /(!?)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
function prepareRows(values, root = outputRoot) { if (values.length < 2) throw new Error('Markdown source requires a header and data rows.'); const h = values[0].map(x => String(x || '').trim()); if (h[0] !== 'path' || h[1] !== 'tags') throw new Error('First two headers must be exactly path and tags.'); const yamlIndex = h[2] === 'yaml' ? 2 : -1, seen = new Set(); return values.slice(1).filter(r => r.some(Boolean)).map((r, i) => ({ rowNumber: i + 2, outPath: safePath(r[0], seen, root), tags: String(r[1] || '').split(',').map(s => s.trim()).filter(Boolean), yamlText: yamlIndex === 2 ? String(r[2] || '') : '', body: normalizeMd(r.filter((_, c) => c !== 0 && c !== 1 && c !== yamlIndex).map(String)) })); }
function headings(body) { return [...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => m[1].replace(/#+$/, '').trim()); }
function firstH1(body) { return body.match(/^#\s+(.+)$/m)?.[1]?.trim(); }
function protectedText(body) { const blocks = []; const stash = m => `@@P${blocks.push(m)-1}@@`; const text = body.replace(/^---[\s\S]*?---\n?/, stash).replace(/```[\s\S]*?```/g, stash).replace(/`[^`]*`/g, stash).replace(/!?\[\[[^\]]+\]\]/g, stash).replace(/https?:\/\/\S+/g, stash); return { text, restore: t => t.replace(/@@P(\d+)@@/g, (_, i) => blocks[Number(i)] || '') }; }
async function markdownPrepare(config) { const run = stamp(), warnings = [], errors = []; let drafts = [], autoLinkCount = 0; try { const rows = prepareRows(await readRange(spreadsheetId(config.spreadsheetRef), config.markdownSourceRange)); drafts = rows.map(row => ({ row, title: path.posix.basename(row.outPath, '.md'), aliases: [firstH1(row.body)].filter(Boolean), headings: headings(row.body), body: row.body, final: '', generatedTags: [] })); const titleMap = new Map(); for (const d of drafts) for (const t of [d.title, ...d.aliases]) titleMap.set(t.toLowerCase(), [...(titleMap.get(t.toLowerCase()) || []), d.row.outPath]); for (const [t, ps] of titleMap) if (ps.length > 1) errors.push(`Duplicate page title/alias "${t}": ${ps.join(', ')}`); const index = new Map(); for (const d of drafts) for (const t of [d.title, ...d.aliases]) index.set(t.toLowerCase(), d); const candidates = []; for (const d of drafts) d.body = d.body.replace(wiki, (raw, embed, page, heading, display) => { const target = index.get(String(page).trim().toLowerCase()); if (!target) { warnings.push(`Unresolved link ${raw} in ${d.row.outPath}.`); return raw; } const visible = String(display || heading || page).trim(); if (heading && !target.headings.some(h => h.toLowerCase() === String(heading).trim().toLowerCase())) warnings.push(`Missing heading "${heading}" in ${target.row.outPath}; referenced from ${d.row.outPath}.`); const corrected = `${target.row.outPath.replace(/\.md$/, '')}${heading ? `#${heading}` : ''}`; candidates.push({ display: visible, corrected, embed: embed === '!' }); return `${embed}[[${corrected}|${visible}]]`; }); for (const d of drafts) { let p = protectedText(d.body); for (const c of candidates.filter(c => !c.embed && c.display.toLowerCase() !== d.title.toLowerCase()).sort((a,b)=>b.display.length-a.display.length)) { const re = new RegExp(`(?<![A-Za-z0-9_])${c.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'gi'); const matches = [...p.text.matchAll(re)]; if (matches.length > Number(config.autoLinkLimitPerPhrase || 25)) { warnings.push(`${d.row.outPath}: skipped noisy phrase "${c.display}" after ${matches.length} matches.`); continue; } p.text = p.text.replace(re, visible => { if (autoLinkCount >= Number(config.autoLinkLimitPerFile || 100)) return visible; autoLinkCount++; return `[[${c.corrected}|${visible}]]`; }); } d.body = p.restore(p.text); const linkDisplays = [...d.body.matchAll(wiki)].filter(m => !m[1]).map(m => String(m[4] || m[3] || m[2])); d.generatedTags = [...new Set(linkDisplays.map(tagify).filter(Boolean))]; const meta = yamlParse(d.row.yamlText); meta.tags = [...new Set([...(Array.isArray(meta.tags) ? meta.tags : String(meta.tags || '').split(',')), ...d.row.tags, ...d.generatedTags].map(tagify).filter(Boolean))]; d.final = `---\n${yamlDump(meta)}\n---\n\n${d.body.trim()}\n`; } } catch (e) { errors.push(e.message || String(e)); }
  const files = drafts.map(d => ({ path: d.row.outPath, bytes: Buffer.byteLength(d.final), status: fs.existsSync(path.join(outputRoot, d.row.outPath)) ? 'overwrite' : 'create' })); const tsv = drafts.length ? writeTsv(drafts, run) : undefined; const preview = { files, warnings, errors, linkCount: drafts.reduce((n,d)=>n+[...d.body.matchAll(wiki)].length,0), autoLinkCount, generatedTagCount: drafts.reduce((n,d)=>n+d.generatedTags.length,0), correctedTsvPath: tsv }; emit(errors.length ? 'error' : 'success', errors.length ? `Markdown validation failed with ${errors.length} errors.` : `Markdown preview ready: ${files.length} files.`); return { preview, drafts, run }; }
function writeTsv(drafts, run) { const file = path.join(logDir, `corrected-data-${run}.tsv`); fs.writeFileSync(file, ['path\ttags\tyaml\tcorrected_markdown', ...drafts.map(d => [d.row.outPath, d.row.tags.join(','), d.row.yamlText, d.body].map(c => String(c).replace(/\t/g, ' ').replace(/\n/g, '\\n')).join('\t'))].join('\n') + '\n'); return path.relative(outputRoot, file); }

function applyPatternRows(patternRows, dataRows) {
  const pairs = patternRows.filter(r => r?.[0]).map(r => ({ regex: regexLiteral(r[0]), replacement: String(r[1] || '') }));
  return dataRows.map(row => row.map(cell => pairs.reduce((txt, p) => String(txt).replace(p.regex, p.replacement), String(cell ?? ''))));
}
function hasMarkdownFiles(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && hasMarkdownFiles(full)) return true;
    if (entry.isFile() && entry.name.endsWith('.md')) return true;
  }
  return false;
}
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (base) => {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const full = path.join(base, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(dir, full).replaceAll('\\', '/'));
    }
  };
  walk(dir);
  return out.sort();
}
function lineDiff(expected, actual) {
  const a = expected.split(/\r?\n/), b = actual.split(/\r?\n/), rows = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) if ((a[i] ?? '') !== (b[i] ?? '')) rows.push({ line: i + 1, expected: a[i] ?? '', actual: b[i] ?? '' });
  return rows.slice(0, 80);
}
async function testRun(config) {
  const folderName = String(config.testValidOutputFolder || '').trim().replaceAll('\\', '/');
  if (!folderName || folderName.includes('..') || path.isAbsolute(folderName)) throw new Error('Testing valid output folder must be a safe subfolder name.');
  const validDir = path.join(validOutputRoot, folderName);
  if (!hasMarkdownFiles(validDir)) throw new Error(`Expected output folder testing/validOutput/${folderName} was not found or contains no Markdown files.`);
  const id = spreadsheetId(config.spreadsheetRef);
  emit('info', 'Reading testing pattern range and Markdown source range.');
  const patternRows = await readRange(id, config.testPatternRange);
  const sourceRows = await readRange(id, config.testDataRange);
  if (!sourceRows.length) throw new Error('Test Data range is empty.');
  const processedRows = [sourceRows[0], ...applyPatternRows(patternRows, sourceRows.slice(1))];
  const previousOutputRoot = globalThis.__dashboardOutputRoot;
  const outDir = path.join(testOutputRoot, folderName);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const result = await markdownFromValues({ ...config, __outputRoot: outDir }, processedRows, true);
  const expectedFiles = listFiles(validDir).filter(f => f.endsWith('.md'));
  const actualFiles = listFiles(outDir).filter(f => f.endsWith('.md'));
  const expectedSet = new Set(expectedFiles), actualSet = new Set(actualFiles);
  const missing = expectedFiles.filter(f => !actualSet.has(f));
  const extra = actualFiles.filter(f => !expectedSet.has(f));
  const changed = [];
  for (const file of expectedFiles.filter(f => actualSet.has(f))) {
    const expected = fs.readFileSync(path.join(validDir, file), 'utf8');
    const actual = fs.readFileSync(path.join(outDir, file), 'utf8');
    if (expected !== actual) changed.push({ file, differences: lineDiff(expected, actual) });
  }
  const run = stamp();
  const log = { run, validFolder: folderName, expectedRoot: path.relative(appRoot, validDir), actualRoot: path.relative(appRoot, outDir), missing, extra, changed, warnings: result.warnings, errors: result.errors };
  const logFile = path.join(logDir, `test-discrepancies-${run}.json`);
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  emit(changed.length || missing.length || extra.length || result.errors.length ? 'warn' : 'success', `Test completed: ${missing.length} missing, ${extra.length} extra, ${changed.length} changed files.`);
  return { ...log, logPath: path.relative(outputRoot, logFile), filesGenerated: actualFiles.length };
}
async function markdownFromValues(config, values, writeFiles = false) {
  const outRoot = config.__outputRoot || outputRoot;
  const run = stamp(), warnings = [], errors = []; let drafts = [], autoLinkCount = 0;
  const oldOutput = globalThis.__outputRootOverride;
  globalThis.__outputRootOverride = outRoot;
  try {
    const rows = prepareRows(values, outRoot);
    drafts = rows.map(row => ({ row, title: path.posix.basename(row.outPath, '.md'), aliases: [firstH1(row.body)].filter(Boolean), headings: headings(row.body), body: row.body, final: '', generatedTags: [] }));
    const titleMap = new Map(); for (const d of drafts) for (const t of [d.title, ...d.aliases]) titleMap.set(t.toLowerCase(), [...(titleMap.get(t.toLowerCase()) || []), d.row.outPath]);
    for (const [t, ps] of titleMap) if (ps.length > 1) errors.push(`Duplicate page title/alias "${t}": ${ps.join(', ')}`);
    const index = new Map(); for (const d of drafts) for (const t of [d.title, ...d.aliases]) index.set(t.toLowerCase(), d);
    const candidates = [];
    for (const d of drafts) d.body = d.body.replace(wiki, (raw, embed, page, heading, display) => { const target = index.get(String(page).trim().toLowerCase()); if (!target) { warnings.push(`Unresolved link ${raw} in ${d.row.outPath}.`); return raw; } const visible = String(display || heading || page).trim(); if (heading && !target.headings.some(h => h.toLowerCase() === String(heading).trim().toLowerCase())) warnings.push(`Missing heading "${heading}" in ${target.row.outPath}; referenced from ${d.row.outPath}.`); const corrected = `${target.row.outPath.replace(/\.md$/, '')}${heading ? `#${heading}` : ''}`; candidates.push({ display: visible, corrected, embed: embed === '!' }); return `${embed}[[${corrected}|${visible}]]`; });
    for (const d of drafts) { let p = protectedText(d.body); for (const c of candidates.filter(c => !c.embed && c.display.toLowerCase() !== d.title.toLowerCase()).sort((a,b)=>b.display.length-a.display.length)) { const re = new RegExp(`(?<![A-Za-z0-9_])${c.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'gi'); const matches = [...p.text.matchAll(re)]; if (matches.length > Number(config.autoLinkLimitPerPhrase || 25)) { warnings.push(`${d.row.outPath}: skipped noisy phrase "${c.display}" after ${matches.length} matches.`); continue; } p.text = p.text.replace(re, visible => { if (autoLinkCount >= Number(config.autoLinkLimitPerFile || 100)) return visible; autoLinkCount++; return `[[${c.corrected}|${visible}]]`; }); } d.body = p.restore(p.text); const linkDisplays = [...d.body.matchAll(wiki)].filter(m => !m[1]).map(m => String(m[4] || m[3] || m[2])); d.generatedTags = [...new Set(linkDisplays.map(tagify).filter(Boolean))]; const meta = yamlParse(d.row.yamlText); meta.tags = [...new Set([...(Array.isArray(meta.tags) ? meta.tags : String(meta.tags || '').split(',')), ...d.row.tags, ...d.generatedTags].map(tagify).filter(Boolean))]; d.final = `---\n${yamlDump(meta)}\n---\n\n${d.body.trim()}\n`; }
  } catch (e) { errors.push(e.message || String(e)); }
  const files = drafts.map(d => ({ path: d.row.outPath, bytes: Buffer.byteLength(d.final), status: fs.existsSync(path.join(outRoot, d.row.outPath)) ? 'overwrite' : 'create' }));
  if (writeFiles && !errors.length) for (const d of drafts) { const full = path.join(outRoot, d.row.outPath); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, d.final); }
  globalThis.__outputRootOverride = oldOutput;
  return { files, warnings, errors, linkCount: drafts.reduce((n,d)=>n+[...d.body.matchAll(wiki)].length,0), autoLinkCount, generatedTagCount: drafts.reduce((n,d)=>n+d.generatedTags.length,0), drafts, run };
}

async function markdownPreview(config) { return (await markdownPrepare(config)).preview; }
async function markdownGenerate(config) { const { preview, drafts, run } = await markdownPrepare(config); if (preview.errors.length) return preview; const backupDir = path.join(backupRoot, run); for (const d of drafts) { const full = path.join(outputRoot, d.row.outPath); if (fs.existsSync(full)) { const backup = path.join(backupDir, d.row.outPath); fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.copyFileSync(full, backup); } fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, d.final); } if (preview.warnings.length) { fs.writeFileSync(path.join(logDir, `warnings-${run}.md`), preview.warnings.map(w => `- ${w}`).join('\n') + '\n'); fs.writeFileSync(path.join(logDir, `warnings-${run}.tsv`), preview.warnings.join('\n') + '\n'); } fs.writeFileSync(path.join(logDir, `run-summary-${run}.json`), JSON.stringify(preview, null, 2)); emit('success', `Generated ${drafts.length} Markdown files.`); return preview; }
function serveStatic(req, res) { const url = new URL(req.url, `http://localhost:${port}`); const file = path.join(publicRoot, url.pathname === '/' ? 'index.html' : url.pathname); if (!file.startsWith(publicRoot) || !fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; } const ext = path.extname(file); const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html'; res.writeHead(200, { 'content-type': type }); fs.createReadStream(file).pipe(res); }
const server = http.createServer(async (req, res) => { const url = new URL(req.url, `http://localhost:${port}`); if (url.pathname === '/events') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); clients.add(res); for (const e of history.slice(-50)) res.write(`data: ${JSON.stringify(e)}\n\n`); req.on('close', () => clients.delete(res)); return; } if (url.pathname === '/api/auth/callback') { await saveCode(url.searchParams.get('code') || ''); emit('success', 'Google OAuth token saved.'); res.writeHead(200, {'content-type':'text/html'}); res.end('<h1>Google Sheets connected.</h1><p>You may close this tab.</p>'); return; } if (url.pathname.startsWith('/api/')) { const body = req.method === 'POST' ? await readBody(req) : {}; if (url.pathname === '/api/status') return wrap(res, () => ({ auth: authStatus(), presets: readPresets() })); if (url.pathname === '/api/auth/url') return wrap(res, () => ({ url: authUrl() })); if (url.pathname.startsWith('/api/presets/')) return wrap(res, () => writePreset(Number(url.pathname.split('/').pop()), body)); if (url.pathname === '/api/pattern/preview') return wrap(res, () => patternPreview(body)); if (url.pathname === '/api/pattern/apply') return wrap(res, () => patternApply(body)); if (url.pathname === '/api/pattern/reset') return wrap(res, () => patternReset(body)); if (url.pathname === '/api/markdown/preview') return wrap(res, () => markdownPreview(body)); if (url.pathname === '/api/markdown/generate') return wrap(res, () => markdownGenerate(body)); if (url.pathname === '/api/test/run') return wrap(res, () => testRun(body)); }
  serveStatic(req, res);
});
server.listen(port, () => emit('info', `Sheets Obsidian Dashboard listening at http://localhost:${port}`));
