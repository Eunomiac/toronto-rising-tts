# Generic NPC catalogue

## Agent Routing

Read this when:
- changing the **Generic** roster view in the Storyteller Dashboard **Scenes** tab
- refreshing generic NPC rows from the Google Sheet
- changing when the Generics Export sheet is refreshed into `generic-npcs.json`
- Lua spawn/membership (CONTROL_BOARD, scene library): [`.dev/NPC Object Spawning & Spotlighting/Generic NPCs.md`](../NPC%20Object%20Spawning%20%26%20Spotlighting/Generic%20NPCs.md)

Source of truth:
- Sheet named range `GENERICNPCCSV` (columns `filename,label,key,tags`)
- Generated catalog `.dev/storyteller-dashboard/data/generic-npcs.json`
- Cutouts: `assets/NPC Art/Figurines/Generic/npc_<key>.webp` (local Steam Cloud mirror; do not copy or duplicate)
- Import: `.dev/scripts/import_generic_npcs_from_sheet.js` (same public CSV export as skyboxes)
- Parse: `.dev/scripts/lib/generic_npcs_sheet_csv.js` (reuses `parseCsv` from `.dev/scripts/lib/skyboxes_sheet_csv.js`)
- Dashboard UI: `.dev/storyteller-dashboard/` (port 8788) — **refreshes the catalog on server startup**

Verification:
- Restart **STORYTELLER DASHBOARD** and confirm the console logs a catalog refresh
- `npm run generic-npcs:import:test`
- Optional manual: `npm run generic-npcs:import`
- The Scenes tab roster's **Generic** view shows the latest sheet rows

Status: current

---

## What this is

The Storyteller Dashboard's **Scenes** tab lets you search the generic cutout catalogue and spawn a generic NPC into the live scene under a name the players will see. Lua spawn/membership/destroy: [`.dev/NPC Object Spawning & Spotlighting/Generic NPCs.md`](../NPC%20Object%20Spawning%20%26%20Spotlighting/Generic%20NPCs.md).

Generate NPC (OpenAI) stays on its own tab.

---

## How the data is imported (same pattern as skyboxes)

Skyboxes already refresh from a Google Sheet at build time with **no OAuth**:

1. Spreadsheet is **anyone with the link can view**.
2. Script fetches a public CSV URL, rejects HTML/login/error pages, parses with the shared `parseCsv` helper, writes a generated file.

Generic NPCs use those same rules. Skyboxes can use `/export?format=csv&range=SKYBOXCSV`. That named-range export returns **HTTP 400** on the Toronto Rising workbook (unbounded `A:D` named ranges often do), so this importer uses the public Visualization CSV for the **Generics Export** tab instead — still no login, still no extra libraries.

```text
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Generics%20Export
```

Design notes for skyboxes: [`docs/superpowers/specs/2026-07-21-skybox-sheet-import-design.md`](../../docs/superpowers/specs/2026-07-21-skybox-sheet-import-design.md).

| | Skyboxes | Generic NPCs |
| --- | --- | --- |
| Spreadsheet | Skyboxes sheet (`1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4`) | Toronto Rising sheet (`10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs`) |
| Authoring | Named ranges `SKYBOXCSV` etc. | Named range `GENERICNPCCSV` on tab **Generics Export** |
| Fetch | `/export?format=csv&range=…` | `/gviz/tq?tqx=out:csv&sheet=Generics Export` |
| Output | `lib/skyboxes_catalog.ttslua` | `.dev/storyteller-dashboard/data/generic-npcs.json` |
| npm | `skyboxes:import` | `generic-npcs:import` (optional manual) |
| When it runs | `build:full` / `build:all-tooling` | **Storyteller Dashboard server startup** (not the TTS build) |

If the sheet fetch fails at startup but `generic-npcs.json` already exists, the dashboard keeps serving that last good file and prints an error. If there is no file yet, startup fails.

Do **not** add Drive MCP, Google OAuth, Papa Parse, or a second CSV parser. Do **not** keep a hand-edited CSV next to the dashboard as a second source of truth.

### Commands

