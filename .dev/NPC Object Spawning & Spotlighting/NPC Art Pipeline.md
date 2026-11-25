# NPC Art Pipeline (figurines)

## Agent Routing

Read this when:
- adding or renaming an NPC's figurine (named, generic, or Memoriam)
- touching `lib/npc_art_urls.ttslua`, `core/npc_spawn.ttslua` URL lookup, or the roll-banner figure in `core/roll_ui.ttslua`

Source of truth:
- Figurine images: `assets/NPC Art/Figurines/{Named,Generic}/npc_<key>.webp` (local mirror of Steam Cloud, not in git)
- Shared figurine back: `assets/NPC Art/Shared/npcFigurineBack.webp`
- Dashboard roster tokens are drawn in the browser from those figurines. They are not the old generated spotlight-token files.
- Generator: `.dev/storyteller-dashboard/scripts/npc-art/` (`generate.ts`, `model.ts`, `report.ts`)
- Cloud jobs: `.tools/cloud-asset-sync.jsonc` (`npcFiguresNamed`, `npcFiguresGeneric`, `figurineBack`, `csheetPage4Portraits`)
- NPC roster and art assignments: `EXPORT_CHARACTERS_NAMED` and `EXPORT_CHARACTERS_GENERIC`, including Memoriam periods
- Page 4 portraits: `assets/NPC Art/Portraits/npcPortrait_<key>.webp`. The Named export specifies the portrait filename and which PCs receive it.
- Per-NPC overrides: `.dev/storyteller-dashboard/data/npc-overrides.json` (Dashboard roster token right-click window)
- Generated: `lib/npc_art_urls.ttslua`, `lib/npc_overrides.ttslua`, `.dev/build-logs/npc-art-discrepancies.txt` (ignored)

Verification:
- `npm run build:full` with TTS closed (runs `npc-art:draw`, `cloud-asset-sync`, `npc-art:urls`, then `npc-art:report`)
- Dashboard: `npm run typecheck` and `npm test` (covers `scripts/npc-art/model.test.ts`)
- TTS: load the save from the main menu, Save & Play, place an NPC on the stage from the Dashboard, check the figurine; roll for a named NPC and check the banner figure

Status: current. Spotlight token images are no longer generated (TOR-815).

---

## How it works

Every NPC marked `Has Figurine` has one figurine image under `assets/NPC Art/Figurines/`. The art is hosted on Steam Cloud like every other asset (see [`.tools/tts-cloud/README.md`](../../.tools/tts-cloud/README.md)); the build runs three steps in order:

1. **`npm run npc-art:draw`** checks that every catalogued NPC still has a figurine, writes `lib/npc_overrides.ttslua`, and writes the discrepancy list. It does not draw spotlight tokens.
2. **`npm run cloud-asset-sync`** uploads new or changed files to Steam Cloud (skipped with a warning while TTS is open), records every link in `lib/json/cloud-assets.json`, and writes the roll-banner rows into the save.
3. **`npm run npc-art:urls`** reads the figurine links and writes one Lua table:

```lua
-- lib/npc_art_urls.ttslua (generated)
local FIGURINE_BACK = "https://steamusercontent-a.akamaihd.net/ugc/…/"
return {
  myleneHamelin = {
    figurine = { front = "https://steamusercontent-a.akamaihd.net/ugc/…/", back = FIGURINE_BACK },
  },
  ...
}
```

- **Export validation:** the build requires each declared figurine and portrait file. Extra files are reported for review and excluded from the jobs.
- **Links change with the art:** a Steam Cloud link names the file's content, so changed art always gets a new link and TTS never shows a stale cached copy.
- **Not uploaded yet:** `npc-art:urls` fails if a required figurine lacks a current Cloud link. Close TTS and run `npm run build:full` again.
- **Readers (Global only):** `core/npc_spawn.ttslua` (`NpcSpawn.figurineUrls`). `lib/npcs_data.ttslua` `D.initGenericNPCs()` registers only generic catalog keys that have art (and prints the rest).
- **Overrides (TOR-717):** right-clicking a Dashboard roster token opens a window that saves `{ name?, color?, cardScale?, seatedY? }` per NPC. The draw step writes the TTS fields to `lib/npc_overrides.ttslua` (bundled by Save & Play, not hosted): `lib/npcs_data.ttslua` applies `name` to `fullName` and `cardScale` to `figurine.scale` for named NPCs at load, `D.initGenericNPCs` uses `name` as a generic's default label, `NPCS.registerGenericCharacter` uses `cardScale`, and `lib/figurine_seat_layout.ttslua` `computeSlotFrames` uses `seatedY` instead of the `SEAT_FIGURE` `defaultY` (-52.89) for an NPC at a table seat. Seated figurines still use card scale 53. `color` and the head crop are for the Dashboard roster picture only.
- **Roll result banner:** `core/roll_ui.ttslua` shows a character's figurine through the save's global Custom UI asset named `rollFigure_<characterKey>`. The `npcFiguresNamed` job creates these rows for Named NPCs, including those assigned to Memoriam. Generic roll banners omit the figure. TTS keeps the Custom UI assets it loaded in memory, so load the save from the main menu after a build before saving in TTS.
- **PC seat and spotlight figurines** (`SEAT_FIGURE_*` and `SPOTLIGHT_FIGURE_*`) are not NPC art. Each player's front is the `pcSeatFigurines` job (`assets/PCs/Seat Figurines/pcSeatFigurine_<pc>.png`), written onto both that player's seat figurine and spotlight figurine. Their backs share `npcFigurineBack.webp` through the `figurineBack` job, on the same two objects.

Spotlight token images (`assets/NPC Art/Tokens/`) are no longer generated. The Dashboard roster still draws its own token from the figurine in the browser.

## Adding or changing an NPC

1. **Add the figurine:** save it as `npc_<key>.webp` in the right folder under `assets/NPC Art/Figurines/`.
   - Named NPC: `Named/`, with `<key>` matching the API key in `EXPORT_CHARACTERS_NAMED`.
   - Generic NPC: `Generic/`, with `<key>` matching the API key in `EXPORT_CHARACTERS_GENERIC` (for example `npc_dogGuard_03.webp`).
   Keys may only contain letters, digits, and underscores.
2. **Optional:** in the Dashboard, set the roster colour group, and right-click the roster token for its name, colour, head crop, card scale and seated height.
3. **Build:** close TTS, then `npm run build:full`.
4. **Commit** `lib/npc_art_urls.ttslua`, `lib/npc_overrides.ttslua` and `lib/json/cloud-assets.json` (the art itself is not in git).
5. **TTS:** load the save from the main menu (the build changed its banner rows), then Save & Play. New figurines spawn with the new art.

To remove a Named NPC's art, clear `Has Figurine` in the sheet, delete its figurine, and run the build: its link, banner row and Cloud copies all go.

The build reports files without an export assignment and fails if required art is missing.
