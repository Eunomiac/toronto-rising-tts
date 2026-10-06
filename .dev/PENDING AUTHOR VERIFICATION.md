# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Issues listed here should be **Awaiting Author Review** in Linear.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⏰** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |
| **🚫** | Author | Irrelevant or obsolete - feature being tested is to be replaced by the Storyteller Dashboard; follow-up validation of this issue can be discarded (see **Author Comment**s for more details on how to handle the Linear issue) |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row and set Linear to **Awaiting Author Review** whenever they ship in-game code. They process your **✅** / **❌** / **⚠️** marks on the next inbox. A **✅** moves the Linear issue to **Fully Complete** by default, or **Complete (KEEP)** when its Linear history should be retained. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-10-06 — TOR-662 (Black Caesar's page 6 Experience Log missing) added; TOR-661 (Prince's Court haven traits display) added; TOR-660 (dashboard Page 2 Blood Potency effects) added; TOR-659 (dashboard requests refused until the save finishes loading) added; TOR-658 (ST roll dashboard usable from any seat) added; TOR-657 (Trace Sync timing) added; earlier today TOR-653 (dashboard sheet Pages 2–3 editing) TOR-654 (dashboard sheet Page 6 XP log) TOR-655 (relationships in gameState, dashboard Page 4) and TOR-656 (dashboard sheet Page 5 projects) added._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-659 — Dashboard requests refused until the save has finished loading

**How to verify:** Open the dashboard on any tab other than PCs. Press Save & Play, and while TTS is still loading (before the console shows "Module Loaded"), click the dashboard's **PCs** tab. The tab should say "TTS is still loading the save. Try again in a moment." instead of showing an error, and the TTS Editor output should show a `[Dashboard] Request refused: the save has not finished loading.` line, not a red `relationships missing` Lua error. Leave the PCs tab open: within a few seconds of the load finishing, the sheets should fill in by themselves without you clicking anything. Then use the dashboard normally (change a tracker, open Page 5) to confirm nothing is refused once the game has loaded.

### Medium — debug tooling

#### TOR-657 — Trace Sync: timed, nested, filterable output

**How to verify:** Save & Play. In the TTS Tools output panel, type `SyncTrace` into the output filter box so only trace lines show. Click **Trace Sync** on the Debug panel (it turns yellow). The first trace line should say "trace ON" and give a clock resolution; if the resolution is well under 1 ms the timings are trustworthy, and if it says around 15 ms, tell me. Now add a few NPCs to the Stage Control Board and press **Apply**. You should see one block of lines that all share the same `#` number, starting with `Sync.npcs` and indented underneath with `NPCS.reconcileAllFromState`, the control-board reconcile, and so on, each with a time in ms. Slow calls say `>1 frame`. The old always-on `[Sync.npcs] reason=...` line should no longer appear. Next, change a PC's Hunger from the Storyteller PCs panel and press its Apply. Expect several separate blocks in a row (`Sync.player`, `HO.reconcileForSeat`, `PCST.refreshCharacterSheetsForColor`, `PCST.refreshRow`, `HO.syncAll`), each with its own `#` number. That is the scattered refresh pattern we discussed, now visible with times. Finally click **Trace Sync** again to turn it off (grey). A `SUMMARY` table should print, listing each function with how many times it was called and how long it took in total, slowest first. Please paste me that summary along with the Apply block, since they are the starting numbers for the performance work.

### Medium — Prince's Court sheet

#### TOR-661 — Haven Backgrounds / Merits / Flaws show on the Prince's Court sheet

**How to verify:** Save & Play. From the right sidebar, open The Court and click the right arrow once to reach the second spread (Domain on the left, Haven on the right). Under the Haven header on the right-hand page you should now see a **Haven Merits** divider with three merits side by side: **Cells** (2 dots), **Warding (Animals)** and **Watchmen** (2 dots), each with its flavour and rules text. There should be no Haven Backgrounds or Haven Flaws dividers, because those are empty. Then open the Storyteller **Stats** panel, pick Coterie, and add a Haven Flaw called "Test Flaw" with one dot: a **Haven Flaws** divider should appear on the Court page with the red-dot flaw beneath it. Delete the test flaw and check that the divider disappears again. The Domain Merits and Flaws on the left-hand page should look exactly as before. Finally, edit **Warding** in the Stats panel to Max 1 and Base 1: its title bar should show a single yellow dot and no empty circles. Raise Max back to 3 and two empty circles should reappear to its left. Next, add a fourth, fifth and sixth Haven Merit from the Stats panel: each OK should close the editor and the new merit should appear on the Court page in a second row under the first three. Try a seventh: the editor should stay open and a red message should say "Haven Merits is full (6 entries). Delete one before adding another." Delete your test merits afterwards. On the first spread, Coterie Backgrounds should now sit in three columns: Resources on the left, Mawla: The Aristocrat in the middle, Influence: Nightlife on the right. Finally, add a test Domain Background: a **Domain Backgrounds** divider should appear at the top of the left-hand page with the entry beneath it, and disappear again when you delete it.

### Medium — dice & rolls

#### TOR-658 — Storyteller roll dashboard usable from any seat

**How to verify:** Save & Play. Use the Debug panel seat buttons to move to a PC seat such as Red. Start a Storyteller roll from the dashboard and set its pool and difficulty by clicking the grid strips on the ST roll panel; the cells should respond. Roll it, click a couple of dice on the ST panel so they highlight, and press **REROLL**; only those dice should reroll. Then start a roll for a PC from the dashboard, change the difficulty strip on that PC's row, roll it, and use the post-roll add/remove-die cells; they should highlight on hover and change the pool. Everything should behave exactly as it does when you sit at Black.

