"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { REVIEW_URL, fetchReview, loadReview } = require("./session-start-review.js");

const csv = "URL,Known bytes,Manual decision,Manual notes\nhttps://example.test/bundle,42,Prune,restore later\nhttps://example.test/image,12,Keep,\n";
const response = (body = csv, status = 200) => new Response(body, { status });
const temp = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "review.json");
};

test("downloads the static reviewed columns with caching disabled", async () => {
  const result = await fetchReview(async (url, options) => {
    assert.equal(url, REVIEW_URL);
    assert.match(url, /range=AA:BI$/);
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return response();
  });
  assert.equal(result.decisions.size, 2);
  assert.equal(result.decisions.get("https://example.test/bundle").decision, "Prune");
  assert.equal(result.decisions.get("https://example.test/image").decision, "Keep");
});

test("HTTP, login pages, transport failures, and bad review data fail visibly", async () => {
  await assert.rejects(fetchReview(async () => response("sign in", 401)), /HTTP 401.*Anyone with the link/);
  await assert.rejects(fetchReview(async () => response("server error", 503)), /HTTP 503/);
  await assert.rejects(fetchReview(async () => response("<!DOCTYPE html><html>Sign in</html>")), /login page/);
  await assert.rejects(fetchReview(async () => { throw Error("request timed out"); }), /Could not download.*timed out/);
  await assert.rejects(fetchReview(async () => response(csv.replace("Manual decision", "Decision"))), /Manual decision column/);
  await assert.rejects(fetchReview(async () => response(csv.replace("Keep", "Delete"))), /invalid URL or decision/);
  await assert.rejects(fetchReview(async () => response(csv.replace(",Keep,", ",#REF!,"))), /formula error/);
  await assert.rejects(fetchReview(async () => response(csv.replace("https://example.test/image", "https://example.test/bundle"))), /duplicate reviewed URL/);
});

test("FULL uses the exact validated preflight download without a second request", async t => {
  const snapshotFile = temp(t);
  const initial = await loadReview({ snapshotFile, preflight: true }, async () => response());
  const final = await loadReview({ snapshotFile }, async () => { throw Error("must not download twice"); });
  assert.deepEqual(final, initial);
  assert.equal(final.source, REVIEW_URL);
  assert.ok(final.fetchedAt);
});

test("a failed fresh fetch cannot reuse an older snapshot", async t => {
  const snapshotFile = temp(t);
  await loadReview({ snapshotFile, preflight: true }, async () => response());
  const before = fs.readFileSync(snapshotFile, "utf8");
  await assert.rejects(loadReview({ snapshotFile, preflight: true }, async () => response("down", 503)), /HTTP 503/);
  assert.equal(fs.readFileSync(snapshotFile, "utf8"), before);
});

test("missing or corrupt FULL snapshots fail without fetching replacement decisions", async t => {
  const snapshotFile = temp(t);
  const noFetch = async () => { throw Error("must not fetch replacement decisions"); };
  await assert.rejects(loadReview({ snapshotFile }, noFetch), /ENOENT/);
  fs.writeFileSync(snapshotFile, JSON.stringify({ version: 1, source: "other sheet", fetchedAt: new Date().toISOString(), csv }));
  await assert.rejects(loadReview({ snapshotFile }, noFetch), /Invalid session-start review snapshot/);
});

test("an explicit offline file works without network access", async t => {
  const decisionsFile = temp(t);
  fs.writeFileSync(decisionsFile, csv);
  const result = await loadReview({ decisionsFile }, async () => { throw Error("must stay offline"); });
  assert.equal(result.decisions.size, 2);
  assert.equal(result.source, decisionsFile);
  assert.equal(result.fetchedAt, null);
});
