# Player HUD — Overview & Action Plan

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

### Central Panel: `CorePanel_Map`

This panel comprises four top-level panels: `mapPanel_main`, `mapPanel_districtToggles`, `mapPanel_overlayToggles`, and `mapPanel_districtCard`. (Site card art is **not** on the map; it appears only on the location overlay — `gameStateOverlay_siteCard_current_<Color>` in `panel_overlay_location.xml`.)

#### `mapPanel_main`

These images are all the same size, and should be stacked in the order they appear in the table below, with the first image on the bottom and the last image on the top. The map image is quite large and should occupy the full vertical space of the screen, but should be offset to the right to allow room for the `mapPanel_districtCard` panel.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `mapBase` | Full-height Toronto map. | ✅ |
| `mapOverlay_Annex` | Map overlay highlighting the Annex district. | ✅ |
| `mapOverlay_BayStFinancial` | Map overlay highlighting the Bay St. Financial district. | ✅ |
| `mapOverlay_Bennington` | Map overlay highlighting the Bennington district. | ✅ |
| `mapOverlay_Cabbagetown` | Map overlay highlighting the Cabbagetown district. | ✅ |
| `mapOverlay_CentreIsland` | Map overlay highlighting the Centre Island district. | ✅ |
| `mapOverlay_Chinatown` | Map overlay highlighting the Chinatown district. | ✅ |
| `mapOverlay_Corktown` | Map overlay highlighting the Corktown district. | ✅ |
| `mapOverlay_Danforth` | Map overlay highlighting the Danforth district. | ✅ |
| `mapOverlay_DeerPark` | Map overlay highlighting the DeerPark district. | ✅ |
| `mapOverlay_Discovery` | Map overlay highlighting the Discovery district. | ✅ |
| `mapOverlay_DistilleryDist` | Map overlay highlighting the DistilleryDist district. | ✅ |
| `mapOverlay_DonRavine` | Map overlay highlighting the DonRavine district. | ✅ |
| `mapOverlay_DupontByTheCastle` | Map overlay highlighting the DupontByTheCastle district. | ✅ |
| `mapOverlay_GayVillage` | Map overlay highlighting the GayVillage district. | ✅ |
| `mapOverlay_HarbordVillage` | Map overlay highlighting the HarbordVillage district. | ✅ |
| `mapOverlay_Humewood` | Map overlay highlighting the Humewood district. | ✅ |
| `mapOverlay_LakeOntario` | Map overlay highlighting the LakeOntario district. | ✅ |
| `mapOverlay_LibertyVillage` | Map overlay highlighting the LibertyVillage district. | ✅ |
| `mapOverlay_LittleItaly` | Map overlay highlighting the LittleItaly district. | ✅ |
| `mapOverlay_LittlePortugal` | Map overlay highlighting the LittlePortugal district. | ✅ |
| `mapOverlay_RegentPark` | Map overlay highlighting the RegentPark district. | ✅ |
| `mapOverlay_Riverdale` | Map overlay highlighting the Riverdale district. | ✅ |
| `mapOverlay_Rosedale` | Map overlay highlighting the Rosedale district. | ✅ |
| `mapOverlay_StJamesTown` | Map overlay highlighting the StJamesTown district. | ✅ |
| `mapOverlay_Summerhill` | Map overlay highlighting the Summerhill district. | ✅ |
| `mapOverlay_Waterfront` | Map overlay highlighting the Waterfront district. | ✅ |
| `mapOverlay_WestQueenWest` | Map overlay highlighting the WestQueenWest district. | ✅ |
| `mapOverlay_Wychwood` | Map overlay highlighting the Wychwood district. | ✅ |
| `mapOverlay_YongeBloorMuseum` | Map overlay highlighting the YongeBloorMuseum district. | ✅ |
| `mapOverlay_YongeDundasHospital` | Map overlay highlighting the YongeDundasHospital district. | ✅ |
| `mapOverlay_YongeStreet` | Map overlay highlighting the YongeStreet district. | ✅ |
| `mapOverlay_Yorkville` | Map overlay highlighting the Yorkville district. | ✅ |
| `mapOverlay_localRoads` | Local roads overlay for all local roads. | ✅ |
| `mapOverlay_majorRoads` | Major roads overlay for all major roads. | ✅ |
| `mapOverlay_districtsAll` | Districts overlay for all districts. | ✅ |
| `mapOverlay_majorSites` | Major sites overlay for all major sites. | ✅ |
| `mapOverlay_domains` | Domains overlay for all domains. | ✅ |
| `mapPin_<siteKey>` | Site pin. | ❌ |
| `mapPin_Brown` | Player position pin for Brown player. | ❌ |
| `mapPin_Orange` | Player position pin for Orange player. | ❌ |
| `mapPin_Red` | Player position pin for Red player. | ❌ |
| `mapPin_Pink` | Player position pin for Pink player. | ❌ |
| `mapPin_Purple` | Player position pin for Purple player. | ❌ |

