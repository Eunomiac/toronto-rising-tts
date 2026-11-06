"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeGeneratedFile } = require("./write_generated_file.js");

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-generated-file-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const file = path.join(dir, "module.ttslua");
  fs.writeFileSync(file, "original");
  return { dir, file };
}

test("unchanged generated output never opens a file for writing", t => {
  const { file } = fixture(t);
  const mtime = fs.statSync(file).mtimeMs;
  const io = { ...fs, writeFileSync: () => assert.fail("unexpected write"), renameSync: () => assert.fail("unexpected replacement") };
  assert.equal(writeGeneratedFile(file, "original", { io }), false);
  assert.equal(fs.statSync(file).mtimeMs, mtime);
});

test("transient Windows replacement errors preserve the old file until success", t => {
  const { dir, file } = fixture(t);
  const delays = [];
  let attempts = 0;
  const io = { ...fs, renameSync: (from, to) => {
    assert.equal(fs.readFileSync(file, "utf8"), "original");
    if (++attempts < 3) throw Object.assign(Error("sharing violation"), { code: attempts === 1 ? "UNKNOWN" : "EBUSY" });
    fs.renameSync(from, to);
  } };
  assert.equal(writeGeneratedFile(file, "new — module", { io, platform: "win32", wait: ms => delays.push(ms) }), true);
  assert.equal(fs.readFileSync(file, "utf8"), "new — module");
  assert.deepEqual(delays, [50, 100]);
  assert.deepEqual(fs.readdirSync(dir), ["module.ttslua"]);
});

test("a persistent lock fails after bounded retries and retains the complete old module", t => {
  const { dir, file } = fixture(t);
  const delays = [];
  let attempts = 0;
  const io = { ...fs, renameSync: () => { attempts++; throw Object.assign(Error("locked"), { code: "EPERM" }); } };
  assert.throws(() => writeGeneratedFile(file, "replacement", { io, platform: "win32", wait: ms => delays.push(ms) }), { code: "EPERM" });
  assert.equal(attempts, 6);
  assert.equal(delays.reduce((a, b) => a + b, 0), 1550);
  assert.equal(fs.readFileSync(file, "utf8"), "original");
  assert.deepEqual(fs.readdirSync(dir), ["module.ttslua"]);
});

test("disk errors fail immediately without corrupting the published output", t => {
  const { dir, file } = fixture(t);
  const io = { ...fs, writeFileSync: () => { throw Object.assign(Error("disk full"), { code: "ENOSPC" }); } };
  assert.throws(() => writeGeneratedFile(file, "replacement", { io, platform: "win32", wait: () => assert.fail("disk errors must not retry") }), { code: "ENOSPC" });
  assert.equal(fs.readFileSync(file, "utf8"), "original");
  assert.deepEqual(fs.readdirSync(dir), ["module.ttslua"]);
});

test("new generated files can be created", t => {
  const { dir } = fixture(t);
  const file = path.join(dir, "nested", "new.ttslua");
  assert.equal(writeGeneratedFile(file, "new module"), true);
  assert.equal(fs.readFileSync(file, "utf8"), "new module");
});
