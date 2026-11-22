# Player HUD — Overview & Action Plan

## Agent Routing

Read this when:
- changing player HUD layout, overlays, map/location UI, or player-facing state
- modifying `playerData` HUD shape or overlay reconciliation

Source of truth:
- `core/hud_player.ttslua`
- `core/hud_overlays.ttslua`
- `ui/player/`
- `ui/shared/`
- `core/state.ttslua`

Verification:
- `npm run build`
- HUD-specific TTS smoke or step-by-step playbook from `.dev/TESTING.md`

Status: HUD design/spec reference; verify current XML ids and state paths against source.

This document defines the player-facing HUD layout, behaviour, and state for Toronto Rising (TTS). It serves as the implementation spec for UI behaviour and the `playerData` shape used by the HUD.

**State layout:** Saved/loaded state has two top-level branches: `state.gameState` (global game data, e.g. current phase) and `state.playerData` (per-player data, keyed by player ID). The tree view in this doc describes one player's entry — i.e. the shape of `state.playerData[playerID]`.

**Data source in this doc:** The pseudo-reference `playerData` below refers to that per-player slice: the return value of `S.getPlayerData(playerRef)` (where `playerRef` is a player's ID or their color). Implementation should read/write via the existing state API (e.g. `S.getPlayerVal` / `S.setPlayerVal` and nested paths) so that `playerData` is the merged view (static + dynamic) for that player.

**Game phase:** Global phase is stored in `state.gameState.gameData.currentPhase`. Phase values include `waking`, `main`, and `end`. **"main"** is the phase during which the majority of gameplay happens; Humanity stain/heal actions are allowed only when `currentPhase == "main"`. **"end"** is when end-of-session actions like Remorse run; the Remorse roll is available only when `currentPhase == "end"`. Subphases (e.g. "memoriam" vs "realtime" under "main") may be added later.

**Canonical data (lib/constants.ttslua + lib/json/PCS.json):** Discipline names and coterie reference data come from `C.CHRONICLE_DATA.disciplines` and `C.CHRONICLE_DATA.coteries`. Player character keys, seats, and display names come from `C.PlayerData` (`charKey`, `color`, etc.). Full PC stat blocks are authored in **`lib/json/PCS.json`** and embedded at runtime via **`lib/pcs_data.ttslua`** (regenerate with `node .dev/scripts/generate_pcs_data_lua.js` after editing the JSON).

---

## MAIN LAYOUT

Implement in this order (or by area):

1. **Central Display** - The main display area in the center of the screen, which contains most of the HUD elements that are toggled on/off by buttons in the following sections.
2. **Right Sidebar** — Vertical column of image-buttons (with divider/spacer images between groups) that reveal core panels and reference panels (see below).
3. **Bottom Bar** — Horizontal row of image-buttons along the bottom edge for Camera Controls (see below).
4. **Left Sidebar** — Vertical column of image-buttons for signal light, fade-to-black, stop scene, and roll actions (see below).
5. **Status Displays** — Five (or six when Resonance is present) small panels above the Bottom Bar for Hunger, Health, Willpower, Humanity, Blood Potency, and optionally Resonance (see below).
6. **Status Overlays** — Full-screen, click-through images shown when conditions are met (see below).

---

## CENTRAL DISPLAY

This will be developed iteratively, as the core panels, reference panels and other assets described below are implemented. It should be ready for initial implementation when the core panels, reference panels and other assets described below are implemented.

### Central Panel: `CorePanel_Sheet`

(Yet to be implemented)

---

### In-game map removed

The Toronto map panel, both of its sidebars, and the Map button on the right sidebar are gone. District and site cards stay on the location dock (`gameStateOverlay_districtCard_current_<Color>` and `gameStateOverlay_siteCard_current_<Color>`).

Player pin locations for the separate player-map app are still recorded in `gameState.lastActiveMapPin` by `core/map_pins.ttslua` and sent as `mapPins` on the dashboard world snapshot. That path does not use the removed map images.

## RIGHT SIDEBAR

The right sidebar is a `VerticalLayout` column of toggle buttons divided into several groups.  Each group should be "bookended" with the `hud-border-silver-top` (above) and `hud-border-silver-bottom` (below) images.

Each button comprises three images: an "inactive" image, an "active" image, and a "hover" image. These images should be stacked on top of each other, with the "inactive" image on the bottom, the "hover" image on the middle, and the "active" image on the top. The button should be clickable, and should trigger the corresponding reference panel to be displayed when clicked.

The image reference for each version of a button is defined by suffix, e.g. `toggle_PrincesCourt_inactive`. The Map button (`toggle_CorePanel_Map_*`) has been removed.

### Group 1: Core Panel Controls

`playerData.hud.activeCorePanel` is `"sheet"` or `nil`. A saved value of `"map"` is cleared. The right sidebar no longer has a Map button. `CorePanel_Sheet` is still the only core panel key.

- `CorePanel_Sheet` — Displays the player's character sheet.

Core panels should be stacked in the central display panel at the bottom, so that other panels (such as the reference panels) can be displayed over top of them.

### Group 2: Reference Panel Set #1

This group contains buttons that reveal various reference panels. Only one reference panel can be visible at a time: when a reference panel is revealed, all other reference panels are hidden. Reference panel state is stored under `playerData.hud.reference` using canonical keys: `princesCourt`, `chronicleTenets`, `socialCombat`, `physicalCombat`, `threats`, `frenzy`, `rolls`, `memoriam`, `projects`, `experience`.

Prince's Court uses a separate `princesCourtPage` field for pagination. The coteries grid is gone. A saved `reference.coteries` value is closed.

**Click Action — panel has nested panels:** Turn off any other reference panels at the same level, then toggle this panel and set `playerData.hud.reference.[referencePanelKey] = true`.
**Click Action - panel has no nested panels:** Show this panel (and hide any toggled-on reference panel at the same level) while the mouse button is held; on release, hide it and restore the previous toggled panel. Same rule for nested content: if a nested panel has its own nested panels, use toggle; otherwise use click-and-hold.

This first set of reference panel toggle buttons contains:

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggle_PrincesCourt_inactive` | Inactive Princes Court toggle. | ✅ |
| `toggle_PrincesCourt_hover` | Hovering over Princes Court toggle. | ✅ |
| `toggle_PrincesCourt_active` | Active Princes Court toggle. | ✅ |
| `toggle_ChronicleTenets_inactive` | Inactive Chronicle Tenets toggle. | ✅ |
| `toggle_ChronicleTenets_hover` | Hovering over Chronicle Tenets toggle. | ✅ |
| `toggle_ChronicleTenets_active` | Active Chronicle Tenets toggle. | ✅ |

- **Prince's Court Reference** — Three double-page spreads (`refPanel_PrincesCourt_page1`–`page3` = facing pages 1–2 / 3–4 / 5–6). Page 3 has prev only. Sidebar opens on last `princesCourtPage`. Visibility uses Lua-side audience unions (`applyPrincesCourtPageVisibility`).
- **Chronicle Tenets Reference** — A single `refPanel_ChronicleTenets` image.

The coteries reference grid and its sidebar button are gone. Prince's Court still shows coterie advantages, domain, and haven.

### Group 3: Reference Panel Set #2

As above, but for the second set of reference panel toggle buttons:

| Asset | Purpose | Done? |
| `toggle_Rolls_inactive` | Inactive Rolls toggle. | ✅ |
| `toggle_Rolls_hover` | Hovering over Rolls toggle. | ✅ |
| `toggle_Rolls_active` | Active Rolls toggle. | ✅ |
| `toggle_SocialCombat_inactive` | Inactive Social Combat toggle. | ✅ |
| `toggle_SocialCombat_hover` | Hovering over Social Combat toggle. | ✅ |
| `toggle_SocialCombat_active` | Active Social Combat toggle. | ✅ |
| `toggle_PhysicalCombat_inactive` | Inactive Physical Combat toggle. | ✅ |
| `toggle_PhysicalCombat_hover` | Hovering over Physical Combat toggle. | ✅ |
| `toggle_PhysicalCombat_active` | Active Physical Combat toggle. | ✅ |
| `toggle_Frenzy_inactive` | Inactive Frenzy toggle. | ✅ |
| `toggle_Frenzy_hover` | Hovering over Frenzy toggle. | ✅ |
| `toggle_Frenzy_active` | Active Frenzy toggle. | ✅ |

- **Rolls Reference** — A single `refPanel_Rolls` image.
- **Social Combat Reference** — A single `refPanel_SocialCombat` image.
- **Physical Combat Reference** — A single `refPanel_PhysicalCombat` image.
- **Frenzy Reference** — A single `refPanel_Frenzy` image.

### Group 4: Reference Panel Set #3

As above, but for the third set of reference panel toggle buttons:

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggle_Experience_inactive` | Inactive Experience toggle. | ✅ |
| `toggle_Experience_hover` | Hovering over Experience toggle. | ✅ |
| `toggle_Experience_active` | Active Experience toggle. | ✅ |
| `toggle_Projects_inactive` | Inactive Projects toggle. | ✅ |
| `toggle_Projects_hover` | Hovering over Projects toggle. | ✅ |
| `toggle_Projects_active` | Active Projects toggle. | ✅ |
| `toggle_Memoriam_inactive` | Inactive Memoriam toggle. | ✅ |
| `toggle_Memoriam_hover` | Hovering over Memoriam toggle. | ✅ |
| `toggle_Memoriam_active` | Active Memoriam toggle. | ✅ |

- **Experience Reference** — A single `refPanel_Experience` image.
- **Memoriam Reference** — A single `refPanel_Memoriam` image.
- **Projects Reference** — A single `refPanel_Projects` image.

## BOTTOM BAR - Camera Controls

Per-seat overlay picker (`ui/.templates/panel_overlay_camera.xml` → `HUD_cameraControl_click`):

- **MAIN** (`cameraControl_default_*`): left-click → `default`; right-click → `wideFacing` (universal preset in `C.UniversalCameraAngles`).
- Other controls map to `diceTray` / `sheet` (self or other-seat suffixes) via `parseCameraControlIdToMode`.
- Each click calls `Main.setCamera` (ThirdPerson) and collapses the picker.

The overlay **camera icon** (`popout_cameraPanel_*` / `HUD_popoutCameraControl_click`):

- **Left-click:** opens the preset picker **and** snaps that player to their `default` table camera in **ThirdPerson**.
- **Right-click:** clones that seat’s `default` lookAt preset, raises the focus to **y = 30**, sets **pitch = 0**, retargets **yaw** toward the lead figurine in the next occupied stage area (same-height `Vector:heading("y")` with `U.cycle(heading, 0, 360)`), and **keeps `distance` unchanged** so the view turns around the usual focus. After a short settle, switches to **FirstPerson** so the player can pitch up and look around the stage (scripted lookAt cannot aim above the horizon). This is the only scripted FirstPerson camera path. Further right-clicks advance Center → Center Left → … → Far Right (skip empty) and loop. Control-board Apply resets the cycle. Empty stage: same elevate + FirstPerson, default yaw kept. Any later `Main.setCamera` (picker, sheet, dice tray, scene snap, and so on) cancels a pending FirstPerson settle and returns the player to ThirdPerson.

## LEFT SIDEBAR

Each of the following sets of buttons should be grouped via a divider/spacer image.

### Signal Light Button

One button that toggles the player's signal light on/off.

### Fade-to-Black & Stop Scene Buttons

Two buttons that trigger the fade-to-black and stop scene actions, respectively.

### Roll Buttons

Six buttons that trigger rolls. All roll state lives in `playerData.rollData`: at most one roll in progress at a time, with an optional queue (e.g. three Rouse Checks for healing aggravated Health). The moment a roll is "committed" (e.g. when the player picks up and rolls the dice) is TBD.

1. **Standard Roll** — First click initiates a standard roll (add a Hunger die if Hunger > 0). Further clicks add Hunger dice up to the character's Hunger value, then standard dice. Commit trigger TBD.
2. **Discipline Roll** — As above, plus the Discipline Bonus from Blood Potency.
3. **Willpower Roll** — Initiates a Willpower roll.
4. **Humanity Roll** — Initiates a Humanity roll.
5. **Frenzy Roll** — Initiates a Frenzy roll.
6. **Remorse Roll** — Initiates a Remorse roll (End Phase only).

## STATUS DISPLAYS

All character-derived values in this section are read from `playerData.characterStats` (see the playerData tree view at the end of this document).

### Status Display 1: Hunger

A `HorizontalLayout` comprising six cells, spaced evenly.

- Six cells total: cell 1 is blank unless the player has Oblivion discipline dots (`playerData.characterStats.disciplines.oblivion` > 0), in which case show `dot_oblivion`; cells 2–6 are five Hunger dots.
- Each of the five hunger cells contains two stacked images: `dot_hunger_full` and `dot_hunger_empty`. A number of cells equal to `playerData.characterStats.hunger` show full; the rest show empty.

**Click Action (Hunger Dots)**: A Rouse Check roll is initiated for that player. If an Oblivion Rouse Check roll has already been initiated (see below), it should be converted to a standard Rouse Check roll. If a Rouse Check roll has already been initiated for that player, another die should be added to the roll.
**Click Action (Oblivion Dot)**: An Oblivion Rouse Check roll is initiated for that player. If a standard Rouse Check roll has already been initiated, it should be converted to an Oblivion Rouse Check roll. If an Oblivion Rouse Check roll has already been initiated, another die should be added to the roll.
**Right-Click Action (Any)**: A die is removed from any Rouse Check roll that has been initiated for that player. If this removes the last die, the roll is cancelled. If there is no live roll, right-clicking instead removes a level of Hunger.

### Status Display 2: Health

A `HorizontalLayout` comprising a number of cells equal to `playerData.characterStats.health.max`, spaced evenly.

- Each cell contains three stacked images: `dot_health_empty`, `dot_health_superficial`, `dot_health_aggravated`. From the left: a number of cells equal to `characterStats.health.aggravated` show aggravated, then `characterStats.health.superficial` show superficial, then the rest show empty.

**Click Action**: A Rouse Check roll is initiated for that player. When the roll is resolved, regardless of the result, an amount of superficial Health damage equal to the mending value set by their Blood Potency is healed. If a Rouse Check roll has already been initiated for that player AND the game phase is "Waking", two more Rouse Check rolls should be queued for that player. When the first roll is resolved, the next roll should be automatically confirmed, and again for the third roll. Regardless of the result, when the first roll is resolved, one aggravated point of Health damage should be healed.
**Right-Click Action**: If three Rouse Checks have been queued for healing aggravated Health damage, two rolls should be cancelled (i.e. the roll should be reset to one die for superficial healing). If a single Rouse Check roll has been queued for healing superficial Health damage, it should be cancelled. Otherwise, nothing happens.

### Status Display 3: Willpower

A `HorizontalLayout` comprising a number of cells equal to `playerData.characterStats.willpower.max`, spaced evenly.

- Each cell contains three stacked images: `dot_willpower_empty`, `dot_willpower_superficial`, `dot_willpower_aggravated`. From the left: `characterStats.willpower.aggravated` cells show aggravated, then `characterStats.willpower.superficial` show superficial, then the rest show empty.

**Click Action**: When clicked, the player suffers one point of superficial Willpower damage and, if there is a live roll in progress for that player, the dice should be unlocked so the player can reroll three dice.
**Right-Click Action**: The player should heal one point of superficial Willpower damage.

### Status Display 4: Humanity

A `HorizontalLayout` comprising ten cells, spaced evenly. Values from `playerData.characterStats.humanity` (max 10, current, stains). Impaired = stains exceed available humanity boxes (max − current).

- Each cell contains four stacked images: `dot_humanity_full`, `dot_humanity_empty`, `dot_humanity_stain`, `dot_humanity_impaired`. From the left, `characterStats.humanity.current` cells show full; from the right, `characterStats.humanity.stains` show stain. If stains exceed available boxes, the rightmost full cell shows impaired.
- **Hover:** Reveal the `refPanel_Humanity` container and inside it the `refPanel_Humanity_<n>` image for the player's current Humanity score; if any cell is impaired, also reveal `refPanel_Humanity_impaired`.
- **Click (Main Phase only, `state.gameState.gameData.currentPhase == "main"`):** Add one stain unless impaired; otherwise no effect.
- **Right-Click (Main Phase only):** Heal one stain.
- **Click (End Phase only, `currentPhase == "end"`):** Initiate a Remorse roll.

### Status Display 5: Blood Potency

A `HorizontalLayout` with a number of cells equal to `playerData.characterStats.bloodPotency`, each showing `dot_bloodPotency`. **Hover:** Reveal `refPanel_BloodPotency` and the `refPanel_BloodPotency_<value>` image for that value.

### Status Display 6: Resonance

If `playerData.characterStats.resonance` is set (one of: `choleric`, `melancholic`, `phlegmatic`, `sanguine`, `ischemic`, `mercurial`, `primal`), show the corresponding `statusPanel_Resonance_<resonanceKey>` image. If `nil`, do not show the panel.

## STATUS OVERLAYS

The conditions for displaying each overlay are given below. Overlays should be revealed when the condition is met, and hidden when the condition is no longer met. Multiple overlays can be displayed simultaneously.

### Status Overlay 1: Hunger

When `playerData.characterStats.hunger` is 3, 4, or 5, reveal `overlay_hunger_3`, `overlay_hunger_4`, or `overlay_hunger_5` respectively.

### Status Overlay 2: Impaired Humanity

When a player has at least one of their Humanity cells "impaired", the `overlay_humanity_impaired` image should be revealed.

### Status Overlay 3: Frenzy & Riding the Wave

Frenzy types are `hunger`, `fear`, and `fury`. When `playerData.status.frenzy` is set to one of these, reveal `overlay_frenzy_<frenzyKey>`; when `nil`, hide any frenzy overlay. When `playerData.status.ridingTheWave == true` and a frenzy overlay is visible, also reveal `overlay_ridingTheWave`; otherwise hide it.

### Status Overlay 4: Impaired Health

When a player's entire Health track is filled with either "`dot_health_superficial`" or "`dot_health_aggravated`" images, the `overlay_health_impaired` image should be revealed. Otherwise, it should be hidden.

### Status Overlay 5: Stained

When a player's Humanity track has one or more Stains (`stats.humanity.stains >= 1`), the `overlay_stained` image is revealed via the derived `stained` condition. When stains return to 0, it is hidden. (Torpor and impaired-willpower no longer have HUD overlays.)

### Status Overlay 6: Spotlight

When `playerData.status.spotlight = true`, the `overlay_spotlight` image should be revealed. If `playerData.status.spotlight = false`, the `overlay_spotlight` image should be hidden.

## CORE PANELS

### `CorePanel_Sheet`

When Activated:

- Hides all other core panels
- Reveals `CorePanel_Sheet`

When Deactivated:

- Hides `CorePanel_Sheet`

#### `CorePanel_Sheet` Elements

1. **Panel: Character Sheet** — Displays the player's character sheet.

---

## playerData — Tree View

Shape of **one player's data** in `state.playerData[playerID]` (i.e. what `S.getPlayerData(playerRef)` returns). The HUD reads/writes this via the state API.

```text
state.playerData[playerID]  (merged: static + dynamic)
├── [static — from C.PlayerData]
│   ├── color
│   ├── playerName
│   ├── charName
│   └── … (other static fields)
│
├── characterStats
│   ├── hunger                    number (0–5)
│   ├── health
│   │   ├── max                   number
│   │   ├── superficial           number
│   │   └── aggravated            number
│   ├── willpower
│   │   ├── max                   number
│   │   ├── superficial           number
│   │   └── aggravated            number
│   ├── humanity
│   │   ├── max                   number (constant 10 for all characters)
│   │   ├── current               number
│   │   └── stains                number (impaired = stains > humanity boxes available)
│   ├── bloodPotency              number
│   ├── resonance                 resonanceKey | nil  (choleric|melancholic|phlegmatic|sanguine|ischemic|mercurial|primal; nil = no status panel)
│   ├── disciplines               keys from C.CHRONICLE_DATA.disciplines (see constants)
│   │   ├── animalism             number (dots)
│   │   ├── auspex                number
│   │   ├── bloodSorcery          number
│   │   ├── celerity              number
│   │   ├── dominate              number
│   │   ├── fortitude             number
│   │   ├── obfuscate             number
│   │   ├── oblivion              number  (> 0 shows Oblivion cell in Hunger display)
│   │   ├── potence               number
│   │   ├── presence              number
│   │   ├── protean               number
│   │   └── … (other disciplines)
│   └── … (other character stats)
│
├── hud
│   ├── activeCorePanel           "sheet" | nil
│   └── reference
│       ├── princesCourt          table | nil   (open = table, closed = nil)
│       ├── princesCourtPage      1 | 2 | 3     (default 1)
│       └── [referencePanelKey]   boolean   (e.g. chronicleTenets, socialCombat, …)
│
├── status
│   ├── frenzy                    frenzyKey | nil   (hunger|fear|fury)
│   ├── ridingTheWave             boolean
│   ├── torpor                    boolean
│   └── spotlight                 boolean
│
└── rollData
    └── … (current roll in progress + optional queue; one roll at a time; exact shape TBD; commit trigger TBD)
```

---

## Image Assets Checklist

Assets the HUD expects. Canonical keys: **resonance** — choleric, melancholic, phlegmatic, sanguine, ischemic, mercurial, primal. **Frenzy** — hunger, fear, fury. District and site card images stay on the location dock. The in-game map images (`mapBase`, `mapOverlay_*`, `toggleOverlay_*`, `toggleDistrict_*`, `pin_*`, `toggle_CorePanel_Map_*`) are no longer part of the HUD. Add URLs in `.dev/CUSTOM_UI_ASSETS.md` or your save’s Custom UI Assets.

### Right / Left Sidebar

- Divider or spacer images between button groups (exact names TBD).

### Status Displays — Dots & Panels

| Asset | Purpose |
| ------- | -------- |
| `dot_oblivion` | Oblivion discipline indicator (Hunger display, cell 1). |
| `dot_hunger_full` | Filled hunger dot. |
| `dot_hunger_empty` | Empty hunger dot. |
| `dot_health_empty` | No damage. |
| `dot_health_superficial` | Superficial damage. |
| `dot_health_aggravated` | Aggravated damage. |
| `dot_willpower_empty` | No Willpower damage. |
| `dot_willpower_superficial` | Superficial Willpower damage. |
| `dot_willpower_aggravated` | Aggravated Willpower damage. |
| `dot_humanity_full` | Full Humanity dot. |
| `dot_humanity_empty` | Empty Humanity dot. |
| `dot_humanity_stain` | Stain. |
| `dot_humanity_impaired` | Impaired (stain overflow). |
| `dot_bloodPotency` | One Blood Potency dot (repeat per cell). |
| `statusPanel_Resonance_<resonanceKey>` | One per resonance key: choleric, melancholic, phlegmatic, sanguine, ischemic, mercurial, primal. |
| `refPanel_Humanity_<HumanityScore>` | Shown in `refPanel_Humanity` when Humanity track is hovered over. One per Humanity value (1–10). |
| `refPanel_Humanity_impaired` | Shown in `refPanel_Humanity` when any Humanity cell is impaired. |
| `refPanel_BloodPotency_<BloodPotencyValue>` | Shown in `refPanel_BloodPotency` when Blood Potency track is hovered over. One per Blood Potency value (1–5). |

### Reference Panels

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `overlay_hunger_3`, `overlay_hunger_4`, `overlay_hunger_5` | Shown when Hunger is 3, 4, or 5 respectively. | ❌ |
| `overlay_humanity_impaired` | At least one Humanity cell impaired. | ❌ |
| `overlay_frenzy_<frenzyKey>` | Frenzy keys: hunger, fear, fury. | ❌ |
| `overlay_ridingTheWave` | Riding the Wave (when frenzy overlay visible). | ❌ |
| `overlay_health_impaired` | Health track full (superficial or aggravated). | ❌ |
| `overlay_stained` | Humanity track has ≥ 1 Stain (derived `stained` condition). | ❌ |
| `overlay_spotlight` | Spotlight. | ❌ |

### Core Panel — Character Sheet

- Character sheet panel asset(s) (name TBD).

### Bottom Bar — Camera

- One image-button per camera position (names from `constants.ttslua`; e.g. `camera_<positionKey>`).

### Left Sidebar — Actions

- Signal light button (on/off states if separate).
- Fade-to-black button.
- Stop scene button.
- Roll buttons: Standard, Discipline, Willpower, Humanity, Frenzy, Remorse (asset names TBD).
