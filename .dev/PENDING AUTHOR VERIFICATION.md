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

_Last populated: 2026-10-06 — TOR-653 (dashboard sheet Pages 2–3 editing) TOR-654 (dashboard sheet Page 6 XP log) TOR-655 (relationships in gameState, dashboard Page 4) and TOR-656 (dashboard sheet Page 5 projects) added._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

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

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
