# District & Site Card Display Changes

The following changes should be implemented together to introduce a new method of displaying location data to players.

## Remove Existing References to Site Card & District Card Objects

The current District and Site cards (`G.GUIDS.DISTRICT_CARD` and `G.GUIDS.SITE_CARD`) will be removed from the play space, as will their lights (`G.GUIDS.DISTRICT_CARD_LIGHT` and `G.GUIDS.SITE_CARD_LIGHT`), as we will instead be displaying this data in the XML HUD. Remove all code that references or affects these four objects, then remove their GUID references from the `guids.ttslua` registry.

## Reconciler Updates on Location Change

Whenever the current location is changed (either manually by the Storyteller, or by loading a scene), the following XML updates should occur during the synchronization step:

### 1. Map Overlay: `./ui/.templates/panel_map_core.xml`

#### Map Overlay District Card

Each player's map overlay should be updated to show the new district card object AND hide the previously-displayed district card. Be sure to wire this into the current map behavior (i.e. when players hover over district buttons in the map's left sidebar, the district card is temporarily changed to the location they're hovering over, then it is switched back to the current district).

#### Map Overlay Site Card

**Removed:** the map no longer shows a site card panel; pins and district art remain on `panel_map_core.xml`. Site card imagery stays on the **location overlay** only (`panel_overlay_location.xml`).

Likewise, whenever a district card is being displayed that is NOT the current district (e.g. because they're hovering over a different district sidebar button to temporarily view it), the **location overlay** site card is unchanged by that hover (map and location dock are separate).

### 2. Location Overlay: `./ui/.templates/panel_overlay_location.xml`

#### Location Overlay District Card

As with the map, though simpler in that this overlay will always display the current District (i.e. there is no need to account for temporary changes to non-active Districts here).

#### Location Overlay Site Card

For the location overlay only: any missing elements should not throw an error but simply hide the site card display.

Implementation note: the location dock uses **one** `Image` per seat (`gameStateOverlay_siteCard_current_<Color>`), default **`active="false"`** and **`image=""`**. Lua sets `image` from `C.Sites[sessionScene.siteKey].image` (fallback `siteCard_` .. `.key`) then activates; district cards remain a stacked set for instant switching without attribute churn.

### 3. Map Overlay Player Pins: `./ui/.templates/panel_map_core.xml`

Each player's map panel contains five `id = "playerHud_playerPin_<color>_@@color@@"` image elements, which are pins that mark the location of that `<color>` player.

When there is no active site, all five pins should be hidden.

When there is an active site, each player pin is placed at the **last active location** stored in `sessionScene.lastActiveMapPin[color]` — not live `sessionScene.siteKey` directly.

**Persisted state (`sessionScene.lastActiveMapPin`, TOR-245):** per PC color `{ siteKey, districtKey?, activeAt }` where `activeAt` is narrative clock Y/M/D/h/m when that PC was last active at the site.

**Reconcile (`core/map_pins.ttslua` → `applyMapPanelHud`):** show pin only when a live library scene is on the table, a record exists, `U.compareNarrativeClock(sessionScene.clock, activeAt) > 0`, and `C.isSiteMappable(C.Sites[siteKey])`. Pin `offsetXY` comes from the **recorded** site, not necessarily the current scene site.

**Mutation rules (present PCs only unless noted):**

| Event | Effect |
| --- | --- |
| Library scene Apply / restore | Set record to scene site + activation clock |
| Apply location (mid-session) | Set record to new site + current clock |
| Apply clock | Clamp `activeAt` down if clock rewinds |
| PC deactivate (`seatSlots.isPresent` false) | Clear record (hide pin) |
| PC activate | Set record to current scene site + current clock |
| Scene Apply with PC absent | **Do not** update that PC's record (pin stays at prior site if clock gate passes) |

End scene / no-scene does **not** mutate `lastActiveMapPin`; pins hide via `SceneLibrary.hasLiveSceneOnTable() == false`.
