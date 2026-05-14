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

As above, however if a site card element is not found in the map's XML, the script should silently proceed and simply hide all site cards from being displayed.

Likewise, whenever a district card is being displayed that is NOT the current district (e.g. because they're hovering over a different district sidebar button to temporarily view it), the site card should be hidden (it might be easier to hide the site card panel in this case).

### 2. Location Overlay: `./ui/.templates/panel_overlay_location.xml`

#### Location Overlay District Card

As with the map, though simpler in that this overlay will always display the current District (i.e. there is no need to account for temporary changes to non-active Districts here).

#### Location Overlay Site Card

As above and, as with the map, for sites any missing elements should not throw an error but simply hide the site card display.

### 3. Map Overlay Player Pins: `./ui/.templates/panel_map_core.xml`

Each player's map panel contains five `id = "playerHud_playerPin_<color>_@@color@@"` image elements, which are pins that mark the location of that `<color>` player.

When there is no active site, all five pins should be hidden.

When there is an active site, the `offsetXY` value of player pins for characters at that site should be changed to the `offsetXY` value for the site, which can be found for each site in `C.Sites`.

**However,** not all player pins should be relocated to the new site when the location changes:

When the location is changed by activating a new scene, **only those players who are present in the scene** should have their pins moved (on every player's overlay) to the scene's location. (Players who are not present should remain unchanged.)

When the location is changed during a scene, or outside of a scene (i.e. no scenes are linked and receiving live updates), **only those players who are active/present at the table** should have their pins moved.

When an inactive/not-present player is activated, their pin should be moved immediately to the current site's location. (We haven't implemented the ability to activate players in the Storyteller UI yet, but there may still be a record in state that indicates which players are "present" at the current scene -- if that value changes, their player pins will need to be updated on every player's map overlay.)
