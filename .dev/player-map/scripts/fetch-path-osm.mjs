import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'data/path-network.json');
const outputPath = path.join(root, 'data/source/osm-path-snapshot.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const { south, west, north, east } = config.bounds;
const bbox = `${south},${west},${north},${east}`;
const highwayPattern = `^(${config.routeHighways.join('|')})$`;
const route = (filter) => `way["highway"~"${highwayPattern}"]${filter}(${bbox});`;
const query = [
  '[out:json][timeout:180];',
  '(',
  route('["indoor"]'),
  route('["tunnel"]'),
  route('["covered"="yes"]'),
  route('["level"~"(^|;)-[0-9]"]'),
  route('["layer"~"^-[0-9]"]'),
  `way["indoor"="corridor"](${bbox});`,
  `node["railway"="subway_entrance"](${bbox});`,
  `node["highway"="elevator"](${bbox});`,
  `node["entrance"]["level"~"(^|;)-[0-9]"](${bbox});`,
  ');',
  'out meta geom;',
].join('\n');

const response = await fetch(config.endpoint, {
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
  endpoint: config.endpoint,
  query,
  elements: result.elements,
};
await fs.writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8');
console.log(`Saved ${result.elements.length} PATH candidates to ${path.relative(root, outputPath)}.`);
