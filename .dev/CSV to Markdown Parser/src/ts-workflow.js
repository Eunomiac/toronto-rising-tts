import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');

export const tsRoot = path.resolve(appRoot, process.env.TS_DIR || 'ts');
export const mdRoot = path.resolve(appRoot, process.env.MD_DIR || 'md');
export const entryPath = path.join(tsRoot, 'entry.ts');
export const compiledPath = path.join(tsRoot, 'entry.js');

const entryTemplate = `import fs from 'node:fs';
import path from 'node:path';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }
interface Record extends JsonObject {}

const appRoot: string = process.env.CSV_TO_MARKDOWN_APP_ROOT ?? path.resolve(import.meta.dirname, '..');
const outputRoot: string = path.resolve(appRoot, process.env.OUTPUT_DIR ?? 'output');
const markdownRoot: string = path.resolve(appRoot, process.env.MD_DIR ?? 'md');

/**
 * Reads an output JSON file and returns its parsed array of object literals.
 *
 * @param target - The output JSON filename without the ".json" suffix.
 * @returns The parsed JSON data as an array of object literals.
 * @throws If the file cannot be read, the JSON cannot be parsed, or the root JSON value is not an array.
 */
export function processOutputJSON(target: string): Record[] {
  const filePath = path.join(outputRoot, target.endsWith('.json') ? target : target + '.json');
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Expected ' + filePath + ' to contain a JSON array.');
  return parsed as Record[];
}

/**
 * Writes a Markdown file beneath the markdown root, overwriting any existing file.
 *
 * @param filePath - Relative path from the markdown root, without the ".md" suffix.
 * @param content - Markdown content to write.
 * @throws If filePath is absolute or attempts to escape the markdown root.
 */
export function outputMarkdownFile(filePath: string, content: string): void {
  const relativePath = filePath.endsWith('.md') ? filePath : filePath + '.md';
  if (path.isAbsolute(relativePath)) throw new Error('filePath must be relative to the markdown root.');
  const targetPath = path.resolve(markdownRoot, relativePath);
  if (!targetPath.startsWith(markdownRoot + path.sep) && targetPath !== markdownRoot) {
    throw new Error('filePath cannot escape the markdown root.');
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
}

/**
 * Deletes all files and folders beneath the markdown root.
 */
export function purgeMarkdownFiles(): void {
  fs.rmSync(markdownRoot, { recursive: true, force: true });
  fs.mkdirSync(markdownRoot, { recursive: true });
}

/**
 * Main generation hook. Edit this function while iterating on Markdown output.
 */
function main(): void {
  // Example:
  // const records = processOutputJSON('mySavedJsonName');
  // purgeMarkdownFiles();
  // for (const record of records) {
  //   outputMarkdownFile(String(record.name ?? 'untitled'), '# ' + String(record.name ?? 'Untitled') + '\\n');
  // }
}

main();
`;

export async function ensureTypeScriptEntry() {
  await fs.mkdir(tsRoot, { recursive: true });
  await fs.mkdir(mdRoot, { recursive: true });
  try {
    await fs.access(entryPath);
  } catch {
    await fs.writeFile(entryPath, entryTemplate, 'utf8');
  }
  return entryPath;
}

export async function compileTypeScriptEntry() {
  await ensureTypeScriptEntry();
  const source = await fs.readFile(entryPath, 'utf8');
  const compiled = stripTypeScriptTypes(source, { mode: 'strip' });
  await fs.writeFile(compiledPath, compiled, 'utf8');
  return { ok: true, entryPath, compiledPath };
}

export async function runTypeScriptEntry() {
  await ensureTypeScriptEntry();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entryPath], {
      cwd: appRoot,
      env: { ...process.env, CSV_TO_MARKDOWN_APP_ROOT: appRoot, MD_DIR: mdRoot },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr, entryPath, mdRoot }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'run';
  const result = command === 'init'
    ? await ensureTypeScriptEntry().then((entry) => ({ ok: true, entryPath: entry, mdRoot }))
    : command === 'compile'
      ? await compileTypeScriptEntry()
      : await runTypeScriptEntry();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(result.code || 1);
}
