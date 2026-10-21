import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGenericNpcCatalog } from "../../src/server/genericNpcCatalog.ts";
import { loadMemoriamNpcCatalog } from "../../src/server/memoriamNpcCatalog.ts";
import { isEmptyNpcOverride, NPC_OVERRIDE_KEY_PATTERN, parseNpcOverride, type NpcOverride } from "../../src/shared/npcOverride.ts";
import { drawToken, loadFont, type DrawAssets } from "./draw.ts";
import {
  buildSubject,
  discrepancyReport,
  fingerprint,
  renderLuaModule,
  renderOverridesLuaModule,
  type HeadCrop,
  type MemoriamArtEntry,
  type NamedCatalogEntry,
  type NameSources,
  type NpcArtLinks,
  type NpcArtSubject,
  type NpcFolder,
  type Roster
} from "./model.ts";

/**
 * NPC art for TTS, in two steps around npm run cloud-asset-sync (npm run build:full runs all three in order):
 *
 * npm run npc-art:draw — one figurine per NPC at assets/NPC Art/Figurines/{Catalogued,Generic,Memoriam}/npc_<key>.webp.
 * Each figurine whose key is in its folder's catalog gets a spotlight token (both sides) at
 * assets/NPC Art/Tokens/npcToken_<key>.{front,back}.webp; tokens whose inputs are unchanged are skipped (--force redraws
 * all). Also writes lib/npc_overrides.ttslua (the TTS half of data/npc-overrides.json) and the discrepancy list
 * .dev/build-logs/npc-art-discrepancies.txt (figurines in no catalog, catalogued NPCs without a figurine).
 *
 * npm run npc-art:urls — reads the Steam Cloud links cloud-asset-sync recorded in lib/json/cloud-assets.json and writes
 * lib/npc_art_urls.ttslua (generic rows also carry their default label from data/generic-npcs.json, which is how TTS
 * learns the generic catalog). The roll-banner rows (rollFigure_<key>) are cloud-asset-sync jobs, not written here.
 */

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const ART_REL = "NPC Art";
const artDir = path.join(repoRoot, "assets", ART_REL);
const tokenDir = path.join(artDir, "Tokens");
const templateDir = path.join(scriptDir, "token-template");
const tokenCachePath = path.join(repoRoot, ".cache", "npc-tokens.json");
const cloudManifestPath = path.join(repoRoot, "lib", "json", "cloud-assets.json");
const luaPath = path.join(repoRoot, "lib", "npc_art_urls.ttslua");
const overridesLuaPath = path.join(repoRoot, "lib", "npc_overrides.ttslua");
const discrepancyPath = path.join(repoRoot, ".dev", "build-logs", "npc-art-discrepancies.txt");
const dataDir = path.join(dashboardDir, "data");
const FOLDERS: readonly NpcFolder[] = ["Catalogued", "Generic", "Memoriam"];
const FIGURINE_BACK_REL = `${ART_REL}/Shared/npcFigurineBack.webp`;
const GENERATED_BY = ".dev/storyteller-dashboard/scripts/npc-art/generate.ts (npm run npc-art:draw / npc-art:urls)";
const KEY_PATTERN = /^[A-Za-z0-9_]+$/;
const FIGURINE_FILE = /^npc_(.+)\.webp$/;
const TOKEN_FILE = /^npcToken_(.+?)(?:\.tier_([a-z]+))?\.(front|back)\.webp$/;
const CONCURRENCY = 4;

const figurineRel = (folder: NpcFolder, key: string): string => `${ART_REL}/Figurines/${folder}/npc_${key}.webp`;
const tokenRel = (key: string, side: "front" | "back"): string => `${ART_REL}/Tokens/npcToken_${key}.${side}.webp`;
const abs = (rel: string): string => path.join(repoRoot, "assets", rel);

