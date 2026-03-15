# King's Dilemma HUD Reference

Reference document for all HUD panels and handlers from The King's Dilemma TTS module. Used as a template catalog for future HUD development. Source files live in `dev/TTS-Scripting-Guide-Modules/kingsdilemma/kingsdilemma/kdxml/`.

---

## Color Assignments (Toronto Rising)

Each KD HUD type is assigned to a unique player color so all can be viewed simultaneously:

| Color | HUD Type | Source File | Status |
| ------- | ---------- | ------------- | -------- |
| Host\|Black | Admin panel | `admin.xml` | Implemented |
| Host\|Black | Debug panel | `debug.xml` | Implemented |
| Brown | Turn voting bar | `turn.xml` | Implemented |
| Red | Splash screen + queries | `splash.xml` | Implemented |
| Pink | House Selection Grid | `houseSelection.xml` | Implemented |
| Orange | Content Fetcher | `contentFetcher.xml` | Implemented |
| -- | House Selection Map | `houseSelectionNew.xml` | Documented only |
| -- | Consequences | `consequences.xml` | Documented only |

---

## Implemented Panels

### 1. Admin Panel (`admin.xml`) -- Host|Black

Host-only administrative controls for game flow management.

**Layout**: `VerticalLayout` (800px wide, UpperLeft, offset 40/-10)

**Sub-panels**:

- `preflightDisplay` -- "Initialize: Preflight" button (hidden until needed)
- `sessionInitDisplay` -- "Initialize: Session" button (hidden until needed)
- `gameStatusDisplay` -- Shows current game mode/phase, "Advance To" button, and next mode/phase. Contains nested containers `currentGamePhaseContainer` and `nextGamePhaseContainer` that show/hide based on whether mode and phase differ.
- `adminControls` -- Collapsible button panel (toggle `►`/`▼`) containing: Clear Players, Reset Table, Set Chronicle

**Handler**: `KD_Click` (routed via button `id`)

**Button IDs**: `initPreflight`, `initSession`, `advanceGamePhase`, `clearPlayers`, `resetTable`, `setChronicleType`

**Dynamic text elements**: `currentGameModeDisplay`, `currentGamePhaseDisplay`, `nextGameModeDisplay`, `nextGamePhaseDisplay`

---

### 2. Debug Panel (`debug.xml`) -- Host|Black

Host-only debug controls and state display.

**Layout**: Two horizontal panels positioned at different offsets:

1. Debug button column (UpperLeft, offset via `kd_debugButtonPanel`)
2. State display panel (UpperRight, 250px wide, 1500px tall)

**Debug buttons** (inside collapsible toggle):

- `debug_logState` -- Logs full game state to console
- `debug_resetState` -- Resets game state
- `debug_resetPlayers` -- Resets player data
- `debug_setArrows` -- Shows/hides light arrows
- `debug_primeLights` -- Resets lights
- `debug_setLight` -- Sets specific light (with input dialog)
- `debug_testFunc1` through `debug_testFunc5` -- Dynamically labeled test functions
- `prompt_assignHouseName` -- Opens house naming dialog
- `prompt_simClick` -- Simulates player clicks

**State display**: Collapsible `stateDisplayPanel` containing `stateDisplay` text element (monospace-style, 8px, UpperLeft aligned on dark semi-transparent background).

**Handler**: `KD_Click` (same generic handler, routed by `id`)

---

### 3. Turn Voting HUD (`turn.xml`) -- Brown

Player-facing voting interface displayed at the bottom of the screen during the voting phase.

**Layout**: `Panel` (2000x250, LowerCenter) containing a `VerticalLayout` > `HorizontalLayout` row of 5 vote option panels.

**Vote options** (each in a container panel, individually toggled `active`):

