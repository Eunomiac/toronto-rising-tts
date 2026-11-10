"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REVIEW_WIDTH } = require("./review-sheet-rows.js");
const { appendReviewRows } = require("./review-sheet-write.js");

const row = () => Array.from({ length: REVIEW_WIDTH }, (_, index) => index === 0 ? "https://example.test/new.webp" : "");

test("sheet write is skipped when the web app is not configured", async () => {
  const previous = [process.env.ASSET_REVIEW_WRITE_URL, process.env.ASSET_REVIEW_WRITE_SECRET];
  delete process.env.ASSET_REVIEW_WRITE_URL;
  delete process.env.ASSET_REVIEW_WRITE_SECRET;
  try {
    const result = await appendReviewRows([row()], {
      envText: "",
      fetchImpl: async () => { throw new Error("must not post"); },
    });
    assert.deepEqual(result, { configured: false, appended: 0, startRow: null });
  } finally {
    if (previous[0] === undefined) delete process.env.ASSET_REVIEW_WRITE_URL;
    else process.env.ASSET_REVIEW_WRITE_URL = previous[0];
    if (previous[1] === undefined) delete process.env.ASSET_REVIEW_WRITE_SECRET;
    else process.env.ASSET_REVIEW_WRITE_SECRET = previous[1];
  }
});

test("sheet write posts the rows and requires confirmation", async () => {
  process.env.ASSET_REVIEW_WRITE_URL = "https://script.google.com/macros/s/test/exec";
  process.env.ASSET_REVIEW_WRITE_SECRET = "test-secret";
  try {
    let body;
    const result = await appendReviewRows([row()], {
      fetchImpl: async (_url, options) => {
        body = JSON.parse(options.body);
        return new Response(JSON.stringify({ ok: true, appended: 1, startRow: 1213 }), { status: 200 });
      },
    });
    assert.equal(body.secret, "test-secret");
    assert.equal(body.action, "append");
    assert.equal(body.integrated.length, 1);
    assert.equal(result.startRow, 1213);
  } finally {
    delete process.env.ASSET_REVIEW_WRITE_URL;
    delete process.env.ASSET_REVIEW_WRITE_SECRET;
  }
});
