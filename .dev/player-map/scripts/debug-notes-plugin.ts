import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  createDebugNoteStore,
  DebugNoteError,
  parseDebugNoteCreate,
  parseDebugNotePatch,
} from './debug-note-store.ts';

const API_PATH = '/api/debug-notes';

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64_000) throw new DebugNoteError('The note request is too large.', 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new DebugNoteError('The note request must be valid JSON.', 400);
  }
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function noteId(url: URL): number | null {
  const raw = url.searchParams.get('id');
  if (raw === null) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function debugNotesPlugin(root: string): Plugin {
  const configuredPath = process.env.PLAYER_MAP_DEBUG_NOTES_FILE;
  const filePath = configuredPath
    ? path.resolve(root, configuredPath)
    : path.join(root, 'agent', 'debug-notes.json');
  const store = createDebugNoteStore(filePath);

  return {
    name: 'player-map-debug-notes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://player-map.local');
        if (url.pathname !== API_PATH) {
          next();
          return;
        }
        try {
          if (request.method === 'GET') return send(response, 200, await store.list());
          if (request.method === 'POST') return send(response, 201, await store.add(parseDebugNoteCreate(await readJson(request))));
          const id = noteId(url);
          if (id === null) throw new DebugNoteError('A valid note id is required.', 400);
          if (request.method === 'PATCH') return send(response, 200, await store.update(id, parseDebugNotePatch(await readJson(request))));
          if (request.method === 'DELETE') return send(response, 200, await store.remove(id));
          response.setHeader('Allow', 'GET, POST, PATCH, DELETE');
          return send(response, 405, { error: 'Method not allowed.' });
        } catch (error: unknown) {
          const status = error instanceof DebugNoteError ? error.status : 500;
          const message = error instanceof Error ? error.message : String(error);
          return send(response, status, { error: message });
        }
      });
    },
  };
}
