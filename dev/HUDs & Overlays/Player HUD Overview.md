# UI ELEMENTS (Player)

## `state` Player Data

The pseudo-reference `playerData` below refers to the return value of `S.getPlayerData(playerRef)`, where `playerRef` can be a player's ID or their color.

## MAIN LAYOUT

1. **Right Sidebar** --- A `VerticalLayout` column of image-buttons divided into groups via divider/spacer images, which reveal various HUD elements (see below).
2. **Bottom Bar** --- A `HorizontalLayout` column of image-buttons on the bottom edge of the screen, reserved for Camera Controls (see below)
3. **Left Sidebar** --- A `VerticalLayout` column of image-buttons that trigger certain game actions (see below)
4. **Status Displays** --- A set of five small panels positioned above the Bottom Bar, each displaying a particular character stat or trait (see below)
5. **Status Overlays** --- A set of full-screen click-through images that are displayed when a player meets certain conditions (see below)

## RIGHT SIDEBAR

### Group 1: Core Panel Controls

This group contains one button for each "core panel", and acts as a toggle to activate/deactivate the display of that panel.

**Click Action**: Toggles the display of the clicked core panel.

- When toggled ON, all other core panels are hidden and the clicked core panel is revealed to that player.
- When toggled OFF, all core panels are hidden. (Only one core panel can be visible at a time.)

The core panels are:

- `CorePanel_Map` --- A map of Toronto, with buttons to enable various overlays and other information.
- `CorePanel_Sheet` --- Displays the player's character sheet

### Group 2: Reference Panels

This group contains buttons that reveal various reference panels. Only one reference panel can be visible at a time: When a reference panel is revealed, all other reference panels are hidden.

Reference panels can be nested, containing their own set of buttons that reveal further reference panels.

1. **Coteries Reference** --- A central grid of images corresponding to various NPC coteries in the city. Clicking a coterie image reveals a popup panel with more information about that coterie.
2. **Prince's Court Reference** --- A central row of 4 images corresponding to the *other* PCs in the game. Clicking a PC image reveals a popup panel showing that PC's character sheet.
3. **Chronicle Tenets Reference** --- A single `refPanel_ChronicleTenets` image.
4. **Social Combat Reference** --- A single `refPanel_SocialCombat` image.
5. **Physical Combat Reference** --- A single `refPanel_PhysicalCombat` image.
6. **Frenzy Reference** --- A single `refPanel_Frenzy` image.
7. **Rolls Reference** --- A single `refPanel_Rolls` image.
8. **Memoriam Reference** --- A single `refPanel_Memoriam` image.
9. **Projects Reference** --- A single `refPanel_Projects` image.
10. **Experience Reference** --- A single `refPanel_Experience` image.

**Click Action - Panel Contains Nested Panels**: Toggles off any other reference panels at the same level that have been toggled on, then toggles the display of the clicked panel and stores it as `playerData.hud.reference.[referencePanelKey] = true`.
**Click Action - Panel Does Not Contain Nested Panels**: Reveals the clicked panel (and hides any toggled-on reference panels at the same level) for as long as the mouse button is held down. When released, the panel is hidden and any other toggled-on reference panel at the same level is restored. (This applies to nested panels as well: If a nested panel contains further nested panels, clicking toggles it on/off permanently as above; otherwise, click-and-hold behavior applies.)

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

6 buttons that trigger rolls with various characteristics:

1. **Standard Roll** --- The first click initiates a standard roll, which should start by adding a Hunger die (assuming the player has Hunger above zero). Subsequent clicks should add additional Hunger dice until a number of dice equal to the player's Hunger value is reached. Clicks after that should add standard dice.
2. **Discipline Roll** --- As above, but the player's Discipline Bonus (determined by their Blood Potency) should be added to the roll as well.
3. **Willpower Roll** --- A Willpower roll is initiated for that player.
4. **Humanity Roll** --- A Humanity roll is initiated for that player.
5. **Frenzy Roll** --- A Frenzy roll is initiated for that player.
6. **Remorse Roll** --- A Remorse roll is initiated for that player.

