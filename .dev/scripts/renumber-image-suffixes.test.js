"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseNumberedImageName,
  planRenames,
  padWidthForCount,
  applyRenames,
  assertNoCollisions,
} = require("./renumber-image-suffixes.js");

function makeFile(dir, relativePath) {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, relativePath);
  return {
    fullPath,
    relativePath,
    dir: path.dirname(fullPath),
    fileName: path.basename(relativePath),
    ...parseNumberedImageName(path.basename(relativePath)),
  };
}

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "renumber-image-suffixes-"));
  try {
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("parseNumberedImageName strips a trailing underscore + digits suffix", () => {
  assert.deepEqual(parseNumberedImageName("civilianTeenGirl_03.png"), {
    baseName: "civilianTeenGirl",
    number: 3,
    extension: ".png",
  });
  assert.deepEqual(parseNumberedImageName("children_v1_2x_05.webp"), {
    baseName: "children_v1_2x",
    number: 5,
    extension: ".webp",
  });
  assert.equal(parseNumberedImageName("tokenBack_abbasFaruk.webp"), null);
  assert.equal(parseNumberedImageName("civilianTeenGirl.png"), null);
});

test("planRenames compactly numbers each stem from 01", () => {
  const files = [
    { relativePath: "civilianTeenGirl_03.png", dir: "/img", fileName: "civilianTeenGirl_03.png", baseName: "civilianTeenGirl", number: 3, extension: ".png", fullPath: "/img/civilianTeenGirl_03.png" },
    { relativePath: "civilianTeenGirl_04.png", dir: "/img", fileName: "civilianTeenGirl_04.png", baseName: "civilianTeenGirl", number: 4, extension: ".png", fullPath: "/img/civilianTeenGirl_04.png" },
    { relativePath: "civilianTeenGirl_07.png", dir: "/img", fileName: "civilianTeenGirl_07.png", baseName: "civilianTeenGirl", number: 7, extension: ".png", fullPath: "/img/civilianTeenGirl_07.png" },
    { relativePath: "civilianTeenGirl_08.png", dir: "/img", fileName: "civilianTeenGirl_08.png", baseName: "civilianTeenGirl", number: 8, extension: ".png", fullPath: "/img/civilianTeenGirl_08.png" },
    { relativePath: "civilianTeenBoy_01.png", dir: "/img", fileName: "civilianTeenBoy_01.png", baseName: "civilianTeenBoy", number: 1, extension: ".png", fullPath: "/img/civilianTeenBoy_01.png" },
    { relativePath: "civilianTeenBoy_02.png", dir: "/img", fileName: "civilianTeenBoy_02.png", baseName: "civilianTeenBoy", number: 2, extension: ".png", fullPath: "/img/civilianTeenBoy_02.png" },
    { relativePath: "civilianTeenBoy_05.png", dir: "/img", fileName: "civilianTeenBoy_05.png", baseName: "civilianTeenBoy", number: 5, extension: ".png", fullPath: "/img/civilianTeenBoy_05.png" },
    { relativePath: "civilianTeenBoy_06.png", dir: "/img", fileName: "civilianTeenBoy_06.png", baseName: "civilianTeenBoy", number: 6, extension: ".png", fullPath: "/img/civilianTeenBoy_06.png" },
    { relativePath: "civilianTeenBoy_09.png", dir: "/img", fileName: "civilianTeenBoy_09.png", baseName: "civilianTeenBoy", number: 9, extension: ".png", fullPath: "/img/civilianTeenBoy_09.png" },
    { relativePath: "civilianTeenBoy_10.png", dir: "/img", fileName: "civilianTeenBoy_10.png", baseName: "civilianTeenBoy", number: 10, extension: ".png", fullPath: "/img/civilianTeenBoy_10.png" },
  ];

  const planned = planRenames(files, { perFolder: false });
  const changes = planned
    .filter((item) => !item.skipped)
    .map((item) => `${path.basename(item.fromPath)} -> ${path.basename(item.toPath)}`);

  assert.deepEqual(changes, [
    "civilianTeenBoy_05.png -> civilianTeenBoy_03.png",
    "civilianTeenBoy_06.png -> civilianTeenBoy_04.png",
    "civilianTeenBoy_09.png -> civilianTeenBoy_05.png",
    "civilianTeenBoy_10.png -> civilianTeenBoy_06.png",
    "civilianTeenGirl_03.png -> civilianTeenGirl_01.png",
    "civilianTeenGirl_04.png -> civilianTeenGirl_02.png",
    "civilianTeenGirl_07.png -> civilianTeenGirl_03.png",
    "civilianTeenGirl_08.png -> civilianTeenGirl_04.png",
  ]);
});

test("planRenames keeps one sequence per name even when files sit in different folders", () => {
  const files = [
    { relativePath: "girls/civilianTeenGirl_07.png", dir: "/img/girls", fileName: "civilianTeenGirl_07.png", baseName: "civilianTeenGirl", number: 7, extension: ".png", fullPath: "/img/girls/civilianTeenGirl_07.png" },
    { relativePath: "other/civilianTeenGirl_03.png", dir: "/img/other", fileName: "civilianTeenGirl_03.png", baseName: "civilianTeenGirl", number: 3, extension: ".png", fullPath: "/img/other/civilianTeenGirl_03.png" },
  ];

  const planned = planRenames(files, { perFolder: false });
  assert.equal(path.basename(planned.find((item) => item.fromRelative.includes("other")).toPath), "civilianTeenGirl_01.png");
  assert.equal(path.basename(planned.find((item) => item.fromRelative.includes("girls")).toPath), "civilianTeenGirl_02.png");
});

test("planRenames --per-folder numbers each folder on its own", () => {
  const files = [
    { relativePath: "a/civilianTeenGirl_07.png", dir: "/img/a", fileName: "civilianTeenGirl_07.png", baseName: "civilianTeenGirl", number: 7, extension: ".png", fullPath: "/img/a/civilianTeenGirl_07.png" },
    { relativePath: "b/civilianTeenGirl_03.png", dir: "/img/b", fileName: "civilianTeenGirl_03.png", baseName: "civilianTeenGirl", number: 3, extension: ".png", fullPath: "/img/b/civilianTeenGirl_03.png" },
  ];

  const planned = planRenames(files, { perFolder: true });
  assert.ok(planned.every((item) => path.basename(item.toPath) === "civilianTeenGirl_01.png"));
});

test("applyRenames uses a two-step rename so overlapping numbers do not collide", () => {
  withTempDir((dir) => {
    const files = [
      makeFile(dir, "civilianTeenGirl_03.png"),
      makeFile(dir, "civilianTeenGirl_04.png"),
      makeFile(dir, "civilianTeenGirl_07.png"),
      makeFile(dir, "civilianTeenGirl_08.png"),
    ];
    const planned = planRenames(files, { perFolder: false });
    assertNoCollisions(planned);
    applyRenames(planned);

    const names = fs.readdirSync(dir).sort();
    assert.deepEqual(names, [
      "civilianTeenGirl_01.png",
      "civilianTeenGirl_02.png",
      "civilianTeenGirl_03.png",
      "civilianTeenGirl_04.png",
    ]);
    assert.equal(fs.readFileSync(path.join(dir, "civilianTeenGirl_01.png"), "utf8"), "civilianTeenGirl_03.png");
    assert.equal(fs.readFileSync(path.join(dir, "civilianTeenGirl_04.png"), "utf8"), "civilianTeenGirl_08.png");
  });
});

test("pad width grows past 99 files", () => {
  assert.equal(padWidthForCount(4), 2);
  assert.equal(padWidthForCount(99), 2);
  assert.equal(padWidthForCount(100), 3);
});
