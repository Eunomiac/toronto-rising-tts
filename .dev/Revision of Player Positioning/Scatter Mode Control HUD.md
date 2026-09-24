# Scatter Mode Control HUD — Implementation Plan

## Agent Routing

Read this when:
- wiring `ui/.templates/panel_scatter_mode_control.xml`
- changing Scatter PC slot numbering (gold = slot 1)
- adding player HUD handlers that move a PC between scatter groups

Source of truth:
- this plan (behavior + sequencing)
- `.dev/Revision of Player Positioning/Scatter Mode.md` (geometry; **slot numbering in the PC Positioning section is updated in the same change as the Lua**)
- `ui/.templates/panel_scatter_mode_control.xml` (layout + AGENT comments)
- `core/scatter_mode.ttslua`, `lib/scatter_layout.ttslua`, `core/hud_player.ttslua`

Verification:
- `npm run build:xml` after template edits
- Save & Play, then the How to verify steps at the bottom

Status: implemented 2026-09-21 (TOR-602). Pending Save & Play.

---

## Goal

Give each seated PC a Scatter-only HUD: a always-visible toggle at the top of the screen, a six-group strip that shows who is where, and a click that **immediately moves that player** to the chosen group — figurine, seat objects, camera, and Stage Control Board token included.

In the same work, **gold is PC slot 1** (not slot 3). The four white holes around it are slots **2–5**. (There are four whites, not three; “2–4” in the discussion was the surrounding ring, and the fifth hole is gold.)

## What this is not

- Not a Storyteller panel. Black stays on the Stage Control Board. This template expands only for `C.PlayerColors`.
- Not a way for one player to move another. Each copy is `visibility="Brown"` / `Orange` / … so a player only sees their own HUD. Host hotseat of that color can click it; that still moves **that** PC.
- Not a second occupancy authority. `sessionScene.scatterPlacements` stays the source of truth. The HUD only displays it and, on click, calls the same move path the board drop already uses.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| Portrait `pc#` | Same number as world/board slot. Gold / first join = **slot 1** = HUD `…_pc1_…` (already the visual middle of the row: `pc5, pc3, pc1, pc2, pc4`). |
| Occupants stay put | When someone leaves, remaining PCs keep their slots. Do **not** compact portraits into `pc1..n`. Empty slots stay `active=false`. |
| Selector click | Full move now: occupancy + park that PC’s control token + `ScatterMode.applyWorldLayout()` (figurine, bags, sheets, camera) + close **that player’s** strip. Same outcome as dropping their token on that group. |
| Who clicks | Clicker color must match the element’s `_Brown` / `_Orange` / … suffix. XmlUI visibility already prevents Option C (seeing another seat’s HUD). |
| Hover | Swap `image` to the `_hover` asset; on exit restore **active** or **inactive**, whichever that selector actually is. |
| After a successful move | Close only that player’s `pcRowContainer` and `db_scatterModeControl_container`; set their toggle image to `scatterGroupToggle_inactive`. Other players’ open/closed state is unchanged. |

## Architecture

Keep **mutation** and **HUD apply** separate.

1. **`ScatterMode.movePcToGroup(pcKey, groupIndex)`** (new public API) writes `scatterPlacements`, parks that PC token, then `applyWorldLayout()`. No-op if they are already in that group. Reuse `nextFreePcWorldSlot` + `removeCharacterFromAllGroups` from the drop handler; do **not** call `applyFromControlBoard` (that rebuilds occupancy from every token).
2. **`ScatterMode.reconcileControlHudFromState()`** (new) reads placements and sets XmlUI attributes. Idempotent. Called after enter/leave Scatter, after this move, and after the existing token-drop / Apply paths so the portraits stay honest when the Storyteller moves people on the board.
3. **`HUD_scatterModeControl_*`** in `core/hud_player.ttslua` parse the color suffix from the element id, refuse mismatches, then toggle chrome or call `movePcToGroup`.

World apply for a PC move already exists (`parkTokensFromState` slice + `applyWorldLayout`). The HUD must not pose figurines itself.

After an eager move, fingerprint or skip a second world apply if `Sync.full` would run `applyWorldLayout` again in the same flow. Prefer: move API applies world once; HUD reconciler is UI-only; `Sync.full` Scatter path either calls the HUD reconciler only, or the move API primes a fingerprint.

