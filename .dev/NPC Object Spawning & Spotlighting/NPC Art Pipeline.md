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
- Generator: `.dev/storyteller-dashboard/scripts/npc-art/` (`generate.ts`, `draw.ts`, `model.ts`)
- Generated: `assets/images/NPCs/Tokens/<key>.{front,back}.webp`, `assets/images/NPCs/Tokens/tokens.json`, `lib/npc_art_urls.ttslua`

Verification:
- `npm run npc-art:generate` (also runs inside `npm run build:full`)
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

- **Hosting:** GitHub raw links on `master`. Nothing is uploaded to Steam Cloud and nothing is stored in the save's Custom UI assets.
- **Cache busting:** `?v=` is a content fingerprint. Figurines hash their bytes; tokens hash the figurine, name, ring colour, manual crop, and the drawing style (ring SVGs, font, `draw.ts`, `model.ts`). Unchanged art keeps its link, so TTS does not re-download it.
- **Readers (Global only):** `core/npc_spawn.ttslua` (`NpcSpawn.figurineUrls`) and `core/stage_tokens.ttslua` (`tokenArt`). Both error loudly when a key has no art. `lib/npcs_data.ttslua` `D.initGenericNPCs()` registers only generic catalog keys that have art (and prints the rest).
- **Saved stage tokens:** `StageTokens` replaces any saved token whose images differ from the current links, so regenerated art shows up on the next Save & Play.
- **Roll banner exception:** `core/roll_ui.ttslua` still shows a named NPC's figurine front through the save's Custom UI asset named `<characterKey>` (Steam Cloud folder "Toronto Rising/NPCs"). Those rows stay in the save until the banner moves to `npc_art_urls`.

## Token look

- Circular head cut from the figurine using the Dashboard head crop (manual crop from `data/headshot-crops.json`, else the automatic crop).
- Name in Bebas Neue at lower centre, up to two lines, then an ellipsis. Named and Memoriam NPCs use the first word of their full name (titles such as "Prince", "Lady", "The" are skipped); generic NPCs use their catalog label; uncatalogued figurines use their file name.
- **Front (lit):** ring in the NPC's roster colour (first colour-picker group in the Dashboard roster, else its category colour, else a neutral grey).
- **Back (dark):** black ring, black silhouette, dimmed name.

Generic NPCs renamed in a scene keep their catalog label on the token image; the rename only changes object names.

## Adding or changing an NPC

1. **Add the figurine:** save it as `<key>.webp` in the right folder.
   - Named NPC: `Catalogued/`, with `<key>` matching its `D.characters` key.
   - Generic NPC: `Generic/`, with `<key>` matching its `lib/generic_npcs_catalog.ttslua` key (for example `dogGuard_03`).
   - Memoriam figure: `Memoriam/`, named `mem_<key>.webp` to match the `mem_` key in `lib/skyboxes_catalog.ttslua`.
   Keys may only contain letters, digits, and underscores.
2. **Optional:** in the Dashboard, set a head crop and the roster colour group.
3. **Generate:** `npm run npc-art:generate` (or `npm run build:full`). Pass `--force` to redraw every token after a style change the fingerprint cannot see.
4. **Publish:** commit `assets/images/NPCs` and `lib/npc_art_urls.ttslua`, then push to `master`. The generator warns when art is uncommitted or not yet pushed.
5. **TTS:** Save & Play. New figurines spawn with the new art; stage tokens with old art are replaced automatically.

The generator report lists tokens that used the automatic crop, figurines that are in no catalog, and catalogued NPCs that still have no figurine.
