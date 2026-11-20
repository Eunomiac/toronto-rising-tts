import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'data/orientation-streets.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public/generated/map-data-manifest.json'), 'utf8'));
const [[west, south], [east, north]] = manifest.bounds;
const pad = 0.012;
const bbox = `${south - pad},${west - pad},${north + pad},${east + pad}`;
const names = config.streets.flatMap((street) => street.matchNames);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = `^(${names.map(escapeRegExp).join('|')})$`;
const query = [
  '[out:json][timeout:90];',
  `way["name"~"${pattern}"](${bbox});`,
  'out geom;',
].join('\n');

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'user-agent': 'TorontoRisingPlayerMap/0.1 (private campaign map)',
  },
  body: new URLSearchParams({ data: query }),
});
if (!response.ok) {
  const detail = (await response.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  throw new Error(`Overpass request failed (${response.status} ${response.statusText}): ${detail}`);
}
const result = await response.json();
if (!Array.isArray(result.elements) || result.remark) {
  throw new Error(`Overpass returned an invalid result${result.remark ? `: ${result.remark}` : ''}`);
}
const snapshot = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  osmTimestamp: result.osm3s?.timestamp_osm_base ?? null,
  endpoint: 'https://overpass-api.de/api/interpreter',
  bbox,
  query,
  elements: result.elements,
};
const outputPath = path.join(root, 'data/source/orientation-streets-osm.json');
await fs.writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8');
console.log(`Saved ${result.elements.length} orientation-street ways to ${path.relative(root, outputPath)}.`);
