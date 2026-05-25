# Manual E2E playbooks (Toronto Rising)

Ordered, in-table verification scripts for critical systems. Run as the table **Host** (the only connected client in solo dev).

**Linear:** **TOR-141** (Manual E2E playbooks — living doc, stays open). Multiplayer follow-up: **TOR-144** (multiplayer E2E checklist).

## Maintenance contract (TOR-141)

Update these playbooks in the **same PR** when you change behavior they cover:

| Trigger | Update |
| --- | --- |
| Roll FSM, bags, WP, Take Half, rouse, ST rolls | [Dice-E2E.md](Dice-E2E.md) |
| Scene library apply, clock, present day, RT ticker, seats, map pins | [Scenes-E2E.md](Scenes-E2E.md) |
| New/removed `DEBUG.*` console helpers | [TESTING.md](../TESTING.md) + relevant playbook |
| Purge/replace automated test panels | [TESTING.md](../TESTING.md), [RUNNING TASKLIST.md](../RUNNING%20TASKLIST.md) |

Agents: if shipped code diverges from a playbook step, fix the doc or file a **Bug** — do not leave silent drift.

## Prerequisites

1. **Save & Play** from this repo so TTS runs the current bundled Lua (External Editor alone is not enough).
2. **Single connection (typical solo dev):** You are the only player at the table. You have **Host** privileges regardless of which seat color you occupy. You **cannot** be seated at Black and Brown simultaneously — only one seat at a time.
3. **Seat choice:**
   - **Scenes + DEBUG + Storyteller toolbar:** Recommended seat **Black** (Storyteller). UI uses `visibility="Host"`; Black matches ST/dice-tray layout.
   - **Dice (physical bags / roll panel):** Arm rolls with `rollTest("Brown", …)` from console (no second client required). To click bags or read Brown’s panel while staying on Black: TTS **View** → show **Brown** (and hide others if helpful). Alternatively, sit at **Brown** only for those steps, then return to Black for ST roll checks.
4. Scene library has **two distinct scenes** prepared for Suite B (different `siteKey`, lighting preset, and `npcWorld.byArea` if possible).
5. TTS console (`~`) or **External Editor** execute on Global (`guid` `-1`) for Lua snippets below.

## Conventions

| Symbol | Meaning |
| --- | --- |
| **Pass if** | Continue to next step |
| **Stop if** | Do not continue — fix this layer first |
| **IDE Lua** | Paste into External Editor / execute on Global; globals only (`S`, `DEBUG`, `SS`, `JSON`, `C`, `RC` when loaded) — **no `require`** |

Snippets are diagnostic only. Do **not** call `Sync.full({ force = true })` during normal passes except the labeled **repair** step in each playbook.

## Playbooks

| Doc | Scope |
| --- | --- |
| [Scenes-E2E.md](Scenes-E2E.md) | Scene smoke (A–E) + deep suites: present day clock, RT autoprogression, clock draft, seat/map pins (absent vs present), library flush (F–N) |
| [Dice-E2E.md](Dice-E2E.md) | Roll FSM smoke (A–E) + deep suites: classification, Take Half, WP, compound rouse, bags, baton/automation, Bestial Null, Blood Surge, ST/Werewolf, Oblivion multi-die (G–P) |

## Related docs

- [TESTING.md](../TESTING.md) — console helper index (`rollTest`, `showState`, …)
- [HUD_FUNCTIONS.md](../HUD_FUNCTIONS.md) — Scenes / Sound panel handlers
- [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md)
- [TTS_MCP.md](../TTS_MCP.md) — agent execute / `TR_AGENT_V1` lines

## TOR-144 (out of scope here)

After solo suites pass, **TOR-144** (multiplayer E2E) adds a checklist for multiple real clients — optional until you can invite others.
