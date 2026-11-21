import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
// Worker is plain JS; Vite serve only.
// @ts-expect-error no types for the Cloudflare Worker entry
import worker from '../worker/index.js';

/**
 * Local Vite stand-in for the Cloudflare Worker session-pin routes so
 * `?session=` and Dashboard POSTs can be exercised without wrangler.
 */
export function sessionPinsPlugin(): Plugin {
  const environment = {
    PLAYER_MAP_PUSH_SECRET: process.env.PLAYER_MAP_PUSH_SECRET ?? 'local-dev-push-secret',
    ASSETS: {
      fetch: async () => new Response('Not found', { status: 404 }),
    },
  };

  return {
    name: 'player-map-session-pins',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://player-map.local');
        const isPins = /^\/api\/session\/[^/]+\/pins$/.test(url.pathname);
        const isHealth = url.pathname === '/api/health';
        if (!isPins && !isHealth) {
          next();
          return;
        }
        try {
          const body = ['POST', 'PUT', 'PATCH'].includes(request.method ?? '')
            ? await readBody(request)
            : undefined;
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (typeof value === 'string') headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(', '));
          }
          const workerRequest = new Request(`https://player-map.local${url.pathname}${url.search}`, {
            method: request.method,
            headers,
            body,
          });
          const workerResponse = await worker.fetch(workerRequest, environment);
          await writeResponse(response, workerResponse);
        } catch (error: unknown) {
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });
    },
  };
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function writeResponse(response: ServerResponse, workerResponse: Response) {
  response.statusCode = workerResponse.status;
  workerResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return;
    response.setHeader(key, value);
  });
  const buffer = Buffer.from(await workerResponse.arrayBuffer());
  response.end(buffer);
}
