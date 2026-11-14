/** Headless check: Downtime night awakening + End NPC stage reminders, click-to-hide. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const catalogs = JSON.parse(
  fs.readFileSync(new URL("../data/scene-catalogs.json", import.meta.url))
);
const roster = JSON.parse(
  fs.readFileSync(new URL("../data/npc-roster.json", import.meta.url))
).layout;
const pc = catalogs.pcs.find((n) => n.characterKey === "aishe") ?? catalogs.pcs[0];
const present = { year: 2026, month: 11, day: 14, hour: 22, minute: 0 };
const dusk = { year: 2026, month: 11, day: 14, hour: 19, minute: 0 };
const dawn = { year: 2026, month: 11, day: 15, hour: 7, minute: 0 };

const world = {
  ok: true,
  phase: {
    phase: "Play",
    subPhase: "Downtime",
    sessionNum: 42,
    sessionName: "Reminder smoke",
    sessionStartDowntime: true,
    memoriamActive: false
  },
  scene: {
    liveLinked: false,
    topFog: false,
    weather: { thunder: false, indoors: false }
  },
  clock: {
    running: false,
    activeClock: "downtime",
    speed: 1,
    catchUpToPresentDay: false,
    isPresentDay: true,
    downtime: present,
    presentDay: present,
    dusk,
    dawn,
    at: Date.now()
  },
  soundscape: {
    lanes: [],
    musicEnabled: false,
    musicSuppressed: false,
    siteSilent: true,
    featuredActive: false,
    sessionIntroActive: false
  },
  seats: {
    seats: [
      {
        seat: "Pink",
        kind: "pc",
        tableSlot: 1,
        isPresent: true,
        charKey: pc.characterKey,
        absentFromSession: false
      }
    ],
    stage: [],
    generics: [],
    scatter: [],
    spotlightOrder: [],
    spotlightFrontIndex: 1,
    trackers: {}
  },
  rolls: {
    pcs: [],
    storyteller: { canInitiate: false, slots: [], live: null },
    werewolves: [],
    oblivionSeats: []
  }
};

const output = path.join(os.tmpdir(), "toronto-rising-stage-reminders-smoke");
fs.mkdirSync(output, { recursive: true });
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  env: { ...process.env, XDG_CONFIG_HOME: output, XDG_CACHE_HOME: output }
});
setTimeout(() => {
  console.error("stage reminders smoke timed out");
  process.exit(2);
}, 60000).unref();

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.route("**/api/roll-chronicle", (route) => route.fulfill({ json: { entries: [], permanent: {} } }));
  await page.route("**/api/tts/events", (route) =>
    route.fulfill({ contentType: "text/event-stream", body: ": reminder fixture\n\n" })
  );
  const deckFile = { deck: [], previews: [], notes: {}, roster, seeded: true };
  const libraryFile = { scenes: [], seeded: true };
  await page.route("**/api/scene-deck", (route) => route.fulfill({ json: deckFile }));
  await page.route("**/api/scene-library", (route) => route.fulfill({ json: libraryFile }));
  await page.route("**/api/npc-stats", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/tts/execute-lua", async (route) => {
    const { script } = route.request().postDataJSON();
    const value = script.includes("GlobalDashboardWorldSnapshot")
      ? world
      : script.includes("GlobalDashboardPcSheetSnapshot")
        ? { ok: true, seats: [] }
        : { ok: true };
    await route.fulfill({ json: { prints: [], returnValue: JSON.stringify(value) } });
  });

  await page.goto(`${process.env.DASHBOARD_URL ?? "http://127.0.0.1:8788"}/`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator('.lab-seat-slot[data-seat-key="Pink"]').waitFor({ timeout: 20000 });

  const awakening = page.getByRole("button", { name: /rouse checks for awakening/i });
  await awakening.waitFor();
  await awakening.click();
  assert.equal(await page.getByRole("button", { name: /rouse checks for awakening/i }).count(), 0);
  console.log("PASS Downtime night awakening reminder shows and dismisses");

  world.phase.phase = "End";
  delete world.phase.subPhase;
  world.phase.sessionStartDowntime = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.lab-seat-slot[data-seat-key="Pink"]').waitFor({ timeout: 20000 });

  await page.getByRole("button", { name: /Dark Between the Stars/i }).waitFor();
  await page.getByRole("button", { name: /Rats in the Walls/i }).waitFor();
  await page.getByRole("button", { name: /Black Caesar/i }).waitFor();
  await page.getByRole("button", { name: /Rats in the Walls/i }).click();
  assert.equal(await page.getByRole("button", { name: /Rats in the Walls/i }).count(), 0);
  assert.equal(await page.getByRole("button", { name: /Dark Between the Stars/i }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Black Caesar/i }).count(), 1);
  console.log("PASS End reminders show and dismiss independently");

  assert.deepEqual(errors, []);
  console.log("PASS stage reminders smoke at 1920×1080 with no browser exceptions");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
