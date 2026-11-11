import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const forbidden = [
  '/api/debug-notes',
  'Debug notes',
  'What should change here?',
  'debug-notes.json',
  'debug-note-pin',
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}

const outputFiles = await files(dist);
const leakedFile = outputFiles.find((file) => /debug-notes\.json$/i.test(file));
if (leakedFile) throw new Error(`Production output contains the development note file: ${leakedFile}`);

for (const file of outputFiles.filter((candidate) => /\.(?:html|js|css|map)$/i.test(candidate))) {
  const content = await readFile(file, 'utf8');
  const match = forbidden.find((value) => content.includes(value));
  if (match) throw new Error(`Production output ${file} contains development-only debug-note content: ${match}`);
}

console.log(`Production debug boundary passed (${outputFiles.length} files inspected).`);
