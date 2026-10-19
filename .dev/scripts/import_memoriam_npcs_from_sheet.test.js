"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseMemoriamNpcRows,
  renderMemoriamNpcCatalogJson,
} = require("./lib/memoriam_npcs_sheet_csv.js");

const SAMPLE = [
  "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods",
  "npc_mem_adrianGerrard.webp,mem_adrianGerrard,Adrian Gerrard,Toronto,Present,,FALSE,adrian gerrard,\"lucien17, rashid21\"",
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
    location: "Toronto",
    year: "Present",
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
        "filename,key,label,location,year,variantOfUnique,isGeneric,tags,periods\nmem_adrianGerrard.webp,mem_adrianGerrard,Adrian,Toronto,Present,,FALSE,tags,aishe2\n",
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
          "npc_mem_a.webp,mem_a,A,Toronto,Present,,FALSE,tags,aishe2",
          "npc_mem_a.webp,mem_a,A again,Toronto,Present,,FALSE,tags,aishe2",
        ].join("\n"),
      ),
    /duplicate key/,
  );
  assert.throws(() => parseMemoriamNpcRows("filename,key,label\nnpc_mem_a.webp,mem_a,A\n"), /expected header/);
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
