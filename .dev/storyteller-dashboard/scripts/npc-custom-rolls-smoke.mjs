// Real browser/layout regression with synthetic stats; no TTS connection or campaign files.
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "playwright/test";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = `__npc-rolls-smoke-${process.pid}`;
const html = path.join(root, `${prefix}.html`);
const entry = path.join(root, `${prefix}.tsx`);
let server, browser;
const written = [];
try {
  await writeFile(html, `<html><body><div class="lab-canvas" style="position:relative;width:1920px;height:1080px"><div id="smoke-root"></div></div><script type="module" src="/${prefix}.tsx"></script></body></html>`, { flag: "wx" });
  written.push(html);
  await writeFile(entry, `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {NpcStatsModal} from './src/client/scenesPanel/npcStatsModal';
import {Difficulty} from './src/client/scenesPanel/rolls/RollsCell';
import './src/client/styles/styles.scss';
function Smoke() {
  const [open,setOpen]=useState(true);
  return <>{open && <NpcStatsModal statsKey="npc" label="Custom rolls" generic={false} onClose={()=>setOpen(false)}/>}
    <div id="minimum-rule" style={{position:'absolute',top:50,left:30,width:320}}><Difficulty value={undefined} editable title="Difficulty" rule="12+" noneCell onPick={()=>{}}/></div>
  </>;
}
createRoot(document.getElementById('smoke-root')!).render(<Smoke/>);
`, { flag: "wx" });
  written.push(entry);
  server = await createServer({ root, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let saved;
  const fixture = { npc: { named: {
    kind: "vampire", bloodPotency: 2,
    exceptional: [{ id: "roll", name: "Concentration", dice: 8 }],
    attacks: [{ id: "attack", name: "Strike", pool: "ex:roll", bonus: 2 }],
    powers: [{ name: "Dominate", powers: [{ level: 1, name: "Command", rouse: 1, pool: "ex:roll" }] }]
  } } };
  await page.route("**/api/npc-stats", async (route) => {
    if (route.request().method() === "PUT") saved = route.request().postDataJSON();
    await route.fulfill({ json: saved ?? fixture });
  });
  await page.goto(`${origin}/${prefix}.html`);
  for (const name of ["Concentration", "Strike", "Command"]) {
    const nameField = page.locator(`input[data-roll-name][value="${name}"]`);
    const row = nameField.locator("xpath=ancestor::div[contains(@class,'npc-custom-roll')][1]");
    const top = row.locator(".npc-roll-bar.pools"), bottom = row.locator(".npc-roll-bar.difficulties");
    await expect.poll(async () => (await top.boundingBox())?.height ?? 0).toBeLessThan(1);
    await nameField.click();
    await expect.poll(async () => (await top.boundingBox())?.height ?? 0).toBeGreaterThan(25);
    await expect.poll(async () => {
      const a = await top.boundingBox(), b = await nameField.boundingBox(), c = await bottom.boundingBox();
      return a && b && c && a.y + a.height <= b.y + 1 && c.y >= b.y + b.height - 1;
    }, { message: `${name}: editing bars settle above and below the name` }).toBe(true);
    await page.getByRole("textbox", { name: `${name} first trait`, exact: true }).fill("Resolve");
    await page.getByRole("textbox", { name: `${name} second trait`, exact: true }).fill("Composure");
    await page.getByRole("textbox", { name: `${name} difficulty rule`, exact: true }).fill("3-5");
    await expect(row).toHaveClass(/editing/);
    if (name === "Strike" && process.env.NPC_ROLLS_SCREENSHOT) await page.screenshot({ path: process.env.NPC_ROLLS_SCREENSHOT });
    await page.locator(".npc-stats-notes").click();
    await expect.poll(async () => (await top.boundingBox())?.height ?? 0).toBeLessThan(1);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".npc-stats")).toHaveCount(0);
  const block = saved.npc.named;
  for (const roll of [block.exceptional[0], block.attacks[0], block.powers[0].powers[0]]) {
    assert.deepEqual(roll.traits, ["Resolve", "Composure"]);
    assert.equal(roll.difficulty, "3-5");
  }
  assert.deepEqual(await page.locator("#minimum-rule button").allTextContents(), ["–", "12", "13", "14", "15"]);
  assert.deepEqual(errors, []);
  console.log("NPC custom rolls browser smoke passed: all three bars, focus retention, layout, persistence, and minimum filter.");
} finally {
  await browser?.close();
  await server?.close();
  await Promise.all(written.map((file) => unlink(file)));
}
