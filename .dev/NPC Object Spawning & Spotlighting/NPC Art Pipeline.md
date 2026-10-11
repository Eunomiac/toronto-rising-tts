# NPC Art Pipeline (figurines + spotlight tokens)

## Agent Routing

Read this when:
- adding, renaming, or re-cropping an NPC's art (named, generic, or Memoriam)
- changing how spotlight tokens are drawn, named, or coloured
- touching `lib/npc_art_urls.ttslua`, `core/npc_spawn.ttslua` URL lookup, or `core/stage_tokens.ttslua` token art

Source of truth:
- Figurine images: `assets/images/NPCs/{Catalogued,Generic,Memoriam}/<key>.webp`
- Shared figurine back: `assets/images/NPCs/Shared/figurineBack.webp`
- Ring templates: `assets/images/NPCs/Token Template/ring-{lit,dark}.svg`
- Generator: `.dev/storyteller-dashboard/scripts/npc-art/` (`generate.ts`, `draw.ts`, `model.ts`, `save-assets.ts`, `report.ts`)
- Per-NPC overrides: `.dev/storyteller-dashboard/data/npc-overrides.json` (Dashboard roster token right-click window)
- Generated: `assets/images/NPCs/Tokens/<key>.{front,back}.webp`, `assets/images/NPCs/Tokens/tokens.json`, `lib/npc_art_urls.ttslua`, `lib/npc_overrides.ttslua`, roll-banner rows in the TTS save's `CustomUIAssets`, `.dev/build-logs/npc-art-discrepancies.txt` (ignored)

Verification:
- `npm run npc-art:generate` (also runs inside `npm run build:full`; `npm run npc-art:report` reprints the discrepancy list and is the Full build's last step)
- Dashboard: `npm run typecheck` and `npm test` (covers `scripts/npc-art/model.test.ts`)
- TTS: Save & Play, place an NPC on the stage from the Dashboard, check figurine + token art

Status: current (TOR-709).

---

## How it works

Every NPC has exactly one figurine image in the repo. `npm run npc-art:generate` turns that into everything TTS needs and writes one Lua table:

```lua
-- lib/npc_art_urls.ttslua (generated)
return {
  myleneHamelin = {
    figurine = { front = BASE .. "Catalogued/myleneHamelin.webp?v=…", back = FIGURINE_BACK },
    token = { front = BASE .. "Tokens/myleneHamelin.front.webp?v=…", back = BASE .. "Tokens/myleneHamelin.back.webp?v=…" },
  },
  ...
}
```

- **Catalog gate:** a figurine gets art only when its key is in its folder's catalog (named: `D.characters` via `data/scene-catalogs.json`; generic: `.dev/storyteller-dashboard/data/generic-npcs.json`, whose labels also land on the generic rows as `genericLabel`; Memoriam: `mem_` keys in `lib/skyboxes_catalog.ttslua`). Uncatalogued figurines get no token, link or banner row.
- **Hosting:** GitHub raw links on `master`. Nothing is uploaded to Steam Cloud.
- **Cache busting:** `?v=` is a fingerprint of the published image bytes (figurine file; both token sides). A token is redrawn only when its inputs change (figurine, name, ring colour, manual crop, ring SVGs, font, `draw.ts`, `model.ts`, recorded in `tokens.json`), and a redraw that produces identical images keeps its link, so TTS re-downloads only art that really changed.
- **Pruning:** every run rebuilds `lib/npc_art_urls.ttslua` and `tokens.json` from the current figurines and deletes token files with no art entry, so removed images leave no links behind.
- **Readers (Global only):** `core/npc_spawn.ttslua` (`NpcSpawn.figurineUrls`) and `core/stage_tokens.ttslua` (`tokenArt`). Both error loudly when a key has no art. `lib/npcs_data.ttslua` `D.initGenericNPCs()` registers only generic catalog keys that have art (and prints the rest).
- **Overrides (TOR-717):** right-clicking a Dashboard roster token opens a window that saves `{ name?, color?, cardScale?, seatedY? }` per NPC. `name` and `color` feed the token art (see Token look). The generator writes the TTS fields to `lib/npc_overrides.ttslua` (bundled by Save & Play, not hosted): `lib/npcs_data.ttslua` applies `name` to `fullName` and `cardScale` to `figurine.scale` for named NPCs at load, `D.initGenericNPCs` uses `name` as a generic's default label, `NPCS.registerGenericCharacter` uses `cardScale`, and `lib/figurine_seat_layout.ttslua` `computeSlotFrames` uses `seatedY` instead of the `SEAT_FIGURE` `defaultY` (-52.89) for an NPC at a table seat. Seated figurines still use card scale 53.
- **Saved stage tokens:** `StageTokens` replaces any saved token whose images differ from the current links, so regenerated art shows up on the next Save & Play.
- **Roll result banner:** `core/roll_ui.ttslua` shows a character's figurine through the save's global Custom UI asset named `<characterKey>`. The generator writes those rows (`save-assets.ts`, save from `tts-assets.config.json`, backed up first, written only on change): one row per PC, named NPC and Memoriam figure with art, pointing at its figurine link. It removes rows that point at repo NPC art or are named after a catalogued character but have no art. Generic NPCs get no banner row (about 330 extra images on every load), so a generic NPC's roll banner shows no figure. TTS keeps the Custom UI assets it loaded in memory, so load the save from the main menu after a build before saving in TTS.

## Token look

- Circular head cut from the figurine using the Dashboard head crop (manual crop from `data/headshot-crops.json`, else the automatic crop).
- Name in Bebas Neue at lower centre, up to two lines, then an ellipsis. Named and Memoriam NPCs use the first word of their full name (titles such as "Prince", "Lady", "The" are skipped); generic NPCs use their catalog label. An override `name` replaces the full name or label before that rule.
- **Front (lit):** ring in the override `color`, else the NPC's roster colour (its first group's colour in the Dashboard roster layout, `data/npc-roster.json` `layout`, else that group's category colour, else a neutral grey).
- **Back (dark):** black ring, black silhouette, dimmed name.

Generic NPCs renamed in a scene keep their catalog label on the token image; the rename only changes object names.

## Adding or changing an NPC

1. **Add the figurine:** save it as `<key>.webp` in the right folder.
   - Named NPC: `Catalogued/`, with `<key>` matching its `D.characters` key.
   - Generic NPC: `Generic/`, with `<key>` matching its `generic-npcs.json` key (for example `dogGuard_03`).
   - Memoriam figure: `Memoriam/`, named `mem_<key>.webp` to match the `mem_` key in `lib/skyboxes_catalog.ttslua`.
   Keys may only contain letters, digits, and underscores.
2. **Optional:** in the Dashboard, set the roster colour group, and right-click the roster token for its name, colour, head crop, card scale and seated height.
3. **Generate:** `npm run npc-art:generate` (or `npm run build:full`). Pass `--force` to redraw every token after a style change the fingerprint cannot see.
4. **Publish:** commit `assets/images/NPCs`, `lib/npc_art_urls.ttslua` and `lib/npc_overrides.ttslua`, then push to `master`. The generator warns when art is uncommitted or not yet pushed.
5. **TTS:** load the save from the main menu (the build changed its roll-banner rows), then Save & Play. New figurines spawn with the new art; stage tokens with old art are replaced automatically.

To remove an NPC's art, delete its figurine and run the generator: its token, link and banner row all go.

The end of the Full build prints the discrepancy list: figurines in no catalog (they got nothing) and catalogued NPCs that still have no figurine. The generator also says how many tokens used the automatic crop.
