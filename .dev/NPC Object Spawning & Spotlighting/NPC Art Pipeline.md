# NPC Art Pipeline (figurines + spotlight tokens)

## Agent Routing

Read this when:
- adding, renaming, or re-cropping an NPC's art (named, generic, or Memoriam)
- changing how spotlight tokens are drawn, named, or coloured
- touching `lib/npc_art_urls.ttslua`, `core/npc_spawn.ttslua` URL lookup, `core/stage_tokens.ttslua` token art, or the roll-banner figure in `core/roll_ui.ttslua`

Source of truth:
- Figurine images: `assets/NPC Art/Figurines/{Catalogued,Generic,Memoriam}/npc_<key>.webp` (local mirror of Steam Cloud, not in git)
- Shared figurine back: `assets/NPC Art/Shared/npcFigurineBack.webp`
- Ring templates: `.dev/storyteller-dashboard/scripts/npc-art/token-template/ring-{lit,dark}.svg`
- Dashboard badge art: `.dev/storyteller-dashboard/assets/badges/` (`tier_*.svg`, `year_*.svg`); these are overlays in the Dashboard and are not baked into TTS token images
- Generator: `.dev/storyteller-dashboard/scripts/npc-art/` (`generate.ts`, `draw.ts`, `model.ts`, `report.ts`)
- Cloud jobs: `.tools/cloud-asset-sync.jsonc` (`npcFiguresCatalogued`, `npcFiguresMemoriam`, `npcFiguresMemoriamGeneric`, `npcFiguresGeneric`, `npcTokens`, `figurineBack`)
- Memoriam NPC list: `.dev/storyteller-dashboard/data/memoriam-npcs.json` (`npm run memoriam-npcs:import`, named range `MEMORIAMNPCCSV`)
- Per-NPC overrides: `.dev/storyteller-dashboard/data/npc-overrides.json` (Dashboard roster token right-click window)
- Generated: `assets/NPC Art/Tokens/npcToken_<key>.{front,back}.webp`, `.cache/npc-tokens.json` (redraw cache), `lib/npc_art_urls.ttslua`, `lib/npc_overrides.ttslua`, `.dev/build-logs/npc-art-discrepancies.txt` (ignored)

Verification:
- `npm run build:full` with TTS closed (runs `npc-art:draw`, `cloud-asset-sync`, `npc-art:urls`, then `npc-art:report`)
- Dashboard: `npm run typecheck` and `npm test` (covers `scripts/npc-art/model.test.ts`)
- TTS: load the save from the main menu, Save & Play, place an NPC on the stage from the Dashboard, check figurine + token art; roll for a named NPC and check the banner figure

Status: current (TOR-728).

---

## How it works

Every NPC has exactly one figurine image under `assets/NPC Art/Figurines/`. The art is hosted on Steam Cloud like every other asset (see [`.tools/tts-cloud/README.md`](../../.tools/tts-cloud/README.md)); the build runs three steps in order:

1. **`npm run npc-art:draw`** draws each catalogued NPC's spotlight token (both sides) into `assets/NPC Art/Tokens/`, removes tokens whose figurine is gone, writes `lib/npc_overrides.ttslua`, and writes the discrepancy list.
2. **`npm run cloud-asset-sync`** uploads new or changed files to Steam Cloud (skipped with a warning while TTS is open), records every link in `lib/json/cloud-assets.json`, and writes the roll-banner rows into the save.
3. **`npm run npc-art:urls`** reads those links and writes one Lua table:

```lua
-- lib/npc_art_urls.ttslua (generated)
local FIGURINE_BACK = "https://steamusercontent-a.akamaihd.net/ugc/…/"
return {
  myleneHamelin = {
    figurine = { front = "https://steamusercontent-a.akamaihd.net/ugc/…/", back = FIGURINE_BACK },
    token = { front = "https://…/", back = "https://…/" },
  },
  ...
}
```