## Gold = slot 1 (layout contract change)

Today first-join and the gold hole are **slot 3**. Import/chair translation already gives a lone PC **slot 1**, which is why a lone imported PC does not stand on gold. After this change those two paths agree: lone PC → slot 1 → gold.

### Lua / data

| Place | Change |
| --- | --- |
| `ScatterLayout.nextFreePcWorldSlot` | Prefer **1**, then closest to 1, ties lower number → fill order `1, 2, 3, 4, 5`. |
| `ScatterLayout.pcSlotPoses` | Slot **1** at the arc midpoint. Slots 2–5 are the four other arc positions. Match the HUD row (left→right `5, 3, 1, 2, 4`) so visual left-of-gold is 5 then 3, right-of-gold is 2 then 4: midpoint offsets `{ [1]=0, [2]=+1, [3]=−1, [4]=+2, [5]=−2 }` × `(PC_DEPLOYMENT_ARC / 4)`. |
| `resolvedHoles` in `core/scatter_mode.ttslua` | `pcHolesBySlot[1] = gold`; whites `[2]…[5]` (same four measured whites, reindexed). Calibration dumps do not need a redo if we only change the slot map. |
| `applyPcRigs` / `centerOccupant` | Treat **slot 1** as the group-center occupant (today the code looks for slot 3). |
| Drop / Apply comments | “First PC → slot 1 (gold)”. |
| Occupancy import | `assignPcSlots` already uses `nextFreePcWorldSlot`; it picks up the new fill order automatically. |

Do **not** rewrite live `scatterPlacements.slot` values in a running save as a silent migrate. After Save & Play, occupancy written under the old “gold = 3” scheme will sit on the wrong hole until the next enter-Scatter / token drop / HUD click. Document that in PAVE (re-enter Scatter or click the HUD once).

### Docs in the same change

- Scatter Mode.md **PC Positioning**: gold / first join = slot 1; whites 2–5; leave-does-not-reflow unchanged.
- Scene Import Guide / PAVE Scatter import row: lone PC on slot 1 **is** the gold hole.
- Event Listener Policy: new `HUD_scatterModeControl_*` rows (clicker, Tier A chrome / Tier B+C on selector click).
- HUD_FUNCTIONS.md: handler table.

## HUD wiring

### Template hygiene (edit `ui/.templates/panel_scatter_mode_control.xml` only)

- Add `onClick` / `onMouseEnter` / `onMouseExit` on the toggle and the six selectors (same pattern as coterie grid Images).
- Remove the stray extra `/>` after the toggle `Defaults` Image.
- Suffix the background id: `db_scatterModeControl_container_bg_@@color@@` (today every color copy shares one id).
- Fix the comment typo `pc4@@color@@` → `pc4_@@color@@`.
- Root stays `active="false"` in XML; Lua turns the **root** on when Scatter is live. Inner `pcRowContainer` and `container` stay `active="false"` until that player opens the toggle. Toggle Image stays active whenever the root is on.

Then `npm run build:xml`.

### Custom UI assets

Image names in the template (must exist on Global Custom UI):

- `scatterGroupToggle_inactive` / `_hover`
- `scatterGroupSelector_hover` / `_active`
- `scatterGroupControl_bg`
- `scatterModeControlPC_lordLucien` / `_rashid` / `_aishe` / `_fomorach` / `_blackCaesar`

These are not in repo cloud-asset-sync. If Save & Play shows missing images, add them in TTS under those exact names (author-owned; not a Lua guess).

### Reconciler (all five player colors, targeted `UI.setAttribute` / `setAttributes`)

When Scatter is **off**: `scatterModeControl_root_<Color>` `active=false`.

When Scatter is **on**:

- Root `active=true` for each `C.PlayerColors` entry.
- For each group 1–6, for each slot 1–5: if that slot’s `centerCharacters` row exists, set that Image `active=true` and `image=scatterModeControlPC_<pcKey>`; else `active=false`.
- For each player color, the occupied group’s selector overlay is `active=true` with `scatterGroupSelector_active`; the rest are `active=false` (inactive art is baked into the strip background). If that PC is in no group, all six overlays stay hidden.
- NPC lists: `UI.setAttributes(id, { text = … })` with `"\n"` between **full display names** (`def.fullName or def.name`, same idea as `npcDisplayNameForCharacterKey`). Order = existing `npcKeysInJoinOrder` (hole slot, then key). Empty group → `""`. Update every color’s copy.