#### `mapPanel_overlayToggles`

This `VerticalLayout` element contains a number of buttons corresponding to the different overlays that can be displayed on the map. This panel should be displayed to the left of the `mapPanel_main` panel, flush with the top of the map image.

Multiple overlays can be displayed simultaneously, and they should be stacked in the order they appear in the table below, with the first image on the bottom and the last image on the top. The display status of each overlay should be saved in the player's state under the path `playerData.hud.map.overlayToggles.<overlayKey>`, so they can persist between sessions.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggleOverlay_districtsAll_inactive` | Button to toggle the districtsAll overlay, in its inactive state | ✅ |
| `toggleOverlay_districtsAll_hover` | Button to toggle the districtsAll overlay, in its hover state | ✅ |
| `toggleOverlay_districtsAll_active` | Button to toggle the districtsAll overlay, in its active state | ✅ |
| `toggleOverlay_domains_inactive` | Button to toggle the domains overlay, in its inactive state | ✅ |
| `toggleOverlay_domains_hover` | Button to toggle the domains overlay, in its hover state | ✅ |
| `toggleOverlay_domains_active` | Button to toggle the domains overlay, in its active state | ✅ |
| `toggleOverlay_localRoads_inactive` | Button to toggle the localRoads overlay, in its inactive state | ✅ |
| `toggleOverlay_localRoads_hover` | Button to toggle the localRoads overlay, in its hover state | ✅ |
| `toggleOverlay_localRoads_active` | Button to toggle the localRoads overlay, in its active state | ✅ |
| `toggleOverlay_majorRoads_inactive` | Button to toggle the majorRoads overlay, in its inactive state | ✅ |
| `toggleOverlay_majorRoads_hover` | Button to toggle the majorRoads overlay, in its hover state | ✅ |
| `toggleOverlay_majorRoads_active` | Button to toggle the majorRoads overlay, in its active state | ✅ |
| `toggleOverlay_majorSites_inactive` | Button to toggle the majorSites overlay, in its inactive state | ✅ |
| `toggleOverlay_majorSites_hover` | Button to toggle the majorSites overlay, in its hover state | ✅ |
| `toggleOverlay_majorSites_active` | Button to toggle the majorSites overlay, in its active state | ✅ |

#### `mapPanel_districtToggles`

This `VerticalLayout` element contains a number of buttons corresponding to the different districts that can be displayed on the map. This panel should be displayed to the right of the `mapPanel_main` panel, flush with the top of the map image.

