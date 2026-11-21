const memoryStore = new Map();
const PIN_TTL_SECONDS = 60 * 60 * 24;
const ALLOWED_CHAR_KEYS = new Set([
  'fomorach',
  'rashid',
  'lordLucien',
  'aishe',
  'blackCaesar',
]);

function json(status, body, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      ...headers,
    },
  });
}

function storageConfigured(environment) {
  return Boolean(environment.SESSION_PINS || environment.PLAYER_MAP_PUSH_SECRET);
}

async function readPins(environment, sessionCode) {
  const key = `pins:${sessionCode}`;
  if (environment.SESSION_PINS) {
    const raw = await environment.SESSION_PINS.get(key, { type: 'json' });
    return raw ?? null;
  }
  return memoryStore.get(key) ?? null;
}

async function writePins(environment, sessionCode, snapshot) {
  const key = `pins:${sessionCode}`;
  if (environment.SESSION_PINS) {
    await environment.SESSION_PINS.put(key, JSON.stringify(snapshot), { expirationTtl: PIN_TTL_SECONDS });
    return;
  }
  memoryStore.set(key, snapshot);
}

function validateSnapshot(body, sessionCode) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Body must be an object';
  if (body.schemaVersion !== 1) return 'schemaVersion must be 1';
  if (body.sessionCode !== sessionCode) return 'sessionCode mismatch';
  if (typeof body.updatedAt !== 'string' || !body.updatedAt) return 'updatedAt is required';
  if (typeof body.live !== 'boolean') return 'live must be a boolean';
  if (!Array.isArray(body.pins)) return 'pins must be an array';
  for (const pin of body.pins) {
    if (!pin || typeof pin !== 'object') return 'Each pin must be an object';
    if (!ALLOWED_CHAR_KEYS.has(pin.charKey)) return `Unsupported charKey ${String(pin.charKey)}`;
    if (typeof pin.siteKey !== 'string' || !pin.siteKey) return 'Each pin needs a siteKey';
    if (typeof pin.visible !== 'boolean') return 'Each pin needs visible';
    const keys = Object.keys(pin).sort();
    if (keys.join(',') !== 'charKey,siteKey,visible') return 'Unexpected pin fields';
  }
  const allowed = ['live', 'pins', 'schemaVersion', 'sessionCode', 'updatedAt'].sort();
  if ([...Object.keys(body)].sort().join(',') !== allowed.join(',')) return 'Unexpected snapshot fields';
  return null;
}

export default {
  async fetch(request, environment) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return json(204, null);
    }
    if (url.pathname === '/api/health') {
      return json(200, {
        ok: true,
        service: 'toronto-rising-player-map',
        storage: storageConfigured(environment) ? 'configured' : 'not-configured',
      });
    }

    const match = url.pathname.match(/^\/api\/session\/([^/]+)\/pins$/);
    if (!match) {
      return environment.ASSETS.fetch(request);
    }
    const sessionCode = decodeURIComponent(match[1] ?? '');
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(sessionCode)) {
      return json(400, { error: 'Invalid session code' });
    }

    if (request.method === 'GET') {
      const snapshot = await readPins(environment, sessionCode);
      if (!snapshot) return json(404, { error: 'No pins for this session' });
      return json(200, snapshot);
    }

    if (request.method === 'POST') {
      const secret = environment.PLAYER_MAP_PUSH_SECRET;
      if (!secret) return json(503, { error: 'Push secret is not configured' });
      const auth = request.headers.get('Authorization') ?? '';
      if (auth !== `Bearer ${secret}`) return json(401, { error: 'Unauthorized' });
      let body;
      try {
        body = await request.json();
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }
      const error = validateSnapshot(body, sessionCode);
      if (error) return json(400, { error });
      await writePins(environment, sessionCode, body);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  },
};
