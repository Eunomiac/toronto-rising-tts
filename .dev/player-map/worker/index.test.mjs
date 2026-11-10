import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

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