type TokenCache = Record<string, string>;
type CloudRow = { readonly url: string; readonly sha1: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async (file: string): Promise<unknown> => JSON.parse(await readFile(file, "utf8")) as unknown;

const readOptionalJson = async (file: string, what: string): Promise<unknown> => {
  if (!existsSync(file)) {
    console.warn(`[npc-art] ${path.relative(repoRoot, file)} not found; ${what}.`);
    return undefined;
  }
  return readJson(file);
};

const readNamedCatalog = async (): Promise<Map<string, NamedCatalogEntry>> => {
  const file = path.join(dataDir, "scene-catalogs.json");
  if (!existsSync(file)) {
    throw new Error(`${path.relative(repoRoot, file)} is missing. Run npm run dashboard:scene-catalogs first.`);
  }
  const catalogs = await readJson(file);
  if (!isRecord(catalogs) || !Array.isArray(catalogs.namedNpcs) || !Array.isArray(catalogs.pcs)) {
    throw new Error("scene-catalogs.json has no namedNpcs / pcs lists. Regenerate it with npm run dashboard:scene-catalogs.");
  }
  const named = new Map<string, NamedCatalogEntry>();
  for (const row of [...catalogs.pcs, ...catalogs.namedNpcs] as unknown[]) {
    if (isRecord(row) && typeof row.characterKey === "string" && typeof row.fullName === "string") {
      const pickerGroups = Array.isArray(row.pickerGroups) ? row.pickerGroups.filter((group): group is string => typeof group === "string") : [];
      named.set(row.characterKey, { characterKey: row.characterKey, fullName: row.fullName, pickerGroups });
    }
  }
  return named;
};

const readGenericLabels = async (): Promise<Map<string, string>> => {
  const { npcs } = await loadGenericNpcCatalog(path.join(dataDir, "generic-npcs.json"));
  if (npcs.length === 0) {
    throw new Error("data/generic-npcs.json lists no generic NPCs. Run npm run generic-npcs:import.");
  }
  return new Map(npcs.map((npc) => [npc.key, npc.label]));
};

const readMemoriamNames = async (): Promise<Map<string, MemoriamArtEntry>> => {
  const { npcs } = await loadMemoriamNpcCatalog(path.join(dataDir, "memoriam-npcs.json"));
  if (npcs.length === 0) {
    throw new Error("data/memoriam-npcs.json lists no Memoriam NPCs. Run npm run memoriam-npcs:import.");
  }
  return new Map(npcs.map((npc) => [npc.key, { label: npc.label, isGeneric: npc.isGeneric }]));
};

/** Ring colours come from the roster layout in data/npc-roster.json, which the dashboard's roster tab writes. */
const readRoster = async (): Promise<Roster> => {
  const file = await readJson(path.join(dataDir, "npc-roster.json"));
  const roster = isRecord(file) ? file.layout : undefined;
  if (!isRecord(roster) || !Array.isArray(roster.categories) || !isRecord(roster.assigned) || !isRecord(roster.groupColors)) {
    throw new Error("data/npc-roster.json has no roster layout (categories, assigned, groupColors).");
  }
  const strings = (value: unknown): Record<string, string> =>
    isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  const categories = roster.categories.flatMap((row: unknown) =>
    isRecord(row) && typeof row.id === "string" && typeof row.color === "string" ? [{ id: row.id, color: row.color }] : []);
  return { categories, assigned: strings(roster.assigned), groupColors: strings(roster.groupColors) };
};

const readCrops = async (): Promise<Record<string, HeadCrop>> => {
  const file = await readOptionalJson(path.join(dataDir, "headshot-crops.json"), "every token uses the automatic head crop");
  const crops: Record<string, HeadCrop> = {};
  if (isRecord(file) && isRecord(file.crops)) {
    for (const [key, crop] of Object.entries(file.crops)) {
      if (isRecord(crop) && typeof crop.cx === "number" && typeof crop.cy === "number" && typeof crop.size === "number") {
        crops[key] = { cx: crop.cx, cy: crop.cy, size: crop.size };
      }
    }
  }
  return crops;
};

const readOverrides = async (): Promise<Record<string, NpcOverride>> => {
  const file = await readOptionalJson(path.join(dataDir, "npc-overrides.json"), "no NPC has a name, colour, card scale or seated height override");
  const overrides: Record<string, NpcOverride> = {};
  if (isRecord(file) && isRecord(file.overrides)) {
    for (const [key, value] of Object.entries(file.overrides)) {
      const override = parseNpcOverride(value);
      if (!NPC_OVERRIDE_KEY_PATTERN.test(key) || typeof override === "string") {
        throw new Error(`data/npc-overrides.json: bad override for "${key}": ${typeof override === "string" ? override : "invalid key"}`);
      }
      if (!isEmptyNpcOverride(override)) {
        overrides[key] = override;
      }
    }
  }
  return overrides;
};

const readTokenCache = async (): Promise<TokenCache> => {
  if (!existsSync(tokenCachePath)) {
    return {};
  }
  const file = await readJson(tokenCachePath);
  return isRecord(file) ? Object.fromEntries(Object.entries(file).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
};

const listFigurines = async (folder: NpcFolder): Promise<string[]> => {
  const dir = path.join(artDir, "Figurines", folder);
  if (!existsSync(dir)) {
    throw new Error(`${path.relative(repoRoot, dir)} is missing. NPC figurines live in assets/NPC Art/Figurines/<folder>/npc_<key>.webp.`);
  }
  const keys: string[] = [];
  for (const file of await readdir(dir)) {
    const match = FIGURINE_FILE.exec(file);
    if (!match) {
      throw new Error(`assets/${ART_REL}/Figurines/${folder}/${file}: figurine files must be named npc_<key>.webp.`);
    }
    keys.push(match[1]!);
  }
  return keys.sort();
};

const runPool = async <T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> => {
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next]!;
      next += 1;
      await worker(item);
    }
  });
  await Promise.all(lanes);
};