| Container ID | Button Image ID | Action | Visual |
| ------------- | -------------- | ------ | ------ |
| `turnHUD_voteAye_container_Brown` | `turnHUD_voteAye_Brown` | Vote Aye | Cyan tint (`button-vote-aye`) |
| `turnHUD_pass_container_Brown` | `turnHUD_pass_Brown` | Pass (Gather Power) | Gold tint + `powerIcon` |
| `turnHUD_passMod_container_Brown` | `turnHUD_passMod_Brown` | Pass (Become Moderator) | Gold tint + `moderatorIcon` |
| `turnHUD_voteNay_container_Brown` | `turnHUD_voteNay_Brown` | Vote Nay | Red tint (`button-vote-nay`) |
| `turnHUD_stay_container_Brown` | `turnHUD_stay_Brown` | Stay | Gold tint |

Each button is an `Image` element with `button-bg` background, a `Text` overlay for the label, and optional icon images. A decorative border image (`splash-border-above`) sits at the top.

**Handlers**: `KD_Turn_Click`, `KD_Turn_HoverOn`, `KD_Turn_HoverOff`

**Hover behavior**: Text opacity goes from 0.5 to 1.0; button background color brightens from half-alpha to full-alpha.

**Named assets required**: `button-bg`, `powerIcon`, `moderatorIcon`, `splash-border-above`

---

### 4. Splash Screen + Messages + Queries (`splash.xml`) -- Red

Multi-purpose overlay system for game announcements, messages, and player prompts.

**4a. Splash Screen** (`splashScreen`)

- Full-screen dark overlay (`rgba(0,0,0,0.95)`, scaled 1.75x)
- Vertical stack: border-top image, background image, border-bottom image
- Title text "The King's Dilemma" using `splash-intro` class (87px FrizSC font)
- Subtitle text using `splash-intro-sub` class (30px)
- `active="true"` by default (shown on load)

**4b. Splash Messages** (`splashHUD`)

- Contains per-color panels (`splashPanel_All`, `splashPanel_Red`, etc.)
- Each panel: border images + background image + centered text
- Used for displaying game announcements to specific players or all
- Offset below the splash screen (`offsetXY="0 325"`)

**4c. Splash Queries** (`splashQuery_Red`)

- Offset left and down (`offsetXY="-400 350"`, scaled 0.6x)
- Header: player prompt text (e.g. "Leader") in 70px CinzelBB
- Body: query text (e.g. "This is a test query.") in 40px
- Options: up to 5 clickable image buttons (`splashQuery_Option1_Red` through `splashQuery_Option5_Red`), each with a gold-tinted `button-bg` image and text overlay
- Options are individually toggleable via `active` attribute

**Handlers**: `KD_Click` (for query option clicks), `KD_HoverOn`/`KD_HoverOff` (for option hover effects)

**Hover behavior**: Option image color goes from `#FFD70011` (dim gold) to `#FFD700FF` (bright gold); text color from `#FFFFFF44` to `#FFFFFFFF`.

**Named assets required**: `splash-border-above`, `splash-border-under`, `splash-bg`, `button-bg`

---

### 5. House Selection Grid (`houseSelection.xml`) -- Pink

Setup phase HUD where players select their noble house from a grid of 12 house flags.

**Layout**: Full-screen `Panel` with three overlapping layers:

1. **Flag grid** (`houseSelection_Grid_Pink`): `GridLayout` (1260x580, 4 columns, 300x180 cells, 20px spacing) containing 12 `Image` elements with house flag images. Flags are grey-tinted.

2. **Hover grid** (`houseSelection_Hover_Pink`): Identical `GridLayout` overlaid on top. Each cell is a transparent clickable `Image` that responds to hover/click events. On hover, the corresponding house info image is revealed.

3. **Info panel** (`houseSelection_Info_Pink`): `Panel` at LowerCenter (750x250) containing 12 house info `Image` elements (all `active="false"`). When a house is hovered, the corresponding info image fades in.

**Header**: "Where Does Your House Rule?" in Title font (60px).

