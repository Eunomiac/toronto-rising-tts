import { chromium } from "playwright";
import assert from "node:assert/strict";

// Exercise the running Dashboard. Only TTS transport is replaced with synthetic state.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [], commands = [];
page.on("pageerror", error => errors.push(error.message));
let snapshot = { ok: true, seats: [] };
await page.route("**/api/tts-bridge-status", route => route.fulfill({ json: { usable: true, mode: "gateway", editorPort: "via_gateway" } }));
await page.route("**/api/tts/events", route => route.fulfill({ contentType: "text/event-stream", body: "\n" }));
await page.route("**/api/tts/execute-lua", async route => {
  const { script } = route.request().postDataJSON();
  if (script.includes("GlobalDashboardPcSheetApply")) {
    const match = script.match(/\[(=*)\[([\s\S]*)\]\1\]/);
    const payload = JSON.parse(match[2]);
    for (const command of Array.isArray(payload) ? payload : [payload]) {
      commands.push(command);
      const court = command.op.startsWith("court");
      const data = court ? snapshot.coterieData : snapshot.seats.find(seat => seat.color === command.color).playerData.stats;
      const key = court ? command.scope + command.type.charAt(0).toUpperCase() + command.type.slice(1) : command.type;
      if (command.index) data[key][command.index - 1] = structuredClone(command.entry);
      else data[key].push(structuredClone(command.entry));
    }
  }
  await route.fulfill({ json: { prints: [], timedOut: false, returnValue: JSON.stringify(snapshot) } });
});

const save = async label => {
  await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
  await page.waitForSelector('[role="dialog"]', { state: "detached" });
};

try {
  await page.goto(process.env.DASHBOARD_URL || "http://127.0.0.1:8788");
  snapshot = await page.evaluate(async () => (await import("/src/client/pcSheet/fixture.ts")).fixtureSnapshot());
  for (const seat of snapshot.seats) {
    seat.portraitOptions = [{ value: "npcPortrait_lalehBintSaif", label: "Laleh bint Saif" }];
    seat.playerData = { stats: { backgrounds: [], merits: [], flaws: [] } };
  }
  snapshot.coterieData = Object.fromEntries(["coterie", "domain", "haven"].flatMap(scope =>
    ["Backgrounds", "Merits", "Flaws"].map(category => [scope + category, []])));
  snapshot.courtPortraits = [{ value: "npcPortrait_theAristocrat", label: "The Aristocrat" }];
  await page.locator("#tab-pcs").click();
  await page.getByRole("button", { name: "Pages III · IV", exact: true }).click();
  await page.getByRole("button", { name: "+ Background", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Portrait Test");
  await dialog.getByLabel(/^Description/).fill("Original description");
  await dialog.getByLabel(/^Portrait/).selectOption("npcPortrait_lalehBintSaif");
  assert.equal(await dialog.locator('option[value="npcPortrait_theAristocrat"]').count(), 0);
  await save("Add");
  assert.equal(commands.at(-1).entry.portrait, "npcPortrait_lalehBintSaif");
  await page.locator(".pc-masonry-item .pc-adv-content img").waitFor();
  await page.getByRole("button", { name: "PORTRAIT TEST", exact: true }).click();
  dialog = page.getByRole("dialog");
  assert.equal(await dialog.getByLabel(/^Portrait/).inputValue(), "npcPortrait_lalehBintSaif");
  await dialog.getByLabel(/^Portrait/).selectOption("");
  await save("Save");
  assert.equal(commands.at(-1).entry.portrait, "");
  assert.deepEqual(commands.at(-1).entry.description, ["Original description"]);
  await page.getByRole("button", { name: "The Court", exact: true }).click();
  await page.getByRole("button", { name: "+ Flaw", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Court Portrait Test");
  await dialog.getByLabel(/^Portrait/).selectOption("npcPortrait_theAristocrat");
  assert.equal(await dialog.locator('option[value="npcPortrait_lalehBintSaif"]').count(), 0);
  await dialog.locator(".pc-adv-portrait-preview").evaluate(image => image.decode());
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
  await save("Add");
  assert.equal(commands.at(-1).op, "courtAdvantageUpsert");
  assert.equal(commands.at(-1).scope, "coterie");
  await page.getByRole("button", { name: "COURT PORTRAIT TEST", exact: true }).click();
  dialog = page.getByRole("dialog");
  assert.equal(await dialog.getByLabel(/^Portrait/).inputValue(), "npcPortrait_theAristocrat");
  await dialog.getByLabel(/^Portrait/).selectOption("");
  await save("Save");
  assert.equal(commands.at(-1).entry.portrait, "");
  await page.getByLabel("Court section").selectOption("domain");
  await page.getByRole("button", { name: "+ Merit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Domain Portrait Test");
  await dialog.getByLabel(/^Portrait/).selectOption("npcPortrait_theAristocrat");
  await save("Add");
  assert.equal(commands.at(-1).scope, "domain");
  assert.deepEqual(errors, []);
  console.log("PASS at 1920x1080. PC and Court creation, edit, preview, recipient filtering, clearing, preserved description, Domain scope, and no browser exceptions. TTS responses were mocked.");
} finally {
  await browser.close();
}