type Subjects = {
  readonly subjects: NpcArtSubject[];
  readonly uncatalogued: string[];
  readonly genericLabels: Map<string, string>;
  readonly withoutFigurine: string[];
  readonly overrides: Record<string, NpcOverride>;
};

const loadSubjects = async (): Promise<Subjects> => {
  const [named, genericLabels, memoriamNames, roster, crops, overrides] = await Promise.all([
    readNamedCatalog(),
    readGenericLabels(),
    readMemoriamNames(),
    readRoster(),
    readCrops(),
    readOverrides()
  ]);
  const sources: NameSources = { named, genericLabels, memoriamNames };
  const subjects: NpcArtSubject[] = [];
  const uncatalogued: string[] = [];
  const seen = new Map<string, NpcFolder>();
  for (const folder of FOLDERS) {
    for (const key of await listFigurines(folder)) {
      if (!KEY_PATTERN.test(key)) {
        throw new Error(`${figurineRel(folder, key)}: the key after npc_ must be letters, digits and underscores.`);
      }
      const other = seen.get(key);
      if (other) {
        throw new Error(`NPC key "${key}" has a figurine in both ${other}/ and ${folder}/.`);
      }
      seen.set(key, folder);
      const subject = buildSubject(folder, key, sources, roster, crops, overrides);
      if (subject === null) {
        uncatalogued.push(`${folder}/${key}`);
      } else {
        subjects.push(subject);
      }
    }
  }
  const withoutFigurine = FOLDERS.flatMap((folder) => {
    const keys = folder === "Catalogued" ? named.keys() : folder === "Generic" ? genericLabels.keys() : memoriamNames.keys();
    const missing = [...keys].filter((key) => !seen.has(key)).sort();
    return missing.length > 0 ? [`${folder}: ${missing.join(", ")}`] : [];
  });
  return { subjects, uncatalogued, genericLabels, withoutFigurine, overrides };
};