Do not `UI.setXml`. Guard with a cheap occupancy fingerprint so idle `Sync.full` does not rewrite identical text.

### Click / hover handlers (`core/hud_player.ttslua`)

Parse `scatterModeControlTogglePad_<Color>` (visual state on `scatterModeControlToggleHit_<Color>`) and `scatterModeControlGroupN_selectorHit_<Color>`. Cheap first check: `player.color == Color` (and the player is that seated color). Wrong color → return.

- Toggle click: flip both inner HorizontalLayouts for **that color only**. Closed: Hit Image `active=true` + `scatterGroupToggle_inactive`. Open: Hit Image `active=false` + `scatterGroupToggle_hover`.
- Toggle hover: closed swaps inactive/hover images; open shows/hides the Hit Image (image stays hover).
- Selector hover: `_hover` overlay on; hover-off restores `_active` if occupied else hides the overlay.
- Selector click: `ScatterMode.movePcToGroup(pcKeyForColor(color), N)`; reconcile HUD; close that player’s strip.

Handler names go on the template so `build:xml` copies them into generated `ui/player/panel_scatter_mode_control.xml` and the Global remount snapshot.

## Suggested implementation order

1. **Slot 1 = gold** in layout + board hole map + center-occupant helpers + Scatter Mode.md. Smoke: drop a PC token on an empty group → gold hole and world midpoint. Second PC → a white hole; first PC does not move.
2. **`movePcToGroup`** extracted from the drop path (drop handler calls it). Smoke: drop still works.
3. **HUD reconciler** + enter/leave Scatter + drop/Apply call sites. Smoke: enter Scatter, portraits and NPC names match the board without using the toggle.
4. **Template handlers + hover/toggle/click**. Smoke: open strip, click another group, you move, strip closes, everyone else’s portraits update.
5. **Docs / Event Listener Policy / HUD_FUNCTIONS / PAVE / Linear Awaiting Author Review comment.**

## Files (expected)

- `ui/.templates/panel_scatter_mode_control.xml` → generated `ui/player/panel_scatter_mode_control.xml` + `lib/ui_global_xml_docs.ttslua`
- `lib/scatter_layout.ttslua`
- `core/scatter_mode.ttslua`
- `core/hud_player.ttslua`
- `.dev/Revision of Player Positioning/Scatter Mode.md`
- `.dev/Sychronizing Game Functionality/Event Listener Policy.md`
- `.dev/HUD_FUNCTIONS.md`
- `.dev/PENDING AUTHOR VERIFICATION.md` (Outstanding row when Lua ships)
- Import/PAVE wording if it still says slot 1 is *not* gold

No object-script `require("core.*")`. No new Global.call from objects unless we later add a board-side button.

## How to verify (author, after Save & Play)

1. Confirm the Custom UI images listed above appear (toggle, selectors, five PC portraits, panel background). If any are missing, that is an asset name/save issue, not the Lua.
2. Switch the table to Scatter. Each PC should see a toggle near the top of **their** screen and should **not** see another color’s copy. The strip starts closed.
3. Open the toggle: portraits sit in the groups that match the board; gold-center portrait slot is `pc1`. NPC names under each group match who is there, one name per line.
4. Click a different group. Your figurine, bags/sheet/camera, and PC token should move there immediately. The gold hole is used if that group had no PC yet. The strip closes. Other players still see you in the new group if they have the strip open.
5. Click the group you are already in: nothing moves, and the strip **stays open**.
6. Storyteller drops a PC token to another group: HUD portraits follow without that player clicking.
7. Leave Scatter: the toggle and strip disappear.

## Linear / PAVE

Create a Feature under UI & HUD (parent **TOR-37**) when implementation starts; `relatedTo` **TOR-572** (in-game Scatter Mode). Add a PAVE Outstanding row in the same session the Lua ships. Dashboard-only work is not in this plan.
