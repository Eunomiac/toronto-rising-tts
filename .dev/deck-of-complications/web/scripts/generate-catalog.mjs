/**
 * Build public/data/catalog.json from lib/complications_catalog.ttslua
 * and the on-disk card image filenames.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../../..");
const catalogLua = path.join(repoRoot, "lib/complications_catalog.ttslua");
const cardsDir = path.resolve(root, "../assets/cards");
const outDir = path.join(root, "public/data");
const outFile = path.join(outDir, "catalog.json");

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseLuaCatalog(text) {
  const cards = [];
  const entryRe =
    /\[(\d+)\]\s*=\s*\{\s*name\s*=\s*"([^"]*)"\s*,\s*category\s*=\s*"([^"]*)"\s*,\s*rarity\s*=\s*"([^"]*)"([\s\S]*?)\},\s*(?=\n\s*\[|\n\})/g;
  let match;
  while ((match = entryRe.exec(text))) {
    const index = Number(match[1]);
    const name = match[2];
    const category = match[3];
    const rarity = match[4];
    const body = match[5];
    const valueMatch = body.match(/value\s*=\s*("X"|-?\d+)/);
    const pauseMatch = body.match(/requiresPause\s*=\s*(true|false)/);
    const rollTypes = {
      standard: /standard\s*=\s*true/.test(body),
      discipline: /discipline\s*=\s*true/.test(body),
      willpowerRoll: /willpowerRoll\s*=\s*true/.test(body),
      launch: /launch\s*=\s*true/.test(body),
      goal: /goal\s*=\s*true/.test(body),
    };
    let value = valueMatch ? valueMatch[1] : "0";
    if (value !== '"X"') value = Number(value);
    else value = "X";
    cards.push({
      index,
      name,
      category,
      rarity,
      value,
      requiresPause: pauseMatch ? pauseMatch[1] === "true" : true,
      rollTypes,
      imageStem: `${String(index).padStart(2, "0")}-${slugify(name)}`,
    });
  }
  return cards.sort((a, b) => a.index - b.index);
}

function verifyImages(cards) {
  const missing = [];
  for (const card of cards) {
    const base = path.join(cardsDir, `${card.imageStem}.webp`);
    const enhanced = path.join(cardsDir, `${card.imageStem}_enhanced.webp`);
    if (!fs.existsSync(base)) missing.push(path.basename(base));
    if (!fs.existsSync(enhanced)) missing.push(path.basename(enhanced));
  }
  if (missing.length) {
    throw new Error(`Missing card images:\n${missing.slice(0, 20).join("\n")}`);
  }
}

const lua = fs.readFileSync(catalogLua, "utf8");
const cards = parseLuaCatalog(lua);
if (cards.length !== 66) {
  throw new Error(`Expected 66 cards, got ${cards.length}`);
}
verifyImages(cards);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      cards,
    },
    null,
    2,
  ),
);
console.log(`Wrote ${cards.length} cards to ${path.relative(root, outFile)}`);
