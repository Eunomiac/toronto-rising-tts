/** Headless check: disciplines catalog API + shared HTML tip on a power term. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const catalogPath = new URL("../data/disciplines-catalog.json", import.meta.url);
assert.ok(fs.existsSync(catalogPath), "Run npm run disciplines:import before this smoke.");

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/tts/execute-lua", (route) =>
  route.fulfill({ json: { prints: [], returnValue: JSON.stringify({ ok: true, seats: [] }) } })
);
await page.goto(process.env.DASHBOARD_URL || "http://127.0.0.1:8788/");
await page.locator("#tab-scenes").click();

const catalog = await page.evaluate(async () => {
  const response = await fetch("/api/disciplines");
  if (!response.ok) throw new Error(`/api/disciplines: ${response.status}`);
  return response.json();
});
assert.equal(catalog.version, 1);
assert.ok(catalog.entries.length >= 300, `expected hundreds of entries, got ${catalog.entries.length}`);
const sample = catalog.entries.find((row) => row.name === "Bond Famulus") || catalog.entries[0];
assert.ok(sample?.systemHtml, "sample entry needs systemHtml");

await page.evaluate((entry) => {
  const host = document.createElement("button");
  host.id = "disciplines-smoke-power";
  host.textContent = entry.name;
  host.dataset.term = `power:${entry.name.toLowerCase()}`;
  host.dataset.discipline = entry.discipline;
  host.style.cssText = "position:fixed;left:40px;top:40px;z-index:9999;padding:12px";
  document.body.appendChild(host);
}, sample);

await page.locator("#disciplines-smoke-power").hover();
await page.waitForSelector(".discipline-tip.on .discipline_title", { timeout: 5000 });
const title = await page.locator(".discipline-tip.on .discipline_title").textContent();
assert.equal(title?.trim(), sample.name);
const tipHtml = await page.locator(".discipline-tip.on").innerHTML();
assert.ok(tipHtml.includes("discipline_system"), "tip should include system block");
assert.ok(!tipHtml.includes("term-image-tip"), "power tip must not use Term Images chrome");

await page.evaluate(() => {
  const host = document.createElement("button");
  host.id = "disciplines-smoke-skill";
  host.textContent = "Athletics";
  host.dataset.term = "skill:athletics";
  host.style.cssText = "position:fixed;left:40px;top:120px;z-index:9999;padding:12px";
  document.body.appendChild(host);
});
await page.locator("#disciplines-smoke-skill").hover();
await page.waitForTimeout(300);
assert.equal(await page.locator(".discipline-tip.on").count(), 0);

assert.deepEqual(errors, []);
console.log(`PASS /api/disciplines (${catalog.entries.length} entries); Bond Famulus-style tip shows; skill terms stay off the catalog tip.`);
await browser.close();
