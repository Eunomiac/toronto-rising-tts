/** Browser regression checks against the running Vite dashboard.
 * TTS snapshots and command replies are intercepted in this browser only.
 * No game connection or private save/artwork is required.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const catalogs = JSON.parse(
  fs.readFileSync(new URL("../data/scene-catalogs.json", import.meta.url)),
);
const npc = catalogs.namedNpcs.find((n) => n.pickerGroups.length).characterKey;
const pc =
  catalogs.pcs.find((n) => n.characterKey === "aishe") ?? catalogs.pcs[0];
const dt = { year: 2010, month: 10, day: 17, hour: 22, minute: 0 };
const world = {
  ok: true,
  phase: {
    phase: "Play",
    subPhase: "Scene",
    sessionName: "Browser verification",
    sessionStartDowntime: false,
    memoriamActive: false,
  },
  scene: {
    liveKey: "browser-scene",
    liveTitle: "Browser verification",
    liveLinked: false,
    tableKey: "Table A",
    placementMode: "STANDARD",
    topFog: false,
    weather: { thunder: false, indoors: false },
  },
  clock: {
    running: false,
    activeClock: "scene",
    scene: dt,
    presentDay: dt,
    datetime: dt,
  },
  soundscape: {
    lanes: [],
    musicEnabled: false,
    musicSuppressed: false,
    siteSilent: true,
    featuredActive: false,
    sessionIntroActive: false,
  },
  seats: {
    seats: [
      {
        seat: "Pink",
        kind: "pc",
        tableSlot: 1,
        isPresent: true,
        charKey: pc.characterKey,
        absentFromSession: false,
      },
      {
        seat: "Orange",
        kind: "pc",
        tableSlot: 2,
        isPresent: false,
        charKey: "rashid",
        absentFromSession: false,
      },
      {
        seat: "NPC1",
        kind: "npc",
        tableSlot: 6,
        isPresent: true,
        characterKey: npc,
      },
    ],
    stage: [{ characterKey: npc, u: 0.5, v: 0.65, lightMode: "STANDARD" }],
    generics: [],
    scatter: [],
    spotlightOrder: [],
    spotlightFrontIndex: 1,
    trackers: {},
  },
  rolls: {
    pcs: [
      {
        color: "Pink",
        name: "Aishe",
        rollId: "pc-test",
        rollType: "standard",
        phase: "preRoll",
        wpReroll: false,
        done: false,
        pool: { normal: 4 },
        dice: [],
        conditions: "",
        canModifyPool: true,
      },
    ],
    storyteller: {
      canInitiate: true,
      slots: [],
      live: {
        rollId: "npc-test",
        rollType: "standard",
        label: "Test NPC",
        npcCharacterKey: npc,
        phase: "preRoll",
        hint: "Ready",
        wpReroll: false,
        pool: { normal: 4 },
        dice: [],
        secret: false,
        quiet: false,
        bloodSurge: false,
        actions: {
          roll: true,
          rollEnabled: true,
          half: true,
          halfEnabled: true,
          wp: false,
          recalc: false,
          reroll: false,
          confirm: false,
          oblivChoice: false,
          brutalChoice: false,
        },
      },
    },
    werewolves: [],
    oblivionSeats: [],
  },
};
const output = path.join(os.tmpdir(), "toronto-rising-dnd-smoke");
fs.mkdirSync(output, { recursive: true });
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  env: { ...process.env, XDG_CONFIG_HOME: output, XDG_CACHE_HOME: output },
});
setTimeout(() => {
  console.error("browser check timed out");
  process.exit(2);
}, 90000).unref();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  const commands = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Keep all test persistence in this browser; do not add the fixture scene to the author's deck.
  const roster = JSON.parse(
    fs.readFileSync(new URL("../data/npc-roster.json", import.meta.url)),
  ).layout;
  await page.route("**/api/scene-deck", (route) =>
    route.fulfill({ json: { deck: [], previews: [], notes: {}, roster } }),
  );
  await page.route("**/api/scene-library", (route) =>
    route.fulfill({ json: { scenes: [], seeded: true } }),
  );
  await page.route("**/api/npc-stats", (route) =>
    route.fulfill({
      json: {
        [npc]: {
          named: {
            kind: "mortal",
            difficultyStrong: 3,
            difficultyWeak: 5,
            health: 5,
            willpower: 5,
            physical: 3,
            social: 3,
            mental: 3,
            exceptional: [],
            attacks: [],
            powers: [],
            notes: "",
          },
        },
      },
    }),
  );
  await page.route("**/api/tts/execute-lua", async (route) => {
    const { script } = route.request().postDataJSON();
    commands.push(script);
    let value = script.includes("GlobalDashboardWorldSnapshot")
      ? world
      : script.includes("GlobalDashboardPcSheetSnapshot")
        ? { ok: true, seats: [] }
        : { ok: true };
    await route.fulfill({
      json: { prints: [], returnValue: JSON.stringify(value) },
    });
  });
  await page.goto(`${process.env.DASHBOARD_URL ?? "http://127.0.0.1:8788"}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('.lab-seat-slot[data-seat-key="Pink"]').waitFor();
  console.log("page loaded", errors);
  await page.screenshot({
    path: path.join(output, "dnd-before-interactions.png"),
  });
  console.log(
    "stage tokens",
    await page.locator(".lab-stage-layer .lab-token").count(),
    "rolls",
    await page.locator("[data-tr-dnd-roll]").count(),
  );

  const position = async (locator) => {
    const b = await locator.boundingBox();
    assert(b, "missing element");
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const start = async (locator) => {
    const p = await position(locator);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 8, p.y - 25, { steps: 8 });
    await page.locator(".tr-dnd-chrome.is-active").waitFor();
    await page.locator(".tr-dnd-ghost").waitFor({ state: "attached" });
  };
  const finish = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const p = await position(locator);
    await page.mouse.move(p.x, p.y, { steps: 18 });
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.equal(await page.locator(".tr-dnd-chrome.is-active").count(), 0);
  };
  const rollsBefore = () =>
    commands.filter((c) => c.includes("RollsApply")).length;
  await start(page.locator('.lab-seat-slot[data-seat-key="Pink"]').first());
  const secondary = page.locator('[data-tr-dnd-panel="B"]');
  await secondary.scrollIntoViewIfNeeded();
  const secondaryBox = await secondary.boundingBox();
  const aspectsBox = await page.locator('.lab-aspects-box').first().boundingBox();
  const seatBox = await page.locator('.lab-seat-slot[data-seat-key="Pink"]').first().boundingBox();
  assert(secondaryBox && aspectsBox && seatBox);
  assert(Math.abs(secondaryBox.x - aspectsBox.x) < 1, 'secondary panel must align with aspects');
  assert(Math.abs(secondaryBox.y - aspectsBox.y) < 1, 'secondary panel must cover the aspects row');
  assert(secondaryBox.y + secondaryBox.height <= aspectsBox.y + aspectsBox.height + 1, 'secondary panel must fit inside the aspects row');
  assert(secondaryBox.y + secondaryBox.height < seatBox.y, 'secondary panel obscures seats');
  const seatHit = await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.closest('[data-chair]')?.getAttribute('data-seat-key'), {x: seatBox.x + seatBox.width / 2, y: seatBox.y + seatBox.height / 2});
  assert.equal(seatHit, 'Pink', 'seat must remain an actual pointer target during a drag');
  console.log('PASS secondary panel covers aspects and leaves seats reachable');
  await page.screenshot({ path: path.join(output, "dnd-seat-drag.png") });
  await finish(page.locator('[data-tr-dnd-bin="std"]').first());
  assert(
    commands.some(
      (c) => c.includes('"op":"initiate"') && c.includes('"color":"Pink"'),
    ),
  );
  assert.equal(
    commands.filter(
      (c) => c.includes('"op":"initiate"') && c.includes('"color":"Pink"'),
    ).length,
    1,
    "drop committed more than once",
  );
  console.log("PASS present PC → roll bin");
  await start(page.locator('.lab-seat-slot[data-seat-key="Orange"]').first());
  await finish(page.locator('[data-tr-dnd-bin="disc"]').first());
  assert(
    commands.some(
      (c) => c.includes('"op":"initiate"') && c.includes('"color":"Orange"'),
    ),
  );
  console.log("PASS absent PC → roll bin");
  await start(page.locator('[data-tr-dnd-roll="pcRollPreroll"] .roll-name').first());
  await finish(page.locator('.lab-seat-slot[data-seat-key="Orange"]').first());
  assert(commands.some((c) => c.includes('"op":"duplicateRoll"') && c.includes('"toColor":"Orange"')));
  console.log('PASS roll → seat while secondary panel is open');

  await start(
    page.locator('[data-tr-dnd-roll="npcRollPreroll"] .roll-name').first(),
  );
  await finish(page.locator('[data-tr-dnd-bin="secret"]').first());
  assert(commands.some((c) => c.includes('"op":"npcRoll","secret":true')));
  console.log("PASS NPC roll ghost → secret bin");
  const stageToken = page
    .locator(".lab-stage-layer [data-tr-dnd-staged] .lab-token-head")
    .first();
  await start(stageToken);
  const rollCard = page.locator('[data-tr-dnd-roll="pcRollPreroll"]').first();
  const rc = await position(rollCard);
  await page.mouse.move(rc.x, rc.y, { steps: 20 });
  const ghost = await page.locator(".tr-dnd-ghost").boundingBox();
  assert(ghost && ghost.x > 1600, "stage ghost clipped");
  await page.screenshot({ path: path.join(output, "dnd-stage-over-roll.png") });
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert(
    commands.some((c) => c.includes('"op":"retargetRoll"') && c.includes(npc)),
  );
  console.log("PASS stage → roll, ghost outside stage");
  await start(stageToken);
  await finish(page.locator('[data-tr-dnd-bin="std"]').first());
  assert(
    commands.some((c) => c.includes('"op":"npcInitiate"') && c.includes(npc) && c.includes(catalogs.namedNpcs.find((n) => n.characterKey === npc).fullName)),
  );
  console.log("PASS stage → bin");
  await start(
    page.locator('[data-tr-dnd-roll="pcRollPreroll"] .roll-name').first(),
  );
  const tokenPoint = await position(stageToken);
  await page.mouse.move(tokenPoint.x, tokenPoint.y, { steps: 20 });
  await page.mouse.move(tokenPoint.x + 1, tokenPoint.y + 1);
  await page.locator('[data-tr-dnd-hover-bin="diffLow"]').waitFor();
  await finish(page.locator('[data-tr-dnd-hover-bin="diffLow"]'));
  assert(
    commands.some(
      (c) => c.includes('"op":"difficulty"') && c.includes('"value":3'),
    ),
  );
  console.log("PASS PC roll ghost → anchored difficulty ring");
  await start(
    page.locator('[data-tr-dnd-roll="pcRollPreroll"] .roll-name').first(),
  );
  await finish(page.locator('[data-tr-dnd-bin="pool"]').first());
  await page.locator(".dice-ring-btn").first().waitFor();
  await page.keyboard.press("Escape");
  console.log("PASS roll → existing pool editor");

  await start(stageToken);
  await finish(page.locator('[data-tr-dnd-bin="edit"]').first());
  await page.locator(".lab-scrim input").first().waitFor();
  await page.keyboard.press("Escape");
  console.log("PASS NPC → existing editor");
  const countBefore = rollsBefore();
  await start(stageToken);
  await page.keyboard.press("Escape");
  await page.mouse.move(1300, 500, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.locator(".tr-dnd-chrome.is-active").count(), 0);
  assert.equal(rollsBefore(), countBefore);
  console.log("PASS Escape cancels captured stage gesture");
  await page.locator(".lab-dock-rail").click();
  const group = page
    .locator('.lab-group[draggable="true"]')
    .filter({ has: page.locator(".lab-group-cluster") })
    .first();
  await group.waitFor();
  const keys = await group.locator(".headshot img").evaluateAll((imgs) =>
    imgs.map((i) =>
      decodeURIComponent(
        i
          .getAttribute("src")
          .split("/")
          .at(-1)
          .replace(/\.webp$/, ""),
      ),
    ),
  );
  assert(keys.length > 1, "test group must have several members");
  await start(group);
  assert.equal(
    await page.locator("[data-tr-dnd-bin]").count(),
    0,
    "group opened character bins",
  );
  assert(
    (await page.locator(".tr-dnd-ghost-count").textContent()).includes(
      String(keys.length),
    ),
  );
  const layer = page.locator(".lab-stage-layer").first(),
    lb = await layer.boundingBox();
  await page.mouse.move(lb.x + lb.width * 0.3, lb.y + lb.height * 0.4, {
    steps: 18,
  });
  await page.mouse.up();
  await page.waitForTimeout(150);

  for (const key of keys)
    assert.equal(
      await page
        .locator('.lab-stage-layer [data-tr-dnd-staged="' + key + '"]')
        .count(),
      1,
      "group member missing " + key,
    );
  console.log("PASS roster group → family, all members placed");
  const beforeInvalid = rollsBefore();
  await start(group);
  await finish(rollCard);
  assert.equal(rollsBefore(), beforeInvalid);
  console.log("PASS roster group → roll rejected");
  // The bottom strip remains draggable even when there is no active scene.
  world.phase.phase = "Downtime";
  world.clock.activeClock = "present";
  delete world.scene.liveKey;
  delete world.scene.liveTitle;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.lab-seat-slot[data-seat-key="Pink"]').waitFor();
  assert.equal(await page.locator(".lab-stage-layer").count(), 0);
  const idleBefore = rollsBefore();
  await start(page.locator('.lab-seat-slot[data-seat-key="Pink"]').first());
  await finish(page.locator('[data-tr-dnd-bin="std"]').first());
  assert.equal(rollsBefore(), idleBefore + 1);
  console.log("PASS downtime PC → roll bin");

  world.phase.phase = "Play";
  world.clock.activeClock = "scene";
  world.scene.liveKey = "browser-scene";
  world.scene.liveTitle = "Browser verification";
  world.scene.tableKey = "Scatter";
  world.scene.placementMode = "scatter";
  world.seats.stage = [];
  world.seats.scatter = [
    {
      group: 1,
      pcs: [{ characterKey: pc.characterKey }],
      npcs: [{ characterKey: npc }],
    },
  ];
  await page.reload({ waitUntil: "domcontentloaded" });
  const scatterToken = page
    .locator(".lab-stage-layer [data-tr-dnd-staged] .lab-token-head")
    .first();
  await scatterToken.waitFor();
  const scatterBefore = rollsBefore();
  await start(scatterToken);
  await finish(page.locator('[data-tr-dnd-bin="std"]').first());
  assert.equal(rollsBefore(), scatterBefore + 1);
  console.log("PASS Scatter token → roll bin");

  // Persisted seat folds must not collapse newly loaded rolls.
  await page.evaluate(() => localStorage.setItem("tr-dashboard:roll-folds", JSON.stringify("Pink,npc")));
  world.rolls.pcs[0].phase = "resolved";
  world.rolls.pcs[0].done = true;
  world.rolls.pcs[0].result = { text: "WIN +3", margin: 3 };
  await page.reload({ waitUntil: "domcontentloaded" });
  const completed = page.locator('[data-tr-dnd-roll="pcRollPostroll"]');
  await completed.waitFor();
  assert.equal(await completed.evaluate((node) => node.classList.contains("collapsed")), false);
  assert.equal(await page.locator('[data-tr-dnd-roll="npcRollPreroll"]').evaluate((node) => node.classList.contains("collapsed")), false);
  const beforeMargin = commands.length;
  await start(completed.locator(".roll-name"));
  await finish(page.locator('[data-tr-dnd-roll="npcRollPreroll"]'));
  assert(commands.slice(beforeMargin).some((c) => c.includes('"op":"npcDifficulty"') && c.includes('"value":3')));
  console.log("PASS new rolls open despite saved folds; completed PC margin → NPC difficulty");

  await page.screenshot({ path: path.join(output, "dnd-final.png") });
  assert.deepEqual(errors, []);
  console.log("PASS no browser exceptions");
} finally {
  await browser.close();
}