## STATUS DISPLAYS

### Status Display 1: Hunger

A `HorizontalLayout` comprising six cells, spaced evenly.

- The first/leftmost cell should be blank UNLESS the player has any dots in the Oblivion discipline, in which case it should show the `dot_oblivion` image.
- Each of the following five cells contains two stacked images, one representing "`dot_hunger_full`" and the other "`dot_hunger_empty`".
- A number of those cells equal to the player's current hunger value should always be "`dot_hunger_full`", and the rest should be "`dot_hunger_empty`".

**Click Action (Hunger Dots)**: A Rouse Check roll is initiated for that player. If an Oblivion Rouse Check roll has already been initiated (see below), it should be converted to a standard Rouse Check roll. If a Rouse Check roll has already been initiated for that player, another die should be added to the roll.
**Click Action (Oblivion Dot)**: An Oblivion Rouse Check roll is initiated for that player. If a standard Rouse Check roll has already been initiated, it should be converted to an Oblivion Rouse Check roll. If an Oblivion Rouse Check roll has already been initiated, another die should be added to the roll.
**Right-Click Action (Any)**: A die is removed from any Rouse Check roll that has been initiated for that player. If this removes the last die, the roll is cancelled. If there is no live roll, right-clicking instead removes a level of Hunger.

### Status Display 2: Health

A `HorizontalLayout` comprising a number of cells equal to the player's maximum Health value, spaced evenly.

- Each cell contains three stacked images: "`dot_health_empty`", "`dot_health_superficial`", "`dot_health_aggravated`"
- Starting from the left, a number of cells equal to the player's current amount of aggravated Health damage should be "aggravated", the next number of cells equal to the player's current amount of superficial Health damage should be "superficial", and the remaining cells should be "empty"

**Click Action**: A Rouse Check roll is initiated for that player. When the roll is resolved, regardless of the result, an amount of superficial Health damage equal to the mending value set by their Blood Potency is healed. If a Rouse Check roll has already been initiated for that player AND the game phase is "Waking", two more Rouse Check rolls should be queued for that player. When the first roll is resolved, the next roll should be automatically confirmed, and again for the third roll. Regardless of the result, when the first roll is resolved, one aggravated point of Health damage should be healed.
**Right-Click Action**: If three Rouse Checks have been queued for healing aggravated Health damage, two rolls should be cancelled (i.e. the roll should be reset to one die for superficial healing). If a single Rouse Check roll has been queued for healing superficial Health damage, it should be cancelled. Otherwise, nothing happens.

### Status Display 3: Willpower

A `HorizontalLayout` comprising a number of cells equal to the player's maximum Willpower value, spaced evenly.

- Each cell contains three stacked images: "`dot_willpower_empty`", "`dot_willpower_superficial`", "`dot_willpower_aggravated`"
- Starting from the left, a number of cells equal to the player's current amount of aggravated Willpower damage should be "aggravated", the next number of cells equal to the player's current amount of superficial Willpower damage should be "superficial", and the remaining cells should be "empty"

**Click Action**: When clicked, the player suffers one point of superficial Willpower damage and, if there is a live roll in progress for that player, the dice should be unlocked so the player can reroll three dice.
**Right-Click Action**: The player should heal one point of superficial Willpower damage.

### Status Display 4: Humanity

A `HorizontalLayout` comprising ten cells, spaced evenly.

- Each cell contains four stacked images: "`dot_humanity_full`", "`dot_humanity_empty`", "`dot_humanity_stain`" and "`dot_humanity_impaired`"
- Starting from the left, a number of cells equal to the player's current Humanity should be "full"
- Then, starting from the right, a number of cells equal to the player's current amount of Stains should be "stain"
- If there are more stains than available cells, the rightmost "full" cell should be replaced with "impaired"