UNLIKE overlays, only one district can be displayed at a time. When a district overlay is displayed, its corresponding district card should be displayed in the `mapPanel_districtCard` panel as well. The display status of each district should NOT be saved in the player's state. Instead, whenever the map is opened (and whenever a toggled district overlay is toggled off), the district overlay and card corresponding to the **live narrative location** (`gameState.sessionScene.districtKey`, with legacy fallback to `playerData.hud.map.location.district` when unset) should be displayed. Site card imagery for the current site is shown only on the **location overlay** (`panel_overlay_location.xml`), not on the map.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggleDistrict_Annex_inactive` | Button to toggle the Annex district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Annex_hover` | Button to toggle the Annex district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Annex_active` | Button to toggle the Annex district overlay and district card, in its active state | ✅ |
| `toggleDistrict_BayStFinancial_inactive` | Button to toggle the BayStFinancial district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_BayStFinancial_hover` | Button to toggle the BayStFinancial district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_BayStFinancial_active` | Button to toggle the BayStFinancial district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Bennington_inactive` | Button to toggle the Bennington district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Bennington_hover` | Button to toggle the Bennington district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Bennington_active` | Button to toggle the Bennington district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Cabbagetown_inactive` | Button to toggle the Cabbagetown district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Cabbagetown_hover` | Button to toggle the Cabbagetown district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Cabbagetown_active` | Button to toggle the Cabbagetown district overlay and district card, in its active state | ✅ |
| `toggleDistrict_CentreIsland_inactive` | Button to toggle the CentreIsland district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_CentreIsland_hover` | Button to toggle the CentreIsland district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_CentreIsland_active` | Button to toggle the CentreIsland district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Chinatown_inactive` | Button to toggle the Chinatown district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Chinatown_hover` | Button to toggle the Chinatown district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Chinatown_active` | Button to toggle the Chinatown district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Corktown_inactive` | Button to toggle the Corktown district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Corktown_hover` | Button to toggle the Corktown district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Corktown_active` | Button to toggle the Corktown district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Danforth_inactive` | Button to toggle the Danforth district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Danforth_hover` | Button to toggle the Danforth district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Danforth_active` | Button to toggle the Danforth district overlay and district card, in its active state | ✅ |
| `toggleDistrict_DeerPark_inactive` | Button to toggle the DeerPark district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_DeerPark_hover` | Button to toggle the DeerPark district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_DeerPark_active` | Button to toggle the DeerPark district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Discovery_inactive` | Button to toggle the Discovery district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Discovery_hover` | Button to toggle the Discovery district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Discovery_active` | Button to toggle the Discovery district overlay and district card, in its active state | ✅ |
| `toggleDistrict_DistilleryDist_inactive` | Button to toggle the DistilleryDist district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_DistilleryDist_hover` | Button to toggle the DistilleryDist district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_DistilleryDist_active` | Button to toggle the DistilleryDist district overlay and district card, in its active state | ✅ |
| `toggleDistrict_DonRavine_inactive` | Button to toggle the DonRavine district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_DonRavine_hover` | Button to toggle the DonRavine district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_DonRavine_active` | Button to toggle the DonRavine district overlay and district card, in its active state | ✅ |
| `toggleDistrict_DupontByTheCastle_inactive` | Button to toggle the DupontByTheCastle district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_DupontByTheCastle_hover` | Button to toggle the DupontByTheCastle district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_DupontByTheCastle_active` | Button to toggle the DupontByTheCastle district overlay and district card, in its active state | ✅ |
| `toggleDistrict_GayVillage_inactive` | Button to toggle the GayVillage district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_GayVillage_hover` | Button to toggle the GayVillage district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_GayVillage_active` | Button to toggle the GayVillage district overlay and district card, in its active state | ✅ |
| `toggleDistrict_HarbordVillage_inactive` | Button to toggle the HarbordVillage district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_HarbordVillage_hover` | Button to toggle the HarbordVillage district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_HarbordVillage_active` | Button to toggle the HarbordVillage district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Humewood_inactive` | Button to toggle the Humewood district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Humewood_hover` | Button to toggle the Humewood district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Humewood_active` | Button to toggle the Humewood district overlay and district card, in its active state | ✅ |
| `toggleDistrict_LakeOntario_inactive` | Button to toggle the LakeOntario district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_LakeOntario_hover` | Button to toggle the LakeOntario district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_LakeOntario_active` | Button to toggle the LakeOntario district overlay and district card, in its active state | ✅ |
| `toggleDistrict_LibertyVillage_inactive` | Button to toggle the LibertyVillage district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_LibertyVillage_hover` | Button to toggle the LibertyVillage district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_LibertyVillage_active` | Button to toggle the LibertyVillage district overlay and district card, in its active state | ✅ |
| `toggleDistrict_LittleItaly_inactive` | Button to toggle the LittleItaly district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_LittleItaly_hover` | Button to toggle the LittleItaly district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_LittleItaly_active` | Button to toggle the LittleItaly district overlay and district card, in its active state | ✅ |
| `toggleDistrict_LittlePortugal_inactive` | Button to toggle the LittlePortugal district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_LittlePortugal_hover` | Button to toggle the LittlePortugal district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_LittlePortugal_active` | Button to toggle the LittlePortugal district overlay and district card, in its active state | ✅ |
| `toggleDistrict_PATH_inactive` | Button to toggle the PATH district card, in its inactive state (there is no overlay for this district) | ✅ |
| `toggleDistrict_PATH_hover` | Button to toggle the PATH district card, in its hover state (there is no overlay for this district) | ✅ |
| `toggleDistrict_PATH_active` | Button to toggle the PATH district card, in its active state (there is no overlay for this district) | ✅ |
| `toggleDistrict_RegentPark_inactive` | Button to toggle the RegentPark district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_RegentPark_hover` | Button to toggle the RegentPark district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_RegentPark_active` | Button to toggle the RegentPark district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Riverdale_inactive` | Button to toggle the Riverdale district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Riverdale_hover` | Button to toggle the Riverdale district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Riverdale_active` | Button to toggle the Riverdale district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Rosedale_inactive` | Button to toggle the Rosedale district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Rosedale_hover` | Button to toggle the Rosedale district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Rosedale_active` | Button to toggle the Rosedale district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Sewers_inactive` | Button to toggle the Sewers district card, in its inactive state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Sewers_hover` | Button to toggle the Sewers district card, in its hover state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Sewers_active` | Button to toggle the Sewers district card, in its active state (there is no overlay for this district) | ✅ |
| `toggleDistrict_StJamesTown_inactive` | Button to toggle the StJamesTown district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_StJamesTown_hover` | Button to toggle the StJamesTown district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_StJamesTown_active` | Button to toggle the StJamesTown district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Streets_inactive` | Button to toggle the Streets district card, in its inactive state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Streets_hover` | Button to toggle the Streets district card, in its hover state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Streets_active` | Button to toggle the Streets district card, in its active state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Subway_inactive` | Button to toggle the Subway district card, in its inactive state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Subway_hover` | Button to toggle the Subway district card, in its hover state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Subway_active` | Button to toggle the Subway district card, in its active state (there is no overlay for this district) | ✅ |
| `toggleDistrict_Summerhill_inactive` | Button to toggle the Summerhill district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Summerhill_hover` | Button to toggle the Summerhill district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Summerhill_active` | Button to toggle the Summerhill district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Waterfront_inactive` | Button to toggle the Waterfront district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Waterfront_hover` | Button to toggle the Waterfront district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Waterfront_active` | Button to toggle the Waterfront district overlay and district card, in its active state | ✅ |
| `toggleDistrict_WestQueenWest_inactive` | Button to toggle the WestQueenWest district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_WestQueenWest_hover` | Button to toggle the WestQueenWest district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_WestQueenWest_active` | Button to toggle the WestQueenWest district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Wychwood_inactive` | Button to toggle the Wychwood district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Wychwood_hover` | Button to toggle the Wychwood district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Wychwood_active` | Button to toggle the Wychwood district overlay and district card, in its active state | ✅ |
| `toggleDistrict_YongeBloorMuseum_inactive` | Button to toggle the YongeBloorMuseum district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_YongeBloorMuseum_hover` | Button to toggle the YongeBloorMuseum district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_YongeBloorMuseum_active` | Button to toggle the YongeBloorMuseum district overlay and district card, in its active state | ✅ |
| `toggleDistrict_YongeDundasHospital_inactive` | Button to toggle the YongeDundasHospital district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_YongeDundasHospital_hover` | Button to toggle the YongeDundasHospital district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_YongeDundasHospital_active` | Button to toggle the YongeDundasHospital district overlay and district card, in its active state | ✅ |
| `toggleDistrict_YongeStreet_inactive` | Button to toggle the YongeStreet district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_YongeStreet_hover` | Button to toggle the YongeStreet district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_YongeStreet_active` | Button to toggle the YongeStreet district overlay and district card, in its active state | ✅ |
| `toggleDistrict_Yorkville_inactive` | Button to toggle the Yorkville district overlay and district card, in its inactive state | ✅ |
| `toggleDistrict_Yorkville_hover` | Button to toggle the Yorkville district overlay and district card, in its hover state | ✅ |
| `toggleDistrict_Yorkville_active` | Button to toggle the Yorkville district overlay and district card, in its active state | ✅ |

