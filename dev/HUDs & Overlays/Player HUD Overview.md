# Player HUD — Overview & Action Plan

This document defines the player-facing HUD layout, behaviour, and state for Toronto Rising (TTS). It serves as the implementation spec for UI behaviour and the `playerData` shape used by the HUD.

**State layout:** Saved/loaded state has two top-level branches: `state.gameState` (global game data, e.g. current phase) and `state.playerData` (per-player data, keyed by player ID). The tree view in this doc describes one player's entry — i.e. the shape of `state.playerData[playerID]`.

**Data source in this doc:** The pseudo-reference `playerData` below refers to that per-player slice: the return value of `S.getPlayerData(playerRef)` (where `playerRef` is a player's ID or their color). Implementation should read/write via the existing state API (e.g. `S.getPlayerVal` / `S.setPlayerVal` and nested paths) so that `playerData` is the merged view (static + dynamic) for that player.

**Game phase:** Global phase is stored in `state.gameState.gameData.currentPhase`. Phase values include `waking`, `main`, and `end`. **"main"** is the phase during which the majority of gameplay happens; Humanity stain/heal actions are allowed only when `currentPhase == "main"`. **"end"** is when end-of-session actions like Remorse run; the Remorse roll is available only when `currentPhase == "end"`. Subphases (e.g. "memoriam" vs "realtime" under "main") may be added later.

**Canonical data (lib/constants.ttslua):** Discipline keys, coterie keys, and PC keys used by the HUD come from `C.CHRONICLE_DATA` in `lib/constants.ttslua`: `C.CHRONICLE_DATA.disciplines`, `C.CHRONICLE_DATA.coteries`, and `C.CHRONICLE_DATA.PCS`. Use these keys for state, asset names, and UI logic so the HUD stays in sync with the chronicle config.

---

## MAIN LAYOUT

Implement in this order (or by area):

1. **Right Sidebar** — Vertical column of image-buttons (with divider/spacer images between groups) that reveal core panels and reference panels (see below).
2. **Bottom Bar** — Horizontal row of image-buttons along the bottom edge for Camera Controls (see below).
3. **Left Sidebar** — Vertical column of image-buttons for signal light, fade-to-black, stop scene, and roll actions (see below).
4. **Status Displays** — Five (or six when Resonance is present) small panels above the Bottom Bar for Hunger, Health, Willpower, Humanity, Blood Potency, and optionally Resonance (see below).
5. **Status Overlays** — Full-screen, click-through images shown when conditions are met (see below).

## RIGHT SIDEBAR

### Group 1: Core Panel Controls

This group contains one button for each "core panel", and acts as a toggle to activate/deactivate the display of that panel. The active core panel is stored in `playerData.hud.activeCorePanel` (`"map"` | `"sheet"` | `nil`; `nil` means no core panel is active).

**Click Action:** Toggles the display of the clicked core panel.

- When toggled ON, all other core panels are hidden and the clicked core panel is revealed to that player.
- When toggled OFF, all core panels are hidden. (Only one core panel can be visible at a time.)

The core panels are:

- `CorePanel_Map` — A map of Toronto, with buttons to enable various overlays and other information.
- `CorePanel_Sheet` — Displays the player's character sheet.

### Group 2: Reference Panels

This group contains buttons that reveal various reference panels. Only one reference panel can be visible at a time: when a reference panel is revealed, all other reference panels are hidden. Reference panel state is stored under `playerData.hud.reference` using canonical keys: `coteries`, `princesCourt`, `chronicleTenets`, `socialCombat`, `physicalCombat`, `frenzy`, `rolls`, `memoriam`, `projects`, `experience`. Nested panels (e.g. Coteries popup, Prince's Court popup) use keys like `playerData.hud.reference.coteries.<coterieId>`.

Reference panels can be nested, containing their own set of buttons that reveal further reference panels.

1. **Coteries Reference** — A central grid of images corresponding to NPC coteries in the city. Only coteries with `inCoterieRef = true` in `C.CHRONICLE_DATA.coteries` appear in this reference (e.g. `beesHive`, `fiveKeys`, `harpies`, `ironGuard`, `line`, `midnightMass`, `moonClub`, `petitioners`, `redeemers`, `redFlag`, `regencyUniversityChantry`, `scarlettAndBoys`, `wychwoodHecata`). Clicking a coterie image reveals a popup panel with more information; state uses `playerData.hud.reference.coteries.<coterieKey>`.
2. **Prince's Court Reference** — A row of images for the *other* PCs (exclude the current player). PC keys come from `C.CHRONICLE_DATA.PCS` (`lucien`, `fomorach`, `blackCaesar`, `aishe`, `rashid`; each has `name` and `color`). Clicking a PC image reveals a popup with that PC's character sheet; state uses `playerData.hud.reference.princesCourt.<pcKey>` or similar.
3. **Chronicle Tenets Reference** — A single `refPanel_ChronicleTenets` image.
4. **Social Combat Reference** — A single `refPanel_SocialCombat` image.
5. **Physical Combat Reference** — A single `refPanel_PhysicalCombat` image.
6. **Frenzy Reference** — A single `refPanel_Frenzy` image.
7. **Rolls Reference** — A single `refPanel_Rolls` image.
8. **Memoriam Reference** — A single `refPanel_Memoriam` image.
9. **Projects Reference** — A single `refPanel_Projects` image.
10. **Experience Reference** — A single `refPanel_Experience` image.

- **Click — panel has nested panels:** Turn off any other reference panels at the same level, then toggle this panel and set `playerData.hud.reference.[referencePanelKey] = true`.
- **Click — panel has no nested panels:** Show this panel (and hide any toggled-on reference panel at the same level) while the mouse button is held; on release, hide it and restore the previous toggled panel. Same rule for nested content: if a nested panel has its own nested panels, use toggle; otherwise use click-and-hold.

## BOTTOM BAR - Camera Controls

A `HorizontalLayout` row of image-buttons on the bottom edge of the screen.

- each corresponds to a camera position defined in `constants.ttslua` and, when clicked, immediately moves the player's camera to the respective position

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

### Status Overlay 5: Torpor

When `playerData.status.torpor = true`, the `overlay_torpor` image should be revealed. If `playerData.status.torpor = false`, the `overlay_torpor` image should be hidden.

### Status Overlay 6: Spotlight

When `playerData.status.spotlight = true`, the `overlay_spotlight` image should be revealed. If `playerData.status.spotlight = false`, the `overlay_spotlight` image should be hidden.

## CORE PANELS

### `CorePanel_Map`

When Activated:

- Hides all other core panels
- Reveals `CorePanel_Map`
- Checks `playerData.hud.map.overlays` and shows all `mapOverlay_<overlayKey>` images where `playerData.hud.map.overlays.[overlayKey] = true`, and sets their `toggleOverlay_<overlayKey>` buttons to their active states
- All `mapOverlay_` images (overlay toggles and district selections) share one layer: stacked on the main map, below `mapPin_` images. Multiple overlays can be visible at once.
- If `playerData.hud.map.location.district` is a valid district key, reveal `mapOverlay_<districtKey>` and `districtCard_<districtKey>`, and set `toggleDistrict_<districtKey>` to active.
- If `playerData.hud.map.location.site` is a valid `siteKey`, reveal `mapPin_<siteKey>` and `siteCard_<siteKey>`.
- For every connected player, if that player's `playerData.hud.map.location.position` is set, reveal `mapPin_<playerColor>` for that player and position it at those coordinates. Position format is `{x, y}` in UI space relative to the map image corner (set by the Storyteller, e.g. when a site is selected).

When Deactivated:

- Hides ALL `mapOverlay_`, `districtCard_`, `siteCard_`, and `mapPin_` images
- Sets all `toggleOverlay_` and `toggleDistrict_` buttons to their inactive states
- Hides `CorePanel_Map`

#### `CorePanel_Map` Elements

1. **Panel: Main Map** --- Full-height map of Toronto, positioned left-of-center. Also contains all `mapOverlay_` and `mapPin_` images.
2. **Button Panel LEFT** --- A `VerticalLayout` column of image-buttons that toggle various overlays on/off, to the immediate left of the map
3. **Button Panel RIGHT** --- A `VerticalLayout` column of 36 image-buttons corresponding to the 36 Districts of Toronto, for toggling display of them
4. **Panel: District Card** --- Displays the active `districtCard_` image, if any.
5. **Panel: Site Card** --- Displays the active `siteCard_` image, if any.

##### **Button Panel LEFT: Overlay Toggles**

- hovering over a button reveals the overlay until the button is hovered off
- clicking a button activates the overlay permanently (setting `playerData.hud.map.overlays.[overlayKey] = true`, until the button is clicked again to toggle it off)
- each overlay is an image that is the same size as the main map; active overlays should simply be shown stacked on top of the main map, in the same position
- multiple overlays CAN be displayed simultaneously

##### **Button Panel RIGHT: District Toggles**

District keys are the 36 Toronto districts (e.g. `Annex`, `BayStFinancial`, `Cabbagetown`, …; see Image Assets checklist for the full list). Initial map overlay keys: `streets`, `districts`, `sites`, `domains`.

- **Hover on an INACTIVE district button:** Hide any visible district/site cards; reveal `mapOverlay_<districtKey>` and `districtCard_<districtKey>` (other visible map overlays stay visible).
- **Hover off:** Hide that district's overlay and card; restore the district card and site card from `playerData.hud.map.location.district` and `.site` if set.

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
│   ├── activeCorePanel           "map" | "sheet" | nil
│   ├── reference
│   │   ├── [referencePanelKey]   boolean   (e.g. chronicleTenets, socialCombat, …)
│   │   └── … (nested keys for Coteries, Prince's Court popups)
│   └── map
│       ├── overlays
│       │   └── [overlayKey]      boolean
│       └── location
│           ├── district          districtKey | nil
│           ├── site              siteKey | nil
│           └── position          {x, y}?   (UI space, relative to map corner)
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

Assets the HUD expects. Canonical keys: **resonance** — choleric, melancholic, phlegmatic, sanguine, ischemic, mercurial, primal. **Frenzy** — hunger, fear, fury. **Map overlays (initial)** — streets, districts, sites, domains. **Districts** — 36 keys (listed under Core Panel Map). Add URLs in `dev/CUSTOM_UI_ASSETS.md` or your save’s Custom UI Assets.

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

### Reference Panels

| Asset | Purpose |
| ------- | -------- |
| `refPanel_ChronicleTenets` | Chronicle Tenets reference. |
| `refPanel_SocialCombat` | Social Combat reference. |
| `refPanel_PhysicalCombat` | Physical Combat reference. |
| `refPanel_Frenzy` | Frenzy reference. |
| `refPanel_Rolls` | Rolls reference. |
| `refPanel_Memoriam` | Memoriam reference. |
| `refPanel_Projects` | Projects reference. |
| `refPanel_Experience` | Experience reference. |
| `refPanel_Humanity` | Humanity reference container; content image goes inside it. |
| `refPanel_Humanity_<HumanityScore>` | Content image inside the container; one per Humanity value (1–10). |
| `refPanel_Humanity_impaired` | Shown when any cell is impaired. |
| `refPanel_BloodPotency` | Blood Potency reference. |
| `refPanel_BloodPotency_<BloodPotencyValue>` | One per Blood Potency value. |
| Coteries reference | Grid: one image/button per coterie in `C.CHRONICLE_DATA.coteries` **where `inCoterieRef = true`** (beesHive, fiveKeys, harpies, ironGuard, line, midnightMass, moonClub, petitioners, redeemers, redFlag, regencyUniversityChantry, scarlettAndBoys, wychwoodHecata). Popup panel image per coterie (e.g. `refPanel_Coterie_<coterieKey>` or per-chronicle naming). |
| Prince's Court reference | Row of PC images (one per other PC): keys from `C.CHRONICLE_DATA.PCS` — lucien, fomorach, blackCaesar, aishe, rashid. Each has `name` and `color`. Popup: character sheet per PC (e.g. `refPanel_PC_<pcKey>` or by color). |

### Core Panel — Map

| Asset | Purpose |
| ------- | -------- |
| Main map image | Full-height Toronto map (name TBD). |
| `mapOverlay_<overlayKey>` | One per overlay toggle; initial keys: streets, districts, sites, domains (same size as map). |
| `toggleOverlay_<overlayKey>` | Button for overlay (active + inactive states if separate). |
| `mapOverlay_<districtKey>` | District overlay when district is selected or hovered; same layer as other map overlays. |
| `districtCard_<districtKey>` | District card image. |
| `toggleDistrict_<districtKey>` | District button; 36 district keys (see list below). |
| `mapPin_<siteKey>` | Site pin. |
| `siteCard_<siteKey>` | Site card. |
| `mapPin_<playerColor>` | Player position pin per color (e.g. Brown, Orange, Red, Pink). |

**District keys (36):** Annex, BayStFinancial, Bennington, Cabbagetown, CentreIsland, Chinatown, Corktown, Danforth, DeerPark, Discovery, DistilleryDist, DonRavine, DupontByTheCastle, GayVillage, HarbordVillage, Humewood, LakeOntario, LibertyVillage, LittleItaly, LittlePortugal, PATH, RegentPark, Riverdale, Rosedale, Sewers, StJamesTown, Streets, Subway, Summerhill, Waterfront, WestQueenWest, Wychwood, YongeBloorMuseum, YongeDundasHospital, YongeStreet, Yorkville.

### Status Overlays (full-screen, click-through)

| Asset | Purpose |
| ------- | -------- |
| `overlay_hunger_3`, `overlay_hunger_4`, `overlay_hunger_5` | Shown when Hunger is 3, 4, or 5 respectively. |
| `overlay_humanity_impaired` | At least one Humanity cell impaired. |
| `overlay_frenzy_<frenzyKey>` | Frenzy keys: hunger, fear, fury. |
| `overlay_ridingTheWave` | Riding the Wave (when frenzy overlay visible). |
| `overlay_health_impaired` | Health track full (superficial or aggravated). |
| `overlay_torpor` | Torpor. |
| `overlay_spotlight` | Spotlight. |

### Core Panel — Character Sheet

- Character sheet panel asset(s) (name TBD).

### Bottom Bar — Camera

- One image-button per camera position (names from `constants.ttslua`; e.g. `camera_<positionKey>`).

### Left Sidebar — Actions

- Signal light button (on/off states if separate).
- Fade-to-black button.
- Stop scene button.
- Roll buttons: Standard, Discipline, Willpower, Humanity, Frenzy, Remorse (asset names TBD).