**Hover Action**: The `refPanel_Humanity` element should be revealed, and the `refPanel_Humanity_<HumanityScore>` image should be revealed, corresponding to the player's current Humanity score. If one of their Humanity cells is "impaired", the `refPanel_Humanity_impaired` image should be revealed as well.
**Click Action - Main Phase Only**: The player should suffer one stain UNLESS one of their Humanity cells is "impaired". Otherwise, nothing happens.
**Right-Click Action - Main Phase Only**: The player should heal one stain.
**Click Action - End Phase Only**: A Remorse roll is initiated for that player.

### Status Display 5: Blood Potency

A `HorizontalLayout` comprising a number of cells equal to the player's Blood Potency, spaced evenly.

- Each cell contains a single image: "`dot_bloodPotency`"

**Hover Action**: The `refPanel_BloodPotency` element should be revealed, and the `refPanel_BloodPotency_<BloodPotencyValue>` image should be revealed, corresponding to the player's Blood Potency value.

### Status Display 6: Resonance

If the player has a `playerData.resonance` value, the corresponding `statusPanel_Resonance_<resonanceKey>` image should be displayed.

## STATUS OVERLAYS

The conditions for displaying each overlay are given below. Overlays should be revealed when the condition is met, and hidden when the condition is no longer met. Multiple overlays can be displayed simultaneously.

### Status Overlay 1: Hunger

When a player's Hunger reaches 3 or above, the `overlay_hunger_<hungerValue>` image should be revealed.

### Status Overlay 2: Impaired Humanity

When a player has at least one of their Humanity cells "impaired", the `overlay_humanity_impaired` image should be revealed.

### Status Overlay 3: Frenzy & Riding the Wave

When `playerData.status.frenzy` contains a frenzy key, the `overlay_frenzy_<frenzyKey>` image should be revealed. If `playerData.status.frenzy = nil`, any `overlay_frenzy` images should be hidden.
When `playerData.status.ridingTheWave = true` AND a frenzy overlay is being displayed, the `overlay_ridingTheWave` image should be revealed. If `playerData.status.ridingTheWave = false` OR a frenzy overlay is not being displayed, the `overlay_ridingTheWave` image should be hidden.

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
- Checks `playerData.hud.map.location.district` and, if set to a valid `districtKey`, reveals `mapOverlay_<districtKey>` and `districtCard_<districtKey>`, and sets the `toggleDistrict_<districtKey>` button to its active state
- Checks `playerData.hud.map.location.site` and, if set to a valid `siteKey`, reveals `mapPin_<siteKey>` and `siteCard_<siteKey>`
- Checks `playerData.hud.map.location.position` for ALL connected players; for each valid `position` value, reveals `mapPin_<playerColor>` of that player, and positions it at the coordinates provided by `position`

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
- clicking a button activates the overlay permanently (setting `playerData.hud.map.overlays.[overlayKey] = true`, until the button is clicked again to toggle it off
- each overlay is an image that is the same size as the main map; active overlays should simply be shown stacked on top of the main map, in the same position
- multiple overlays CAN be displayed simultaneously

##### **Button Panel RIGHT: District Toggles**

- hovering over an INACTIVE button does the following:
  - hides any visible `districtCard_` and `siteCard_` images
  - reveals the `districtOverlay_<districtKey>` overlay image (note: any other visible `districtOverlay` images should remain visible)
  - reveals the `districtCard_<districtKey>` image
- hovering OFF the button does the following:
  - hides the `districtOverlay_<districtKey>` and `districtCard_<districtKey>` images
  - restores the `districtCard` image referenced by `playerData.hud.map.location.district`, if any
  - restores the `siteCard` image referenced by `playerData.hud.map.location.site`, if any

### `CorePanel_Sheet`

When Activated:

- Hides all other core panels
- Reveals `CorePanel_Sheet`

When Deactivated:

- Hides `CorePanel_Sheet`

#### `CorePanel_Sheet` Elements

1. **Panel: Character Sheet** --- Displays the player's character sheet.
