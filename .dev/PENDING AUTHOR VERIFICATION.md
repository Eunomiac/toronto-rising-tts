# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Verification Failures:** / optional **Verified:**) |
| **⚠️** | Author | Bad expectations (+ **Corrections:**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-26 — Linear Done-without-confirm sweep. Added **TOR-507**, **TOR-508**, **TOR-509**, and **TOR-510**. Author confirmed **TOR-506** (End→Intermission audio with the cover) on 2026-08-22. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### ⌚ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-507 — Numbered table slots and figurine offsets

**How to verify:** Save & Play so the new scripts load. On Table A, Red should still sit in the center-front chair, Orange on Red’s right, and Pink on Red’s left; empty chairs should be plain wood with no spare throne. Switch to Table B and Table C from the Scenes panel — the same occupant order should hold, and cameras should still look at the person in that chair. On the PCs panel, turn Absent on for one player: their pile should drop under the table like an unused NPC. Turn Absent off: they should take the lowest free chair, or you should get an error if the table is full. Hidden character-sheet pages should stay hidden. The signal fire should sit at table height (about Y 7.85), not the tiny hide scale. If you Import or Apply a library scene that is missing a chair number on an in-session PC, you should get a named error, not a silent fallback.

**Context:** Phase 1 of the player-positioning redesign. Scatter, orbit, and join seating are still Phase 2.

---

### Medium — load console / Scenes picker

#### TOR-508 — Rain particles no longer print a missing GUID on load

**How to verify:** Save & Play. On load you should **not** see `[Soundscape] Rain particles: No object found ... (bootstrap silence)` in the console. Outdoor rain and weather should still switch the rain-particle visual while the scene cover is down, the same way they did after the outdoor-rain work.

**Context:** The rain-particle object was always in the save. During load the script asked for it before Tabletop Simulator had objects ready, and printed a missing-GUID error. Audio emitters already skipped that quietly; rain particles now do the same. A later weather apply still prints if the GUID is truly gone after objects exist.

#### TOR-509 — Hidden skyboxes stay out of the Scenes picker

**How to verify:** Save & Play, open the Storyteller Scenes panel, and click Skyboxes. Spotlight should not appear in the list. Other skyboxes should still be there. A scene or site that already uses Spotlight should still apply that skybox.

**Context:** The sheet now has an `isShown` column. Hidden rows stay in the catalog so existing overrides still work; they are only omitted from the picker. Live import had 95 catalog skyboxes, 94 in the picker plus Generic, and 1 hidden (Spotlight).

#### TOR-510 — Memoriam skybox catalog import

**How to verify:** This does not change anything you click in the Scenes panel yet. After Save & Play, the game should still load normally. To inspect the data, open `lib/skyboxes_catalog.ttslua` and look at `SkyboxesCatalog.MemoriamSkyboxes` — for example `aishe.aishe2`, and `lucien14` under both `lucien` and `fomorach`. After you add Keys or URLs on the sheet, run `npm run skyboxes:import` again (or the usual build pipeline) to refresh.

**Context:** Catalog import only. Draft rows without a Key or panel labels are skipped so they do not block the import. Live import wrote 51 Memoriam entries across five characters.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