const draw = async (force: boolean): Promise<void> => {
  const [{ subjects, uncatalogued, withoutFigurine, overrides }, cache] = await Promise.all([loadSubjects(), readTokenCache()]);
  const [ringLit, ringDark, fontBytes, drawSource, modelSource] = await Promise.all([
    readFile(path.join(templateDir, "ring-lit.svg"), "utf8"),
    readFile(path.join(templateDir, "ring-dark.svg"), "utf8"),
    readFile(path.join(dashboardDir, "assets", "fonts", "BebasNeue", "BebasNeue Regular.ttf")),
    readFile(path.join(scriptDir, "draw.ts")),
    readFile(path.join(scriptDir, "model.ts"))
  ]);
  const assets: DrawAssets = { ...loadFont(fontBytes), ringLit, ringDark };
  const styleHash = fingerprint(ringLit, ringDark, fontBytes, drawSource, modelSource);

  await mkdir(tokenDir, { recursive: true });
  const nextCache: TokenCache = {};
  let drawn = 0;
  const autoCropped: string[] = [];
  await runPool(subjects, async (subject) => {
    const figurine = await readFile(abs(figurineRel(subject.folder, subject.key)));
    const tokenHash = fingerprint(styleHash, fingerprint(figurine), subject.name, subject.color, JSON.stringify(subject.manualCrop));
    const frontFile = abs(tokenRel(subject.key, "front"));
    const backFile = abs(tokenRel(subject.key, "back"));
    const current = !force && cache[subject.key] === tokenHash && existsSync(frontFile) && existsSync(backFile);
    if (!current) {
      const token = await drawToken(figurine, subject.name, subject.color, subject.manualCrop, assets).catch((error: unknown) => {
        throw new Error(`Drawing the token for ${subject.folder}/${subject.key} failed: ${error instanceof Error ? error.message : String(error)}`);
      });
      await Promise.all([
        writeFile(frontFile, token.front),
        writeFile(backFile, token.back)
      ]);
      drawn += 1;
      if (token.autoCrop) {
        autoCropped.push(subject.key);
      }
    }
    nextCache[subject.key] = tokenHash;
  });

  const keys = new Set(subjects.map((subject) => subject.key));
  let pruned = 0;
  for (const file of await readdir(tokenDir)) {
    const match = TOKEN_FILE.exec(file);
    if (match && (!keys.has(match[1]!) || match[2] !== undefined)) {
      await rm(path.join(tokenDir, file));
      pruned += 1;
    }
  }

  await mkdir(path.dirname(tokenCachePath), { recursive: true });
  const sortedCache = Object.fromEntries(Object.entries(nextCache).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(tokenCachePath, `${JSON.stringify(sortedCache, null, 2)}\n`);
  await writeFile(overridesLuaPath, renderOverridesLuaModule(overrides, GENERATED_BY));

  console.log(
    `[npc-art] ${subjects.length} NPCs: ${drawn} token(s) drawn, ${subjects.length - drawn} unchanged, ${pruned} stale token file(s) removed.`
  );
  if (autoCropped.length > 0) {
    console.log(`[npc-art] ${autoCropped.length} drawn token(s) used the automatic head crop (set a crop in the dashboard to override).`);
  }

  const report = discrepancyReport(uncatalogued, withoutFigurine);
  await mkdir(path.dirname(discrepancyPath), { recursive: true });
  await writeFile(discrepancyPath, report);
  console.warn(report.trimEnd());
};

/** Steam Cloud link of every file cloud-asset-sync owns, keyed by its path under assets/. */
const readCloudRows = async (): Promise<Map<string, CloudRow>> => {
  if (!existsSync(cloudManifestPath)) {
    throw new Error(`${path.relative(repoRoot, cloudManifestPath)} is missing. Run npm run cloud-asset-sync first.`);
  }
  const manifest = await readJson(cloudManifestPath);
  const rows = new Map<string, CloudRow>();
  const jobs = isRecord(manifest) && isRecord(manifest.jobs) ? manifest.jobs : {};
  for (const job of Object.values(jobs)) {
    for (const row of isRecord(job) && Array.isArray(job.rows) ? job.rows : []) {
      if (isRecord(row) && typeof row.path === "string" && typeof row.url === "string" && typeof row.sha1 === "string") {
        rows.set(row.path, { url: row.url, sha1: row.sha1 });
      }
    }
  }
  return rows;
};

const sha1Of = async (file: string): Promise<string> => createHash("sha1").update(await readFile(file)).digest("hex").toUpperCase();

const urls = async (): Promise<void> => {
  const [{ subjects, genericLabels }, cloud] = await Promise.all([loadSubjects(), readCloudRows()]);
  const notInCloud: string[] = [];
  const outdated: string[] = [];
  const link = async (rel: string): Promise<string | null> => {
    const row = cloud.get(rel);
    if (!row) {
      notInCloud.push(rel);
      return null;
    }
    if (existsSync(abs(rel)) && (await sha1Of(abs(rel))) !== row.sha1) {
      outdated.push(rel);
    }
    return row.url;
  };

  const back = await link(FIGURINE_BACK_REL);
  if (back === null) {
    throw new Error(`assets/${FIGURINE_BACK_REL} has no Steam Cloud link in lib/json/cloud-assets.json. Run npm run cloud-asset-sync (TTS closed).`);
  }
  const links = new Map<string, NpcArtLinks>();
  const missingNpcs: string[] = [];
  await runPool(subjects, async (subject) => {
    const [figurineFront, tokenFront, tokenBack] = await Promise.all([
      link(figurineRel(subject.folder, subject.key)),
      link(tokenRel(subject.key, "front")),
      link(tokenRel(subject.key, "back"))
    ]);
    if (figurineFront === null || tokenFront === null || tokenBack === null) {
      missingNpcs.push(subject.key);
      return;
    }
    links.set(subject.key, {
      figurineFront,
      tokenFront,
      tokenBack,
      ...(subject.folder === "Generic" ? { genericLabel: genericLabels.get(subject.key)! } : {})
    });
  });

  await writeFile(luaPath, renderLuaModule(back, links, GENERATED_BY));
  console.log(`[npc-art] Wrote lib/npc_art_urls.ttslua: ${links.size} NPCs.`);
  if (missingNpcs.length > 0) {
    console.warn(
      `[npc-art] WARN ${missingNpcs.length} NPC(s) left out because their art is not in Steam Cloud yet (${missingNpcs.sort().slice(0, 8).join(", ")}${missingNpcs.length > 8 ? ", …" : ""}). ` +
        "Close TTS, run npm run cloud:push, then npm run cloud-asset-sync and npm run npc-art:urls."
    );
  }
  if (outdated.length > 0) {
    console.warn(
      `[npc-art] WARN ${outdated.length} file(s) changed locally since their last upload, so TTS still shows the old art (${outdated.slice(0, 5).join(", ")}${outdated.length > 5 ? ", …" : ""}). ` +
        "Close TTS and run npm run cloud-asset-sync, then npm run npc-art:urls."
    );
  }
};

if (process.argv.includes("--urls")) {
  await urls();
} else {
  await draw(process.argv.includes("--force"));
}