### Medium — character sheets

#### TOR-662 — Black Caesar's Experience Log missing from character sheet page 6

**How to verify:** Save & Play, then open Black Caesar's character sheet and turn to page 6. The Experience Log should now list his past sessions, starting with **PREGAME** at the top and going back through Time of Dominion, Time of Faith, Time of Excess, Time of Lineage and Time of Violence to **ANCILLA**, spread across pages you can step through with the down chevron. The entries and totals should match what the dashboard shows on his **V · VI** tab. Glance at one other PC's page 6 (for example Aishe) to confirm it still looks the same as before.

### Medium — Storyteller Dashboard character sheet

#### TOR-653 — Dashboard sheet Pages 2–3: edit disciplines, powers, rituals, ceremonies and advantages

**How to verify:** Save & Play, open the dashboard PCs tab, pick a PC and click the **I · II** tab. Page 2 should list the same disciplines and powers as that PC's in-game sheet. Raise a discipline's base dot from its dot ring and check that the in-game Page 2 gains the dot. Use **+** under a discipline to add a power called "Test Power", then click it and delete it; it should appear and disappear on the in-game sheet too. For a PC with Blood Sorcery, add and remove a ritual the same way. Add a discipline with **+ Discipline**, delete it, reload the save, and confirm it stays deleted.

Then click the **III · IV** tab. Page 3 should show the same Backgrounds, Merits and Flaws as the in-game sheet, with Camarilla and Clan Status as a dot strip at the top. Add a merit called "Test Merit" with two dots; it should appear in-game with that exact name. Open it, change the type to Flaw and save; it should move to Flaws (red dots) in both places. Disable one of its dots from the dot ring (a crossed-out grey dot should appear in-game), then delete it. The TTS Stats panel's Add button now also keeps the name you type.

#### TOR-654 — Dashboard sheet Page 6: Experience Log display and XP popup

**How to verify:** Save & Play, open the dashboard PCs tab, pick a PC and click the **V · VI** tab. Page 6 should list the same sessions, entries and totals as that PC's in-game Page 6, newest session first, with the current session highlighted. Click the XP jewel (Page 1 or Page 6) to open the Experience popup. Choose Gain, enter 2 with the description "Dashboard test" and click **Apply**; the entry should appear on both the dashboard and the in-game Page 6 and the jewel total should rise by 2. Click **Undo** and check it disappears in both places. Then apply a 1 XP spend with **Apply to All**: every connected PC should get it and a disconnected PC should not. Click **Undo All** and check it is removed from every PC that got it.

#### TOR-655 — Relationships move into gameState; dashboard sheet Page 4 editing

**How to verify:** Save & Play, then open each PC's Page 4 in TTS and check it looks the same as before (relationships now load from the save rather than a data file). On the dashboard PCs tab, pick a PC and click **III · IV**; Page 4 should list the same relationships. Click **+ Childe**, give it a name, a line of text and a portrait, and click **Add**: it should appear on the in-game Page 4. Open it again, link a second PC as a Contact and save: the second PC's in-game Page 4 should show it under Other Relationships. Change a thrall's Bond Strength and check the red boxes update in-game. Delete the test entry and confirm it disappears from both sheets. Add a second touchstone to one PC and check Page 4 still builds with both stacked on the left. Finally save, reload the game, and confirm your edits stayed.

#### TOR-656 — Dashboard sheet Page 5: projects cards and full project editor

**How to verify:** Save & Play, open the dashboard PCs tab, pick a PC who has projects and click **V · VI**. The cards should match that PC's in-game Page 5 (same order, scope dots, dates, die); click **Coterie** and the list should match the Prince's Court project cards. Click **+ Project**, fill in owner, goal, scope 3, increment Weekly, launch skill and advantage, and press **Save**: it should appear on the in-game Page 5 and in the TTS Projects panel, and Difficulty should read 5 when you reopen it. Press **R** and check the launch roll starts for that PC just like the panel's R button. Set Result to Win and Margin to 1, add a stake row on one of the PC's backgrounds, and follow the Begin line until it says Ready, then press **Lock & Begin**: the in-game Page 5 should show the Win badge, the stake dots and the project die. On a project that has not begun, change the scope or a stake quantity and check the in-game Page 5 repaints right away (it used to ignore those). Advance the present-day clock and check the die drops on the in-game sheet and on the Court cards (and on the dashboard after **Refresh**). Finish by pressing **Complete**, then **Delete** twice, and confirm the test project disappears everywhere.

#### TOR-660 — Dashboard sheet Page 2: Blood Potency effects

**How to verify:** Save & Play, open the dashboard PCs tab, pick Aishe and look at Page 2. In red handwriting like Page 1's "Mend for", the Disciplines header should read **Reroll Level 1** on the left and **+1 Discipline Bonus** on the right (next to the small + Discipline button), and **Bane Severity 2** should sit at the top right of the blank area at the bottom of the page (left empty for your clan bane artwork). Then raise Aishe's Blood Potency by one from the Page 1 dot ring; all three Page 2 numbers should follow the same Blood Potency table as Mend and Blood Surge (BP 3 gives Reroll 2, +1 Bonus, Severity 3). Put her Blood Potency back afterwards.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
