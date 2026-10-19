"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  collectCharacterKeys,
  parseMemoriamNpcRows,
  renderMemoriamNpcCatalogJson,
  renderMemoriamNpcCatalogLua,
  validateMemoriamVariants,
} = require("./lib/memoriam_npcs_sheet_csv.js");

const SAMPLE = [
  "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods",
  "npc_mem_adrianGerrard.webp,mem_adrianGerrard,Adrian Gerrard,\"New Orleans, Western\",\"Modern, 1900s, 1800s,  1700s\",,FALSE,adrian gerrard,\"lucien17, rashid21\"",
  "npc_mem_adrianGerrard1800.webp,mem_adrianGerrard1800,Adrian Gerrard,Toronto,1800s,mem_adrianGerrard,FALSE,adrian 1800s,fomorach8",
  "npc_mem_arabiaLearnedMedia_01.webp,mem_arabiaLearnedMedia_01,Learned Media,Arabia,1800s,,TRUE,arabia media,\"rashid4, rashid6\"",
].join("\n");

test("parseMemoriamNpcRows keeps extra columns and the generic flag", () => {
  const rows = parseMemoriamNpcRows(SAMPLE);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    filename: "npc_mem_adrianGerrard.webp",
    key: "mem_adrianGerrard",
    label: "Adrian Gerrard",
    location: "New Orleans, Western",
    year: "Modern, 1900s, 1800s,  1700s",
    variantOfUnique: "",
    isGeneric: false,
    tags: "adrian gerrard",
    periods: ["lucien17", "rashid21"],
  });
  assert.equal(rows[1].variantOfUnique, "mem_adrianGerrard");
  assert.equal(rows[1].isGeneric, false);
  assert.equal(rows[2].isGeneric, true);
  assert.deepEqual(rows[2].periods, ["rashid4", "rashid6"]);
});

test("parseMemoriamNpcRows allows a blank location and a catalogued variant target", () => {
  const rows = parseMemoriamNpcRows(
    [
      "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods",
      "npc_mem_bertrice1800.webp,mem_bertrice1800,Bertrice,,1800s,bertrice,FALSE,bertrice,aishe2",
    ].join("\n"),
  );
  assert.equal(rows[0].location, "");
  assert.equal(rows[0].variantOfUnique, "bertrice");
});

test("parseMemoriamNpcRows rejects a generic flag that disagrees with the filename suffix", () => {
  assert.throws(
    () =>
      parseMemoriamNpcRows(
        "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods\nnpc_mem_adrianGerrard1800.webp,mem_adrianGerrard1800,Adrian,,1800s,,TRUE,tags,aishe2\n",
      ),
    /does not match key/,
  );
  assert.throws(
    () =>
      parseMemoriamNpcRows(
        "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods\nnpc_mem_arabiaLearnedMedia_01.webp,mem_arabiaLearnedMedia_01,Media,,1800s,,FALSE,tags,aishe2\n",
      ),
    /does not match key/,
  );
});

test("parseMemoriamNpcRows rejects a filename that is not npc_<key>.webp", () => {
  assert.throws(
    () =>
      parseMemoriamNpcRows(
        "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods\nmem_adrianGerrard.webp,mem_adrianGerrard,Adrian,Toronto,Modern,,FALSE,tags,aishe2\n",
      ),
    /must be npc_mem_adrianGerrard\.webp/,
  );
});

test("parseMemoriamNpcRows rejects duplicate keys and a bad header", () => {
  assert.throws(
    () =>
      parseMemoriamNpcRows(
        [
          "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods",
          "npc_mem_a.webp,mem_a,A,Toronto,Modern,,FALSE,tags,aishe2",
          "npc_mem_a.webp,mem_a,A again,Toronto,Modern,,FALSE,tags,aishe2",
        ].join("\n"),
      ),
    /duplicate key/,
  );
  assert.throws(() => parseMemoriamNpcRows("filename,key,label\nnpc_mem_a.webp,mem_a,A\n"), /expected header/);
});

test("parseMemoriamNpcRows rejects Present, a blank location piece, and a generic variant", () => {
  const header = "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods";
  assert.throws(
    () => parseMemoriamNpcRows(`${header}\nnpc_mem_a.webp,mem_a,A,Toronto,Present,,FALSE,tags,aishe2\n`),
    /must be Modern/,
  );
  assert.throws(
    () => parseMemoriamNpcRows(`${header}\nnpc_mem_a.webp,mem_a,A,"Toronto,,Western",Modern,,FALSE,tags,aishe2\n`),
    /empty entry/,
  );
  assert.throws(
    () => parseMemoriamNpcRows(`${header}\nnpc_mem_a_01.webp,mem_a_01,A,Toronto,1800s,bertrice,TRUE,tags,aishe2\n`),
    /only for non-generic/,
  );
});

test("validateMemoriamVariants accepts a catalogued target and rejects a dangling link or a cycle", () => {
  const header = "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods";
  const row = (key, variant) => `npc_${key}.webp,${key},Name,Toronto,Modern,${variant},FALSE,tags,aishe2`;
  const catalogued = new Set(["bertrice"]);
  const linked = parseMemoriamNpcRows(`${header}\n${row("mem_a", "bertrice")}\n`);
  assert.doesNotThrow(() => validateMemoriamVariants(linked, catalogued));
  const dangling = parseMemoriamNpcRows(`${header}\n${row("mem_a", "nobody")}\n`);
  assert.throws(() => validateMemoriamVariants(dangling, catalogued), /nobody/);
  const cycle = parseMemoriamNpcRows(`${header}\n${row("mem_a", "mem_b")}\n${row("mem_b", "mem_a")}\n`);
  assert.throws(() => validateMemoriamVariants(cycle, catalogued), /cycle/);
});

test("collectCharacterKeys reads D.characters and the lua catalog quotes labels", () => {
  const keys = collectCharacterKeys("D.characters = {\n  bertrice = {\n    fullName = \"Bertrice\",\n  },\n}\nD.overrides = {}\n");
  assert.equal(keys.has("bertrice"), true);
  assert.equal(keys.has("fullName"), false);
  const lua = renderMemoriamNpcCatalogLua(parseMemoriamNpcRows(SAMPLE));
  assert.match(lua, /mem_adrianGerrard = \{ label = "Adrian Gerrard", isGeneric = false, variantOfUnique = "" \}/);
  assert.match(lua, /mem_arabiaLearnedMedia_01 = \{ label = "Learned Media", isGeneric = true/);
});

test("renderMemoriamNpcCatalogJson records the named range", () => {
  const text = renderMemoriamNpcCatalogJson({
    npcs: parseMemoriamNpcRows(SAMPLE),
    meta: { sheetId: "sheet", rangeName: "MEMORIAMNPCCSV", tabName: "Memoriam NPC Export" },
  });
  const parsed = JSON.parse(text);
  assert.equal(parsed.npcs.length, 3);
  assert.equal(parsed.rangeName, "MEMORIAMNPCCSV");
  assert.equal(parsed.tabName, "Memoriam NPC Export");
  assert.equal(parsed.npcs[2].isGeneric, true);
});