- **Catalog gate:** a figurine gets a token and a link only when its key is in its folder's catalog (named: `D.characters` via `data/scene-catalogs.json`; generic: `.dev/storyteller-dashboard/data/generic-npcs.json`, whose labels also land on the generic rows as `genericLabel`; Memoriam: every row of `.dev/storyteller-dashboard/data/memoriam-npcs.json`). Memoriam generics are not written as `genericLabel` rows, so they do not join the present-day generic importer.
- **Links change with the art:** a Steam Cloud link names the file's content, so changed art always gets a new link and TTS never shows a stale cached copy. A token is redrawn only when its inputs change (figurine, name, ring colour, manual crop, ring SVGs, font, `draw.ts`, `model.ts`, recorded in `.cache/npc-tokens.json`).
- **Not uploaded yet:** `npc-art:urls` leaves out (with a warning) any NPC whose figurine or token has no Cloud link yet, and warns when a local file changed since its upload. Close TTS and run `npm run build:full` again.
- **Pruning:** removing a figurine removes its token pair on the next draw. The draw step also removes historical `.tier_<tier>` token variants. The sync then deletes obsolete Cloud copies and the banner row, and `npc-art:urls` drops obsolete links.
- **Readers (Global only):** `core/npc_spawn.ttslua` (`NpcSpawn.figurineUrls`) and `core/stage_tokens.ttslua` (`tokenArt`). Both error loudly when a key has no art. `lib/npcs_data.ttslua` `D.initGenericNPCs()` registers only generic catalog keys that have art (and prints the rest).
- **Overrides (TOR-717):** right-clicking a Dashboard roster token opens a window that saves `{ name?, color?, cardScale?, seatedY? }` per NPC. `name` and `color` feed the token art (see Token look). The draw step writes the TTS fields to `lib/npc_overrides.ttslua` (bundled by Save & Play, not hosted): `lib/npcs_data.ttslua` applies `name` to `fullName` and `cardScale` to `figurine.scale` for named NPCs at load, `D.initGenericNPCs` uses `name` as a generic's default label, `NPCS.registerGenericCharacter` uses `cardScale`, and `lib/figurine_seat_layout.ttslua` `computeSlotFrames` uses `seatedY` instead of the `SEAT_FIGURE` `defaultY` (-52.89) for an NPC at a table seat. Seated figurines still use card scale 53.
- **Saved stage tokens:** `StageTokens` replaces any saved token whose images differ from the current links, so new art shows up on the next Save & Play.
- **Roll result banner:** `core/roll_ui.ttslua` shows a character's figurine through the save's global Custom UI asset named `rollFigure_<characterKey>`. Those rows are the `npcFiguresCatalogued` job and the named half of Memoriam (`npcFiguresMemoriam`: files that do not end in `_` plus two digits). Present-day generic NPCs, and Memoriam generics (`npcFiguresMemoriamGeneric`, filename ending `_01` and the like), get no banner row, so a generic NPC's roll banner shows no figure. TTS keeps the Custom UI assets it loaded in memory, so load the save from the main menu after a build before saving in TTS.
- **PC seat figurines** (`SEAT_FIGURE_*`) are not NPC art: their fronts are the `pcSeatFigurines` job (`assets/PCs/Seat Figurines/pcSeatFigurine_<pc>.png`); their backs share `npcFigurineBack.webp` through the `figurineBack` job.

## Token look

- Circular head cut from the figurine using the Dashboard head crop (manual crop from `data/headshot-crops.json`, else the automatic crop).
- Name in Bebas Neue at lower centre, up to two lines, then an ellipsis. Named NPCs and named Memoriam NPCs use the first word of their full name (titles such as "Prince", "Lady", "The" are skipped). Present-day generic NPCs and generic Memoriam NPCs (`isGeneric` on the sheet, key ending `_` plus two digits) use their full catalog label. An override `name` replaces the full name or label before that rule.
- **Front (lit):** ring in the override `color`, else the NPC's roster colour (its first group's colour in the Dashboard roster layout, `data/npc-roster.json` `layout`, else that group's category colour, else a neutral grey).
- **Back (dark):** black ring, black silhouette, dimmed name.
- **Badges:** tier and Memoriam year badges are Dashboard-only overlays. Generated TTS spotlight tokens never bake in badges, and changing a generic NPC's tier does not change its TTS token image.

Generic NPCs renamed in a scene keep their catalog label on the token image; the rename only changes object names.

## Adding or changing an NPC

1. **Add the figurine:** save it as `npc_<key>.webp` in the right folder under `assets/NPC Art/Figurines/`.
   - Named NPC: `Catalogued/`, with `<key>` matching its `D.characters` key.
   - Generic NPC: `Generic/`, with `<key>` matching its `generic-npcs.json` key (for example `npc_dogGuard_03.webp`).
   - Memoriam figure: `Memoriam/`, with `<key>` a row in `memoriam-npcs.json` (for example `npc_mem_agnesBellanger.webp`, or a generic `npc_mem_arabiaLearnedMedia_01.webp`). Named rows get a roll-banner asset; generic rows (`_NN`) do not.
   Keys may only contain letters, digits, and underscores.
2. **Optional:** in the Dashboard, set the roster colour group, and right-click the roster token for its name, colour, head crop, card scale and seated height.
3. **Build:** close TTS, then `npm run build:full`. Pass `--force` to `npm run npc-art:draw -- --force` to redraw every token after a style change the fingerprint cannot see.
4. **Commit** `lib/npc_art_urls.ttslua`, `lib/npc_overrides.ttslua` and `lib/json/cloud-assets.json` (the art itself is not in git).
5. **TTS:** load the save from the main menu (the build changed its banner rows), then Save & Play. New figurines spawn with the new art; stage tokens with old art are replaced automatically.

To remove an NPC's art, delete its figurine and run the build: its tokens, link, banner row and Cloud copies all go.

The end of the Full build prints the discrepancy list: figurines in no catalog (they got nothing) and catalogued NPCs that still have no figurine. The draw step also says how many tokens used the automatic crop.