#### `mapPanel_districtCard`

This panel should be displayed to the left of the `mapPanel_main` panel, about one third down from the top of the screen. It should occupy all remaining horizontal space between the left edge of the screen and the `mapPanel_overlayToggles` panel, with the height determined by the image aspect ratio.

**Layout (implemented):** `player/panel_map_core_defaults.xml` class `hud_map_district_card_container` (`ignoreLayout` / `rectAlignment` / `offsetXY` as authored there). Visibility of each `districtCard_` image is driven only by Lua (`setMapStackImageVisibility`: `active` + `color="#FFFFFF"` on the **Image** id `playerHud_districtCard_<District>_<Seat>`, not the wrapping `Panel`).

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `districtCard_Annex` | District card image for the Annex. | ✅ |
| `districtCard_BayStFinancial` | District card image for BayStFinancial. | ✅ |
| `districtCard_Bennington` | District card image for Bennington. | ✅ |
| `districtCard_Cabbagetown` | District card image for Cabbagetown. | ✅ |
| `districtCard_CentreIsland` | District card image for CentreIsland. | ✅ |
| `districtCard_Chinatown` | District card image for Chinatown. | ✅ |
| `districtCard_Corktown` | District card image for Corktown. | ✅ |
| `districtCard_Danforth` | District card image for Danforth. | ✅ |
| `districtCard_DeerPark` | District card image for DeerPark. | ✅ |
| `districtCard_Discovery` | District card image for Discovery. | ✅ |
| `districtCard_DistilleryDist` | District card image for DistilleryDist. | ✅ |
| `districtCard_DonRavine` | District card image for DonRavine. | ✅ |
| `districtCard_DupontByTheCastle` | District card image for DupontByTheCastle. | ✅ |
| `districtCard_GayVillage` | District card image for GayVillage. | ✅ |
| `districtCard_HarbordVillage` | District card image for HarbordVillage. | ✅ |
| `districtCard_Humewood` | District card image for Humewood. | ✅ |
| `districtCard_LakeOntario` | District card image for LakeOntario. | ✅ |
| `districtCard_LibertyVillage` | District card image for LibertyVillage. | ✅ |
| `districtCard_LittleItaly` | District card image for LittleItaly. | ✅ |
| `districtCard_LittlePortugal` | District card image for LittlePortugal. | ✅ |
| `districtCard_PATH` | District card image for PATH. | ✅ |
| `districtCard_RegentPark` | District card image for RegentPark. | ✅ |
| `districtCard_Riverdale` | District card image for Riverdale. | ✅ |
| `districtCard_Rosedale` | District card image for Rosedale. | ✅ |
| `districtCard_Sewers` | District card image for Sewers. | ✅ |
| `districtCard_StJamesTown` | District card image for StJamesTown. | ✅ |
| `districtCard_Streets` | District card image for Streets. | ✅ |
| `districtCard_Subway` | District card image for Subway. | ✅ |
| `districtCard_Summerhill` | District card image for Summerhill. | ✅ |
| `districtCard_Waterfront` | District card image for Waterfront. | ✅ |
| `districtCard_WestQueenWest` | District card image for WestQueenWest. | ✅ |
| `districtCard_Wychwood` | District card image for Wychwood. | ✅ |
| `districtCard_YongeBloorMuseum` | District card image for YongeBloorMuseum. | ✅ |
| `districtCard_YongeDundasHospital` | District card image for YongeDundasHospital. | ✅ |
| `districtCard_YongeStreet` | District card image for YongeStreet. | ✅ |
| `districtCard_Yorkville` | District card image for Yorkville. | ✅ |