Restart the dashboard (VS Code task **STORYTELLER DASHBOARD**, or `npm run storyteller-dashboard:dev`) to refresh from the sheet.

Optional manual refresh from repo root:

```powershell
npm run generic-npcs:import:test
npm run generic-npcs:import
```

Overrides: `--sheet-id`, `--tab`, `--range`, or env `GENERIC_NPC_SHEET_ID` / `GENERIC_NPC_TAB` / `GENERIC_NPC_RANGE`.

---

## Columns

Header must be `filename,label,key,tags` (order can vary; names are matched after trim/lowercase).

| Column | Meaning |
| --- | --- |
| `filename` | Basename of the cutout without the `npc_` prefix (example: `civilianChildBoy_01.webp` for `assets/NPC Art/Figurines/Generic/npc_civilianChildBoy_01.webp`). Must be `.webp`. No folders. |
| `label` | Text under the thumbnail. |
| `key` | Clipboard value (Lua-style identifier, e.g. `civilianChildBoy_01`). Unique. |
| `tags` | Space-separated search words. |

Clipboard example:

```text
civilianChildBoy_01,dogAngry_02,crimePolice_03
```

---

## Dashboard behavior

The catalogue is the **Generic** view of the roster in the **Scenes** tab (`MasonryRoster` in `src/client/scenesPanel/glance.tsx`, catalogue loaded once from `GET /api/generic-npcs`).

