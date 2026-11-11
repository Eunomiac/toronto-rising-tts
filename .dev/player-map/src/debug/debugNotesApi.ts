import type { DebugNoteCreate, DebugNoteFile, DebugNotePatch } from './types';

async function request(method = 'GET', query = '', body?: unknown): Promise<DebugNoteFile> {
  const response = await fetch(`/api/debug-notes${query}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json() as DebugNoteFile | { error?: string };
  if (!response.ok) {
    throw new Error('error' in result && result.error ? result.error : `Debug notes request failed (${response.status}).`);
  }
  return result as DebugNoteFile;
}

export const listDebugNotes = () => request();
export const addDebugNote = (note: DebugNoteCreate) => request('POST', '', note);
export const patchDebugNote = (id: number, patch: DebugNotePatch) => request('PATCH', `?id=${id}`, patch);
export const deleteDebugNote = (id: number) => request('DELETE', `?id=${id}`);
