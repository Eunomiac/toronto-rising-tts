import fs from 'node:fs/promises';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureTypeScriptEntry, runTypeScriptEntry } from './ts-workflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');
await loadEnv(path.join(appRoot, '.env'));
const port = Number(process.env.PORT || 3100);
const outputDir = path.resolve(appRoot, process.env.OUTPUT_DIR || 'output');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function writeOutput(prefix, extension, content, outputName = '') {
  await fs.mkdir(outputDir, { recursive: true });
  const safeName = String(outputName || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').replace(new RegExp(`\\.${extension}$`), '');
  const filename = safeName ? `${safeName}.${extension}` : `${prefix}-${timestamp()}.${extension}`;
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

function extractSpreadsheetId(input) {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || trimmed;
}

async function readJsonBody(request) {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  if (raw.length > 5_000_000) throw new Error('Request body is too large.');
  return JSON.parse(raw || '{}');
}

function loadEnv(filePath) {
  return fs.readFile(filePath, 'utf8').then((text) => {
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }).catch(() => undefined);
}

function getRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/callback`;
}

async function getServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.resolve(appRoot, process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    return JSON.parse(await fs.readFile(keyPath, 'utf8'));
  }
  return null;
}

function hasOAuthClient() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

async function requestToken(body) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Unable to obtain Google access token.');
  return payload;
}

async function getServiceAccountToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  return (await requestToken({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })).access_token;
}

const userTokenPath = path.join(appRoot, '.google-token.json');
const formCachePath = path.join(appRoot, '.form-cache.json');
const presetsPath = path.join(appRoot, '.saved-presets.json');

async function readUserToken() {
  try { return JSON.parse(await fs.readFile(userTokenPath, 'utf8')); } catch { return null; }
}

async function saveUserToken(token) {
  await fs.writeFile(userTokenPath, `${JSON.stringify(token, null, 2)}\n`, 'utf8');
}

async function getUserAccessToken() {
  const token = await readUserToken();
  if (!token) throw new Error('Google user OAuth is not connected. Open /api/auth/google first, then retry.');
  if (token.access_token && token.expires_at && token.expires_at > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error('Google OAuth token is expired and has no refresh token. Reconnect at /api/auth/google.');
  const refreshed = await requestToken({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  });
  const next = { ...token, ...refreshed, refresh_token: refreshed.refresh_token || token.refresh_token, expires_at: Date.now() + (refreshed.expires_in * 1000) };
  await saveUserToken(next);
  return next.access_token;
}

async function getAccessToken() {
  const account = await getServiceAccount();
  if (account) return getServiceAccountToken(account);
  if (hasOAuthClient()) return getUserAccessToken();
  throw new Error('Missing Google credentials. Set service-account credentials or GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.');
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

function mightBeWholeSheetRange(range) {
  const trimmed = String(range || '').trim();
  return Boolean(trimmed) && !/[!:]/.test(trimmed);
}

async function resolveRange(spreadsheetId, range, token) {
  const trimmed = String(range || '').trim();
  if (!mightBeWholeSheetRange(trimmed)) return trimmed;
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`;
  const metadataResponse = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${token}` } });
  const metadata = await metadataResponse.json();
  if (!metadataResponse.ok) throw new Error(metadata.error?.message || 'Unable to fetch sheet metadata.');
  const match = (metadata.sheets || []).map((sheet) => sheet.properties?.title).find((title) => title === trimmed);
  return match ? quoteSheetTitle(match) : trimmed;
}

async function fetchSheetValues(sheetUrl, range) {
  const id = extractSpreadsheetId(sheetUrl);
  const token = await getAccessToken();
  const resolvedRange = await resolveRange(id, range, token);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(resolvedRange)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Unable to fetch sheet values.');
  return payload.values || [];
}

function stripJsonComments(input) {
  return String(input).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseSchemaText(input) {
  const withoutComments = stripJsonComments(input);
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
}

function parseCell(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (/^(true|false)$/i.test(text)) return /^true$/i.test(text);
  if (/^-?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
  return value;
}

function camelCase(value) {
  return String(value || '')
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.charAt(0).toLowerCase() + part.slice(1);
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function resolveKey(key, row) {
  return key.replace(/\[([^\]]+)\]/g, (_match, column) => camelCase(row[column] ?? ''));
}

function buildObject(schema, row, headers, pathParts = []) {
  if (Array.isArray(schema)) return schema.map((item, index) => buildObject(item, row, headers, [...pathParts, String(index)]));
  if (schema && typeof schema === 'object') {
    return Object.fromEntries(Object.entries(schema).map(([key, value]) => [resolveKey(key, row), buildObject(value, row, headers, [...pathParts, key])]));
  }
  if (typeof schema !== 'string') return schema;
  if (!headers.includes(schema)) throw new Error(`Column header not found for schema path "${pathParts.join('.')}": ${schema}`);
  return parseCell(row[schema]);
}

function rowsToJson(values, schema) {
  if (!values.length) throw new Error('The selected range returned no rows.');
  const headers = values[0].map((header) => String(header).trim());
  const namedColumns = headers.map((header, index) => ({ header, index })).filter(({ header }) => header);
  const namedHeaders = namedColumns.map(({ header }) => header);
  return values.slice(1).filter((row) => row.some((cell) => cell !== '')).map((rowValues) => {
    const row = Object.fromEntries(namedColumns.map(({ header, index }) => [header, rowValues[index] ?? '']));
    return buildObject(schema, row, namedHeaders);
  });
}

function getPath(obj, expression) {
  return expression.split('.').reduce((current, part) => current?.[part], obj);
}

function renderMarkdown(data, template) {
  const items = Array.isArray(data) ? data : [data];
  return items.map((item) => template.replace(/{{\s*([^}]+?)\s*}}/g, (_m, expr) => {
    const value = getPath(item, expr.trim());
    return value === null || value === undefined ? '' : String(value);
  })).join('\n\n');
}

async function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

async function serveStatic(request, response) {
  const safePath = request.url === '/' ? '/index.html' : decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
  const filePath = path.normalize(path.join(appRoot, 'public', safePath));
  if (!filePath.startsWith(path.join(appRoot, 'public'))) throw new Error('Invalid path.');
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  response.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  response.end(await fs.readFile(filePath));
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://localhost:${port}`);
    if (request.method === 'GET' && requestUrl.pathname === '/api/auth/google') {
      if (!hasOAuthClient()) throw new Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.');
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: getRedirectUri(),
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        access_type: 'offline',
        prompt: 'consent'
      });
      response.writeHead(302, { Location: authUrl.toString() });
      return response.end();
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/auth/callback') {
      const code = requestUrl.searchParams.get('code');
      if (!code) throw new Error('Missing OAuth code in callback.');
      const token = await requestToken({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code'
      });
      await saveUserToken({ ...token, expires_at: Date.now() + (token.expires_in * 1000) });
      response.writeHead(200, { 'Content-Type': 'text/html' });
      return response.end('<h1>Google Sheets connected.</h1><p>You may close this tab and return to the parser.</p>');
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/form-cache') {
      try {
        const cache = JSON.parse(await fs.readFile(formCachePath, 'utf8'));
        return sendJson(response, 200, { ok: true, cache });
      } catch {
        return sendJson(response, 200, { ok: true, cache: {} });
      }
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/form-cache') {
      const cache = await readJsonBody(request);
      await fs.writeFile(formCachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/presets') {
      try {
        const presets = JSON.parse(await fs.readFile(presetsPath, 'utf8'));
        return sendJson(response, 200, { ok: true, presets });
      } catch {
        return sendJson(response, 200, { ok: true, presets: {} });
      }
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/presets') {
      const { name, values } = await readJsonBody(request);
      const presetName = String(name || '').trim();
      if (!presetName) throw new Error('Preset name is required.');
      let presets = {};
      try { presets = JSON.parse(await fs.readFile(presetsPath, 'utf8')); } catch {}
      presets[presetName] = values && typeof values === 'object' ? values : {};
      await fs.writeFile(presetsPath, `${JSON.stringify(presets, null, 2)}\n`, 'utf8');
      return sendJson(response, 200, { ok: true, presets });
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/run-typescript') {
      const result = await runTypeScriptEntry();
      return sendJson(response, result.ok ? 200 : 400, result);
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/sheet-to-json') {
      const { sheetUrl, range, schemaText, outputName } = await readJsonBody(request);
      if (!sheetUrl || !range || !schemaText) throw new Error('Sheet link, named range, and schema are required.');
      const schema = parseSchemaText(schemaText);
      const json = rowsToJson(await fetchSheetValues(sheetUrl, range), schema);
      const filePath = await writeOutput('sheet-json', 'json', `${JSON.stringify(json, null, 2)}\n`, outputName);
      return sendJson(response, 200, { ok: true, filePath, json });
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/json-to-markdown') {
      const { jsonText, templateText } = await readJsonBody(request);
      if (!jsonText || !templateText) throw new Error('JSON and Markdown template are required.');
      const markdown = renderMarkdown(JSON.parse(jsonText), templateText);
      const filePath = await writeOutput('json-markdown', 'md', markdown.endsWith('\n') ? markdown : `${markdown}\n`);
      return sendJson(response, 200, { ok: true, filePath, markdown });
    }
    if (request.method === 'GET') return serveStatic(request, response);
    return sendJson(response, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    return sendJson(response, 400, { ok: false, error: error.message });
  }
});

await ensureTypeScriptEntry();

server.listen(port, () => {
  console.log(`CSV to Markdown Parser running at http://localhost:${port}`);
  console.log(`Google OAuth connect URL: http://localhost:${port}/api/auth/google`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or set a different PORT in .env.`);
    process.exit(1);
  }
  throw error;
});