**Houses**: Allwed, Blodyn, Coden, Crann, Dualak, Gamam, Natar, Olwyn, Solad, Tiryll, Tork, Wylio

**Handlers**: `KD_Click`, `KD_HoverOn`, `KD_HoverOff` (pattern matches `houseHover_*` IDs)

**All 12 house images are Steam Cloud URLs** -- no named assets required for this panel.

---

### 6. Content Fetcher (`contentFetcher.xml`) -- Orange

Input forms for entering sticker and envelope keys printed on physical Dilemma cards.

**Layout**: Two separate `Panel` containers at LowerCenter, each with fade animations:

**6a. Sticker Query** (`kd_stickerQuery_Orange`)

- Instruction text: "Enter the Sticker key shown on the Dilemma."
- Background layers: `fetcher-top` border, `fetcher-bg` background, `fetcher-bottom` border
- Input decoration: Three stacked images (`fetcher-sticker-bg`, `fetcher-sticker-border`, `fetcher-sticker-icon`)
- `InputField` element: single-line, alphanumeric, 5 char limit, 70px font, FrizB
- On submit: triggers `KD_Fetcher_Sticker` handler

**6b. Envelope Query** (`kd_envelopeQuery_Orange`)

- Identical structure to sticker query, with envelope-themed decorations
- On submit: triggers `KD_Fetcher_Envelope` handler

**Named assets required**: `splash-border-above`, `splash-border-under`, `splash-bg`, `fetch-sticker-bg`, `fetch-sticker-border`, `fetch-sticker-icon`, `fetch-envelope-bg`, `fetch-envelope-border`, `fetch-envelope-icon`

---

## Documented-Only Panels (Not Implemented in XML)

### 7. House Selection Interactive Map (`houseSelectionNew.xml`)

A full-screen interactive kingdom map where players click on geographic regions to select their house territory. This is the most image-heavy panel in the entire system.

**Layout**: `Panel` (visible to all 5 player colors) containing:

1. **Base map**: A single full-screen image (1800x1080) showing the kingdom geography.

2. **Shared BW banners**: 13 `Image` layers (one per house: Allwed, Aontas, Blodyn, Coden, Crann, Dualak, Gamam, Natar, Olwyn, Solad, Tiryll, Tork, Wylio) showing black-and-white house banners positioned at their territory locations. These are shared across all players.

3. **Per-color panel** (one per player color, ~90+ images each):
   - **BannerColor** (13 images): Color versions of house banners, fade-animated. Shown when a house is claimed.
   - **Bright** (19 images): Territory highlight overlays for each house AND non-house regions (BorderlandsNorth, BorderlandsSouth, Cidlada, Lybra, Mhuir, Kauppias, Enkhal). Shown on hover to highlight the region.
   - **Dark** (19 images): Same territory shapes but with `rgba(0,0,0,0.85)` color tint. Used to darken unselected regions.
   - **Overlay** (12 images): House-specific overlay decorations shown when a house territory is active.
   - **Info** (20 images): Full-screen info popups for each house/region, shown on hover. Includes all 13 houses + 7 geographic regions.

4. **Clickable buttons** (shared, not per-color): 20 `Button` elements positioned absolutely at specific pixel coordinates matching the map geography:
   - 12 house buttons with `House_HUD_Click` handler
   - 8 region buttons (some with `house-hud-silent-button` class -- no click feedback, info-only on hover)

**Total per-color image count**: ~96 images (13 BannerColor + 19 Bright + 19 Dark + 12 Overlay + 20 Info + 13 shared BW)

**Handlers**: `KD_House_Click`, `KD_House_HoverOn`, `KD_House_HoverOff`

**All images are Steam Cloud URLs.**

**Implementation notes**: To implement this panel, you would:

1. Create a single-color instance (e.g., for a specific player color)
2. Keep the shared base map, BW banners, and clickable buttons as-is
3. Create ONE per-color panel with all 5 image layer categories
4. All Steam Cloud URLs can be copied directly from the source file
5. The absolute button positions (`position="17 -425"` etc.) encode the map geography and should be preserved exactly

---

### 8. Consequences Toggle Grid + Sidebar (`consequences.xml`)

An interactive grid allowing the current player (typically the Leader) to toggle which consequences are shown on the current Dilemma card. Accompanies a global sidebar displaying the current consequence state.

**8a. Consequences Query** (per-player, one per color)

**Layout**: `Panel` (fullscreen, offset -400/300, scaled 0.4x) with bordered background:

- Header: player prompt text (e.g., the player's role name)
- Instruction: "Toggle the consequences displayed on the Dilemma."
- Two rows of 7 columns each:
  - **Aye row** (labeled "aye:" in blue `#1E87FFFF`): 6 resource toggles
  - **Nay row** (labeled "nay:" in red `#DA1917FF`): 6 resource toggles

**Resources**: Influence, Wealth, Morale, Welfare, Knowledge, Sticker

**Per-resource structure** (3 stacked images, cycling through states):

- `consequence_[P|N]_O_[Resource]_[Color]` -- "Off" state (grey tint `#7F7F7F7F`)
- `consequence_[P|N]_P_[Resource]_[Color]` -- "Positive" state (blue `#1E87FF7F`)
- `consequence_[P|N]_N_[Resource]_[Color]` -- "Negative" state (red `#DA19177F`)

Where `P`/`N` in the first position = aye/nay outcome row.

**Click behavior**: Cycles through Off -> Positive -> Negative -> Off. Right-click resets to Off. Each click hides the current state image, shows the next state image, and updates the sidebar display to match.

**Total images per color**: 36 (6 resources x 3 states x 2 rows)

**8b. Consequences Sidebar** (`consequencesSidebar`, global)

**Layout**: `Panel` (140px wide, MiddleRight, padded 200px from right edge)

- Two `VerticalLayout` columns:
  - Aye column: 12 images (6 resources x positive/negative variants)
  - Nay column: 12 images (6 resources x positive/negative variants)
- Each image is `active="false"` by default; shown/hidden by the consequence click handler to mirror the player's selections

**Sidebar image IDs**: `conDisplay_[P|N]_[P|N]_[Resource]` (first P/N = aye/nay row, second P/N = positive/negative consequence)

**Total sidebar images**: 24

**Handlers**: `KD_Consequence_Click`, `KD_Consequence_HoverOn`, `KD_Consequence_HoverOff`

**All resource icons are Steam Cloud URLs** (12 unique icons: 6 resources x 2 variants each -- positive and negative).

**Implementation notes**: To implement this panel, you would:

1. Create one per-player consequence query panel for the assigned color
2. Create the global sidebar panel (no color suffix)
3. All 12 unique Steam Cloud icon URLs can be copied from the source
4. Each resource toggle is a stack of 3 `Image` elements at the same position
5. The click handler cycles through the 3 states and syncs the sidebar display

---

## Handler Reference

### KD_Click (Generic)

**Source**: `hud.ttslua` -- `HUD_Click(player, button, id)`

Routes clicks based on `id` pattern matching:

| ID Pattern | Action |
| ----------- | -------- |
| `splashQuery_Option*` | Extracts option index, calls `MSG.QueryResponse(index)` |
| `toggleElem_*` | Toggles the referenced element's `active` attribute, updates toggle button text |
| `initPreflight` | Calls `DIR.InitPreflight()` |
| `initSession` | Calls `DIR.InitSession()` |
| `advanceGamePhase` | Calls `DIR.ADVANCE()` |
| `prompt_simClick` | Opens dialog to simulate another player's click |
| `prompt_assignHouseName` | Opens dialog to assign a house name |
| `clearPlayers` | Calls `P.ClearSeats()` |
| `resetTable` | Calls `DIR.RESET()` |
| `setChronicleType` | Calls `DIR.SetChronicleType(true)` |
| `debug_testFunc[1-5]` | Calls corresponding test function |
| `debug_logState` | Logs game state JSON to console |
| `debug_resetState` | Resets game state |
| `debug_primeLights` | Resets lights |
| `debug_setLight` | Opens input dialog for light parameters |
| `debug_resetPlayers` | Resets player state |
| `debug_setArrows` | Shows/hides light arrows (left click shows, right click hides) |
| `houseHover_*` | Extracts house name, calls `DIR.HouseHUDClick()` |

### KD_HoverOn / KD_HoverOff (Generic)

**Source**: `hud.ttslua` -- `HUD_HoverOn`/`HUD_HoverOff`

| ID Pattern | On Hover | Off Hover |
| ----------- | -------- | --------- |
| `houseHover_*` | Calls `DIR.HouseHUDHoverOn()` | Calls `DIR.HouseHUDHoverOff()` |
| `splashQuery_*` | Sets image to `#FFD700FF`, text to `#FFFFFFFF` | Sets image to `#FFD70011`, text to `#FFFFFF44` |

### KD_House_Click / HoverOn / HoverOff

Handles clicks on the interactive kingdom map (`houseSelectionNew.xml`).

- **Click**: Extracts house name from `houseHUD_Button_[House]` ID, calls `DIR.HouseHUDClick(player, houseName)`
- **HoverOn**: Extracts region name, calls `DIR.HouseHUDHoverOn(player, buttonRef)`
- **HoverOff**: Extracts region name, calls `DIR.HouseHUDHoverOff(player, buttonRef)`

### KD_Turn_Click / HoverOn / HoverOff

Handles voting button interactions.

- **Click**: Extracts action and color from `turnHUD_[action]_[Color]` ID, calls `DIR.TurnHUDClick(action, color)`
- **HoverOn**: Brightens button background and text based on action type (aye=cyan, nay=red, others=gold)
- **HoverOff**: Dims button background and text back to 50% alpha

### KD_Consequence_Click / HoverOn / HoverOff

Handles consequence toggle interactions.

- **Click**: Parses `consequence_[P|N]_[O|P|N]_[Resource]_[Color]`. Cycles state O->P->N->O (right-click resets to O). Updates game state, hides current image, shows next state image, and syncs sidebar display.
- **HoverOn**: Brightens the icon to full alpha based on current state color
- **HoverOff**: Dims the icon back to 50% alpha

### KD_Fetcher_Sticker / KD_Fetcher_Envelope

Input field submit handlers.

- **Sticker**: Passes player and entered value to `DIR.ConfirmFetchSticker(player, value)`
- **Envelope**: Passes player and entered value to `DIR.ConfirmFetchEnvelope(player, value)`

---

## Named Asset List

Assets that must be added to TTS Custom UI Assets for the implemented panels:

| Asset Name | Used In | Description |
| ---------- | ------- | ----------- |
| `splash-border-above` | turn, splash, fetcher | Decorative top border |
| `splash-border-under` | splash, fetcher | Decorative bottom border |
| `splash-bg` | splash, fetcher | Background texture for splash panels |
| `button-bg` | turn, splash | Button background texture |
| `powerIcon` | turn | Power token icon (250x250) |
| `moderatorIcon` | turn | Moderator gavel icon (250x250) |
| `fetch-sticker-bg` | fetcher | Sticker input background |
| `fetch-sticker-border` | fetcher | Sticker input border |
| `fetch-sticker-icon` | fetcher | Sticker icon overlay |
| `fetch-envelope-bg` | fetcher | Envelope input background |
| `fetch-envelope-border` | fetcher | Envelope input border |
| `fetch-envelope-icon` | fetcher | Envelope icon overlay |

All house flag, house info, map region, and consequence resource images use Steam Cloud URLs and require no asset transfer.