#### Site card (location overlay only)

The map no longer includes a site card panel. Current site imagery is **`gameStateOverlay_siteCard_current_<Color>`** on `panel_overlay_location.xml` (see `reconcileLocationDockCardsFromState` in `core/hud_player.ttslua`). Custom UI `siteCard_<key>` assets remain used there and elsewhere, not on `CorePanel_Map`.

---

### Central Panel: The Prince's Court Reference

Three-page reference overlay toggled from the right sidebar (`toggle_PrincesCourt_*`). Pages use `refPanel_PrincesCourt_page1`–`page3` with `navigate_left` / `navigate_right` buttons. State: `playerData.hud.reference.princesCourt` (`nil` = closed, table = open) and `playerData.hud.reference.princesCourtPage` (`1`–`3`, default `1`, persists while closed). Handler: `HUD_playerPrincesCourt_navigate` in `core/hud_player.ttslua` (writes `princesCourtPage` on the clicker's storage id; UI ids use the HUD seat suffix `_Red`, etc.).

**Coterie chronicle data (`gameState.coterieData`):** Seeded on load from `lib/json/Coterie.json` (embedded via `lib/coterie_data.ttslua`; regenerate with `node .dev/scripts/generate_coterie_data_lua.js`). Reconciled to Global UI by `core/coterie.ttslua` (`Coterie.reconcileAll` on `Sync.full`, per-seat refresh in `HUDP.updatePlayerUI`). Currently synced fields: `dots` → `coterie_dots_text_<Color>` on every player HUD; `chasse`, `lien`, `portillon`, `haven` → `dot_on_<key>_<1–5>_<Color>` on Prince's Court page 2. Backgrounds/merits/flaws columns are placeholders until a later phase.

**Page 1 tracker dots:** Five columns (one per seat color) mirror CSHEET page-1 health / willpower / humanity boxes and hunger slots. XML ids use `box_{layer}_{stat}_{index}_{ColumnSeat}_{HudSeat}` (e.g. `box_on_health_3_Purple_Brown`). Reconcile: `HUDP.reconcilePrincesCourtTrackersForHudSeat` when the reference is open on page 1; `HUDP.reconcilePrincesCourtTrackersForPanelSeat` from `PCST.refreshCharacterSheetsForColor` (same trigger as CSHEET object refresh). Logic: `PSC.collectPrincesCourtTrackerUpdates` in `lib/pc_sheet_collect.ttslua` (wraps page-1 `collectSheetImageUpdates` + hunger).

---

### Central Panel: Coterie Grid Reference

This is a nested reference panel controlled by buttons in the Right Sidebar. It initially presents as a grid of buttons corresponding to the coteries available for display. Each coterie button then reveals a larger panel with a single reference image for that coterie.

#### Coterie Grid Buttons

The coterie grid should display a button for each coterie in `C.CHRONICLE_DATA.coteries` **where `inCoterieRef = true`**. The buttons should be displayed in a grid, centered on the screen, and separated vertically into groups by the `affiliation` field of the coterie. Currently, 14 coteries are set to be in the coterie reference, divided between three groups. Each button is a 250x150 px image. See the [Coterie Grid Layout Mockup](./Coterie%20Grid%20Layout%20Mockup.png) for a depiction of the layout.

Note that, since there are odd numbers of coteries in some groups, a `GridLayout` element will not be able to display them all in a single row. Instead, you will need to use `HorizontalLayout` elements to display each row, centered within a parent `VerticalLayout` element.

Since the coterie infograpic popup will be shown over top of the grid, `_active` versions of each button are unnecessary; only `_inactive` and `_hover` versions are needed.

1. **Camarilla Coteries** --- Nine Camarilla coteries: `beesHive`, `fiveKeys`, `freeChantry`, `harpies`, `ironGuard`, `midnightMass`, `moonClub`, `regencyUniversityChantry`, `scarlettAndBoys`, arranged in two rows, one row of five, the other row of four.
2. **Anarch Coteries** --- Four Anarch coteries: `goodDoctors`, `line`, `redeemers`, `redFlag`, arranged in one row of four.
3. **Independent Coteries** --- One independent coterie: `wychwoodHecata`, arranged in one row of one.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggle_beesHive_inactive` | Inactive beesHive toggle. | ✅ |
| `toggle_beesHive_hover` | Hovering over beesHive toggle. | ✅ |
| `toggle_fiveKeys_inactive` | Inactive fiveKeys toggle. | ✅ |
| `toggle_fiveKeys_hover` | Hovering over fiveKeys toggle. | ✅ |
| `toggle_freeChantry_inactive` | Inactive freeChantry toggle. | ✅ |
| `toggle_freeChantry_hover` | Hovering over freeChantry toggle. | ✅ |
| `toggle_harpies_inactive` | Inactive harpies toggle. | ✅ |
| `toggle_harpies_hover` | Hovering over harpies toggle. | ✅ |
| `toggle_ironGuard_inactive` | Inactive ironGuard toggle. | ✅ |
| `toggle_ironGuard_hover` | Hovering over ironGuard toggle. | ✅ |
| `toggle_midnightMass_inactive` | Inactive midnightMass toggle. | ✅ |
| `toggle_midnightMass_hover` | Hovering over midnightMass toggle. | ✅ |
| `toggle_moonClub_inactive` | Inactive moonClub toggle. | ✅ |
| `toggle_moonClub_hover` | Hovering over moonClub toggle. | ✅ |
| `toggle_regencyUniversityChantry_inactive` | Inactive regencyUniversityChantry toggle. | ✅ |
| `toggle_regencyUniversityChantry_hover` | Hovering over regencyUniversityChantry toggle. | ✅ |
| `toggle_scarlettAndBoys_inactive` | Inactive scarlettAndBoys toggle. | ✅ |
| `toggle_scarlettAndBoys_hover` | Hovering over scarlettAndBoys toggle. | ✅ |
| `toggle_goodDoctors_inactive` | Inactive goodDoctors toggle. | ✅ |
| `toggle_goodDoctors_hover` | Hovering over goodDoctors toggle. | ✅ |
| `toggle_line_inactive` | Inactive line toggle. | ✅ |
| `toggle_line_hover` | Hovering over line toggle. | ✅ |
| `toggle_redeemers_inactive` | Inactive redeemers toggle. | ✅ |
| `toggle_redeemers_hover` | Hovering over redeemers toggle. | ✅ |
| `toggle_redFlag_inactive` | Inactive redFlag toggle. | ✅ |
| `toggle_redFlag_hover` | Hovering over redFlag toggle. | ✅ |
| `toggle_wychwoodHecata_inactive` | Inactive wychwoodHecata toggle. | ✅ |
| `toggle_wychwoodHecata_hover` | Hovering over wychwoodHecata toggle. | ✅ |

#### Coterie Popup Panel Images

These panel images come in a wide variety of sizes, and so should be sized individually as appropriate. Using `preferredHeight` or `preferredWidth` depending on whether the image is wider than it is tall, or taller than it is wide, may be the best way to go.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `refPanel_Coteries_beesHive` | Bees Hive coterie reference. | ✅ |
| `refPanel_Coteries_fiveKeys` | Five Keys coterie reference. | ✅ |
| `refPanel_Coteries_freeChantry` | Free Chantry coterie reference. | ✅ |
| `refPanel_Coteries_harpies` | Harpies coterie reference. | ✅ |
| `refPanel_Coteries_ironGuard` | Iron Guard coterie reference. | ✅ |
| `refPanel_Coteries_midnightMass` | Midnight Mass coterie reference. | ✅ |
| `refPanel_Coteries_moonClub` | Moon Club coterie reference. | ✅ |
| `refPanel_Coteries_regencyUniversityChantry` | Regency University Chantry coterie reference. | ✅ |
| `refPanel_Coteries_scarlettAndBoys` | Scarlett and Boys coterie reference. | ✅ |
| `refPanel_Coteries_goodDoctors` | Good Doctors coterie reference. | ✅ |
| `refPanel_Coteries_line` | Line coterie reference. | ✅ |
| `refPanel_Coteries_redeemers` | Redeemers coterie reference. | ✅ |
| `refPanel_Coteries_redFlag` | Red Flag coterie reference. | ✅ |
| `refPanel_Coteries_wychwoodHecata` | Wychwood Hecata coterie reference. | ✅ |

---

### Central Panel: Reference Images

This panel contains a number of reference images that are used throughout the HUD. These images are used to display information about the player's character, the city, and the game world.

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `refPanel_ChronicleTenets` | Chronicle Tenets reference. | ❌ |
| `refPanel_SocialCombat` | Social Combat reference. | ❌ |
| `refPanel_PhysicalCombat` | Physical Combat reference. | ❌ |
| `refPanel_Frenzy` | Frenzy reference. | ❌ |
| `refPanel_Rolls` | Rolls reference. | ❌ |
| `refPanel_Memoriam` | Memoriam reference. | ❌ |
| `refPanel_Projects` | Projects reference. | ❌ |
| `refPanel_Experience` | Experience reference. | ❌ |

---

## RIGHT SIDEBAR

The right sidebar is a `VerticalLayout` column of toggle buttons divided into several groups.  Each group should be "bookended" with the `hud-border-silver-top` (above) and `hud-border-silver-bottom` (below) images.

Each button comprises three images: an "inactive" image, an "active" image, and a "hover" image. These images should be stacked on top of each other, with the "inactive" image on the bottom, the "hover" image on the middle, and the "active" image on the top. The button should be clickable, and should trigger the corresponding reference panel to be displayed when clicked.

The image reference for each version of a button is defined by suffix, e.g. `toggle_CorePanel_Map_inactive`, `toggle_CorePanel_Map_hover`, `toggle_CorePanel_Map_active`.

### Group 1: Core Panel Controls

This group contains one button for each "core panel", and acts as a toggle to activate/deactivate the display of that panel. The active core panel is stored in `playerData.hud.activeCorePanel` (`"map"` | `"sheet"` | `nil`; `nil` means no core panel is active).

**Click Action:** Toggles the display of the clicked core panel.

- When toggled ON, all other core panels are hidden and the clicked core panel is revealed to that player.
- When toggled OFF, all core panels are hidden. (Only one core panel can be visible at a time.)

The core panels are:

- `CorePanel_Map` — A map of Toronto, with buttons to enable various overlays and other information.
- `CorePanel_Sheet` — Displays the player's character sheet.

Core panels should be stacked in the central display panel at the bottom, so that other panels (such as the reference panels) can be displayed over top of them.

### Group 2: Reference Panel Set #1

This group contains buttons that reveal various reference panels. Only one reference panel can be visible at a time: when a reference panel is revealed, all other reference panels are hidden. Reference panel state is stored under `playerData.hud.reference` using canonical keys: `coteries`, `princesCourt`, `chronicleTenets`, `socialCombat`, `physicalCombat`, `threats`, `frenzy`, `rolls`, `memoriam`, `projects`, `experience`.

Reference panels can be nested, containing their own set of buttons that reveal further reference panels. Coterie popups use keys like `playerData.hud.reference.coteries.<coterieId>`. Prince's Court uses a separate `princesCourtPage` field for pagination.

**Click Action — panel has nested panels:** Turn off any other reference panels at the same level, then toggle this panel and set `playerData.hud.reference.[referencePanelKey] = true`.
**Click Action - panel has no nested panels:** Show this panel (and hide any toggled-on reference panel at the same level) while the mouse button is held; on release, hide it and restore the previous toggled panel. Same rule for nested content: if a nested panel has its own nested panels, use toggle; otherwise use click-and-hold.

This first set of reference panel toggle buttons contains:

| Asset | Purpose | Done? |
| ------- | -------- | -------- |
| `toggle_PrincesCourt_inactive` | Inactive Princes Court toggle. | ✅ |
| `toggle_PrincesCourt_hover` | Hovering over Princes Court toggle. | ✅ |
| `toggle_PrincesCourt_active` | Active Princes Court toggle. | ✅ |
| `toggle_Coteries_inactive` | Inactive Coteries toggle. | ✅ |
| `toggle_Coteries_hover` | Hovering over Coteries toggle. | ✅ |
| `toggle_Coteries_active` | Active Coteries toggle. | ✅ |
| `toggle_ChronicleTenets_inactive` | Inactive Chronicle Tenets toggle. | ✅ |
| `toggle_ChronicleTenets_hover` | Hovering over Chronicle Tenets toggle. | ✅ |
| `toggle_ChronicleTenets_active` | Active Chronicle Tenets toggle. | ✅ |

- **Prince's Court Reference** — A three-page reference overlay (`refPanel_PrincesCourt_page1`–`page3`) with left/right navigation buttons. Sidebar toggle opens the panel on the player's last viewed page (`playerData.hud.reference.princesCourtPage`, default `1`). Open/closed state uses `playerData.hud.reference.princesCourt` (`nil` = closed, table = open). Nav buttons update `princesCourtPage` and swap the active page panel.
- **Coteries Reference** — A central grid of images corresponding to NPC coteries in the city. Only coteries with `inCoterieRef = true` in `C.CHRONICLE_DATA.coteries` appear in this reference (e.g. `beesHive`, `fiveKeys`, `harpies`, `ironGuard`, `line`, `midnightMass`, `moonClub`, `petitioners`, `redeemers`, `redFlag`, `regencyUniversityChantry`, `scarlettAndBoys`, `wychwoodHecata`). Clicking a coterie image reveals a popup panel with more information; state uses `playerData.hud.reference.coteries.<coterieKey>`.
- **Chronicle Tenets Reference** — A single `refPanel_ChronicleTenets` image.

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
- When `sessionScene.siteKey` resolves to a row in `C.Sites`, show the player pin stack on the map (`playerHud_playerPin_<Color>_<Seat>` with site `offsetXY` from `C.Sites`). Site **card** imagery is on the location overlay only (`gameStateOverlay_siteCard_current_<Seat>`).
- For every connected player, if that player's `playerData.hud.map.location.position` is set, reveal `mapPin_<playerColor>` for that player and position it at those coordinates. Position format is `{x, y}` in UI space relative to the map image corner (set by the Storyteller, e.g. when a site is selected).

When Deactivated:

- Hides ALL `mapOverlay_`, `districtCard_`, and `mapPin_` images
- Sets all `toggleOverlay_` and `toggleDistrict_` buttons to their inactive states
- Hides `CorePanel_Map`

#### `CorePanel_Map` Elements

1. **Panel: `mapPanel_main`** --- Full-height map of Toronto, positioned left-of-center. Also contains all `mapOverlay_` and `mapPin_` images.
2. **Button Panel LEFT: `mapPanel_overlayToggles`** --- A `VerticalLayout` column of image-buttons that toggle various overlays on/off, to the immediate left of the map
3. **Button Panel RIGHT: `mapPanel_districtToggles`** --- A `VerticalLayout` column of 36 image-buttons corresponding to the 36 Districts of Toronto, for toggling display of them
4. **Panel: `mapPanel_districtCard`** --- Displays the active `districtCard_` image, if any.

##### **Button Panel LEFT: Overlay Toggles**

- hovering over a button reveals the overlay until the button is hovered off
- clicking a button activates the overlay permanently (setting `playerData.hud.map.overlays.[overlayKey] = true`, until the button is clicked again to toggle it off)
- each overlay is an image that is the same size as the main map; active overlays should simply be shown stacked on top of the main map, in the same position
- multiple overlays CAN be displayed simultaneously

##### **Button Panel RIGHT: District Toggles**

District keys are the 36 Toronto districts (e.g. `Annex`, `BayStFinancial`, `Cabbagetown`, …; see Image Assets checklist for the full list). Initial map overlay keys: `streets`, `districts`, `sites`, `domains`.

- **Hover on an INACTIVE district button:** Hide any visible district cards; reveal `mapOverlay_<districtKey>` and `districtCard_<districtKey>` (other visible map overlays stay visible).
- **Hover off:** Hide that district's overlay and card; restore the district card from `playerData.hud.map.location.district` / `sessionScene.districtKey` when appropriate. (Site card on the location overlay is independent; see `panel_overlay_location.xml`.)

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
│   │   ├── princesCourt          table | nil   (open = table, closed = nil)
│   │   ├── princesCourtPage      1 | 2 | 3     (default 1)
│   │   ├── [referencePanelKey]   boolean   (e.g. chronicleTenets, socialCombat, …)
│   │   └── coteries.<coterieKey> boolean   (true while holding coterie popup)
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

Assets the HUD expects. Canonical keys: **resonance** — choleric, melancholic, phlegmatic, sanguine, ischemic, mercurial, primal. **Frenzy** — hunger, fear, fury. **Map overlays (initial)** — streets, districts, sites, domains. **Districts** — 36 keys (listed under Core Panel Map). Add URLs in `.dev/CUSTOM_UI_ASSETS.md` or your save’s Custom UI Assets.

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
| `overlay_torpor` | Torpor. | ❌ |
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
