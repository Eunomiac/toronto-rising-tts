import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const assets = {
  fetch: () => {
    throw new Error('Static assets should not be consulted');
  },
};

test('health route proves the reserved Worker API boundary', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/health'), {
    ASSETS: { fetch: () => { throw new Error('Static assets should not be consulted'); } },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'toronto-rising-player-map',
    storage: 'not-configured',
  });
});

test('non-API requests fall through to static assets', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), {
    ASSETS: { fetch: () => new Response('player map') },
  });
  assert.equal(await response.text(), 'player map');
});

test('POST pins requires the push secret and stores an allowlisted snapshot', async () => {
  const environment = { ASSETS: assets, PLAYER_MAP_PUSH_SECRET: 'table-secret' };
  const snapshot = {
    schemaVersion: 1,
    sessionCode: 'nightly1',
    updatedAt: '2026-11-21T12:00:00.000Z',
    live: true,
    pins: [{ charKey: 'rashid', siteKey: 'CasaLoma', visible: true }],
  };
  const denied = await worker.fetch(
    new Request('https://example.test/api/session/nightly1/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }),
    environment,
  );
  assert.equal(denied.status, 401);

  const posted = await worker.fetch(
    new Request('https://example.test/api/session/nightly1/pins', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer table-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    }),
    environment,
  );
  assert.equal(posted.status, 200);

  const got = await worker.fetch(
    new Request('https://example.test/api/session/nightly1/pins'),
    environment,
  );
  assert.equal(got.status, 200);
  assert.deepEqual(await got.json(), snapshot);
});

test('POST pins rejects unexpected fields', async () => {
  const environment = { ASSETS: assets, PLAYER_MAP_PUSH_SECRET: 'table-secret' };
  const response = await worker.fetch(
    new Request('https://example.test/api/session/nightly1/pins', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer table-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schemaVersion: 1,
        sessionCode: 'nightly1',
        updatedAt: '2026-11-21T12:00:00.000Z',
        live: true,
        pins: [{ charKey: 'rashid', siteKey: 'CasaLoma', visible: true, steamId: 'x' }],
      }),
    }),
    environment,
  );
  assert.equal(response.status, 400);
});