- **In this scene** lists the generic NPCs already spawned (from the `seats` push's `generics`); drag them onto the stage like any other token.
- The rest of the catalogue shows as groups, one per catalogue name (every "Police" variant in one group), laid out like the Main view's coteries. Generic categories are separate from Main's (`view: "generic"` on the roster category; group keys are `generic:<name>`), and a generic group has a colour but no leader. Spawned variants drop out of their group.
- The roster search box switches to a flat list: every whitespace-separated term must match (AND) against label + tags + key (case-insensitive). At most 60 matches show.
- Clicking a catalogue token queues it onto the stage: a `genericAdd` scene op (`GenericNpcs.importNamed` in Lua, named after the catalogue label) plus a stage placement on the free slot nearest the stage's top-left corner (`freeSlotNear(ADD_CORNER, …)` in `stage.ts`), so several clicks gather loosely in that corner. Nothing spawns until Send; drag them anywhere first. Queued generics drop out of the catalogue and show on the board under their pending name (`PendingGenericsContext`).
- **Stat tiers.** Each catalogue name is one generic *type* with up to four stat blocks (Weak / Average / Gifted / Deadly), edited from any of its tokens' settings window → **Stats** (`npc-stats.json` key `generic:<name>`). A click on a catalogue token adds it with no tier when the type has no blocks, with the only tier when it has one, and opens a tier picker (`TierPicker`) when it has several; the tier rides on `genericAdd { tiers }` and is stored in `genericMembership[key].tier`. The tier badge (`TierBadge`) shows at the top-left of the stage token, the "In this scene" token and the seat (right of the seat number). An in-scene generic's settings window has a **Tier** select that queues `genericTier` (`GenericNpcs.setTier`). `GenericTiersContext` carries the scene's tiers with queued changes applied.
- **Kept characters.** On the live table, an in-scene generic's settings window has **Keep as a character**: it saves `kept:<id>` in `npc-stats.json` (`{ kept: { name, figurineKey, label }, named: <copy of its tier's block> }`) and sends `genericKeep` at once (not queued). From then on **Stats** edits the kept character's own block, the Tier select is gone, renaming also renames the record, and its trackers carry across scenes for the rest of the night (`useNpcLive` passes `keptId` to `statBlockFor`). Clicking the button again arms it ("Click again: delete their stats"); the second click sends `genericKeep` with no id and deletes the record. The roster's Generic view lists kept characters not already in the scene under **Kept** (`KeptToken`): a click queues `genericAdd { kept }` on their figurine (greyed out while that figurine is in the scene or the queue), a right-click opens their Stats.
- **Trackers** (any NPC on the live table, named or generic). A single click on a seated NPC, or on a stage token (a press with no drag; it waits a moment so a double-click still lights / darkens), opens `NpcTrackerPopup` (`scenesPanel/npcTrackers.tsx`): Health and Willpower boxes (maximums from the NPC's stat block; with no block, damage is shown but not capped), plus Hunger for vampires and Rage for werewolves (or NPCs flagged Werewolf). Health / Willpower open the PC-style damage ring (`TraitRing` with `RingAction<ScenesCommand>`); Hunger / Rage dots go up on left-click, down on right-click. Every click sends `npcTracker` straight to TTS (`NpcTrackers.applyChange`, not queued); values come back in the `seats` push's `trackers`. Hunger or Rage at 3+ shows a droplet badge (`NpcLevelBadge`) at the top-right of the stage token, the roster token and the seat. `NpcLiveContext` (live table only; drafts have none) resolves each NPC's block (`statBlockFor` with the generic catalogue label and the scene tier). A vampire's Health ring adds **Mend +N** (N = its Blood Potency mending), which sends the roll command `npcMend` through `RollsCommandContext`: a one-die rouse in a free Storyteller drawer that confirms itself, heals N superficial Health either way and raises Hunger on a failure.
- **Rolling from stats.** While the live NPC roll is still open (setup / ready) and the NPC has a stat block, its roll card shows a **Roll from the NPC's stats** action that opens `NpcConfigure` (`scenesPanel/rolls/npcConfigure.tsx`): the pool diamonds (manual dice ring), a Blood Surge toggle for vampires (only on roll types that allow it; it sends `npcSurge` at once, the same as the droplet action on the roll card, and the surge stays on across a pick), every pool, attack and power as a button showing the dice it would roll (hover for the breakdown: discipline bonus, each rouse check, the attack bonus), and the NPC's Notes. Each button runs `planNpcRoll` (`src/shared/npcRollPlan.ts`) on the block, tonight's Hunger / Rage and the card's roll type; a pick sends `npcStatRoll`, or for a passive power `npcAnnounce` then `npcCancel`. An entry the planner rejects (for example an attack pointing at a deleted pool) shows "fix in Stats" with the reason on hover.
- **Difficulty from a dropped NPC.** Drag any NPC (roster token, seat, or stage token) onto a PC roll card that is still open: its difficulty strip lights the NPC's `difficultyStrong` (red) and `difficultyWeak` (green) from the stat block. Dashboard-only (`RollsCell` holds it per `rollId`; cleared on a pick). Stage tokens reach the card through `rollCardAt` + `NPC_ROLL_DROP_EVENT` in `stage.ts`, so a token dropped on a card never moves on the stage.
- Right-click a generic's stage token → **Rename…** sets the name the players will see. A queued generic's `genericAdd` label is rewritten; a spawned one queues `genericRename` (`GenericNpcs.rename`).
- Hovering a catalogue token shows the full figurine cutout floating right of the roster (`FigurinePreview`).
- Scene previews (`DraftPanels`) carry the same notes-and-roster dock. There a generic joins the draft row's `sessionScene.npcWorld.genericMembership` with a placement (`applyToDraft` `genericAdd` / `genericRename`; taking it off the draft stage or Clear drops it), and TTS spawns it when the scene plays (`GenericNpcs.registerFromMembership` on scene Apply, then the reconciler spawns each placed generic). `SceneGenericsContext` points the roster's "In this scene" list at the draft instead of the table.
- Token headshots load from `/figurine-images/<key>.webp`, which serves the Generic folder when the key is not a named NPC.

The old standalone **Stage NPCs** tab (thumbnail grid, saved search tags, Copy keys) was retired when the Scenes tab took over generic NPCs.

**Sheet → Lua labels:** `npm run build:full` reads `generic-npcs.json`, bakes each label into that generic NPC's spotlight token, and writes it as `genericLabel` on the NPC's row in `lib/npc_art_urls.ttslua`. `D.initGenericNPCs()` registers exactly those rows, so TTS learns a new or relabelled generic only after `npm run build:full` (art: [NPC Art Pipeline](../NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Art%20Pipeline.md)).
