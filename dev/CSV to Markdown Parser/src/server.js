import fs from 'node:fs/promises';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');
await loadEnv(path.join(appRoot, '.env'));
const port = Number(process.env.PORT || 3100);
const outputDir = path.join(os.homedir(), 'output');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function writeOutput(prefix, extension, content) {
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${prefix}-${timestamp()}.${extension}`;
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

async function getServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.resolve(appRoot, process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    return JSON.parse(await fs.readFile(keyPath, 'utf8'));
  }
  throw new Error('Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_JSON in .env.');
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken() {
  const account = await getServiceAccount();
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
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Unable to obtain Google access token.');
  return payload.access_token;
}

async function fetchSheetValues(sheetUrl, range) {
  const id = extractSpreadsheetId(sheetUrl);
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Unable to fetch sheet values.');
  return payload.values || [];
}

function stripJsonComments(input) {
  return String(input).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
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
  const headers = values[0].map(String);
  const missingHeader = headers.find((header) => !header.trim());
  if (missingHeader !== undefined) throw new Error('The header row contains an empty column header.');
  return values.slice(1).filter((row) => row.some((cell) => cell !== '')).map((rowValues) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? '']));
    return buildObject(schema, row, headers);
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
    if (request.method === 'POST' && request.url === '/api/sheet-to-json') {
      const { sheetUrl, range, schemaText } = await readJsonBody(request);
      if (!sheetUrl || !range || !schemaText) throw new Error('Sheet link, named range, and schema are required.');
      const schema = JSON.parse(stripJsonComments(schemaText));
      const json = rowsToJson(await fetchSheetValues(sheetUrl, range), schema);
      const filePath = await writeOutput('sheet-json', 'json', `${JSON.stringify(json, null, 2)}\n`);
      return sendJson(response, 200, { ok: true, filePath, json });
    }
    if (request.method === 'POST' && request.url === '/api/json-to-markdown') {
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

server.listen(port, () => console.log(`CSV to Markdown Parser running at http://localhost:${port}`));
