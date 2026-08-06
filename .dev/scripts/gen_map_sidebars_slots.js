/**
 * One-shot generator: ui/shared/panel_map_sidebars.xml with per-toggle slot Panels
 * (TOR-462 layout-safe visibility for shared Option B chrome).
 */
const fs = require("fs");
const path = require("path");

const overlayRows = [
  { type: "divider", id: "overlayDivider_cityFeatures", image: "overlayDivider_cityFeatures" },
  { type: "btn", key: "districtsAll" },
  { type: "btn", key: "majorRoads" },
  { type: "btn", key: "localRoads" },
  { type: "btn", key: "majorSites" },
  { type: "divider", id: "overlayDivider_domains", image: "overlayDivider_domains" },
  { type: "btn", key: "domain_theCourt" },
  { type: "spacer", cls: "spacer_10" },
  { type: "btn", key: "domain_fiveKeys" },
  { type: "btn", key: "domain_moonClub" },
  { type: "btn", key: "domain_universityChantry" },
  { type: "spacer", cls: "spacer_20", preferredHeight: "15" },
  { type: "btn", key: "domain_freeChantry" },
  { type: "btn", key: "domain_ironGuard" },
  { type: "btn", key: "domain_scarlett" },
  { type: "spacer", cls: "spacer_20", preferredHeight: "15" },
  { type: "btn", key: "domain_anarchFreeZone" },
  { type: "spacer", cls: "spacer_20", preferredHeight: "15" },
  { type: "btn", key: "domain_hecata" },
  { type: "spacer", cls: "spacer_20", preferredHeight: "15" },
  { type: "btn", key: "domain_bertrice" },
  { type: "btn", key: "domain_islandDevil" },
  { type: "spacer", cls: "spacer_20", preferredHeight: "15" },
  { type: "btn", key: "domain_domainConflicts" },
  { type: "divider", id: "overlayDivider_regions", image: "overlayDivider_regions" },
  { type: "btn", key: "domain_barrens" },
  { type: "btn", key: "domain_theRack" },
];

const districtSections = [
  {
    divider: { id: "districtDivider_northOfBloor", image: "districtDivider_northOfBloor" },
    keys: [
      "Bennington",
      "DeerPark",
      "DupontByTheCastle",
      "Humewood",
      "Rosedale",
      "Summerhill",
      "StJamesTown",
      "Wychwood",
      "Yorkville",
    ],
  },
  {
    divider: { id: "districtDivider_westToronto", image: "districtDivider_westToronto" },
    keys: ["Annex", "Chinatown", "HarbordVillage", "LittleItaly", "LittlePortugal"],
  },
  {
    divider: { id: "districtDivider_eastToronto", image: "districtDivider_eastToronto" },
    keys: ["Danforth", "DonRavine", "RegentPark", "Riverdale"],
  },
  {
    divider: { id: "districtDivider_cityCenter", image: "districtDivider_cityCenter" },
    keys: [
      "BayStFinancial",
      "Cabbagetown",
      "Corktown",
      "Discovery",
      "GayVillage",
      "WestQueenWest",
      "YongeBloorMuseum",
      "YongeDundasHospital",
      "YongeStreet",
    ],
  },
  {
    divider: { id: "districtDivider_shoreline", image: "districtDivider_shoreline" },
    keys: ["CentreIsland", "DistilleryDist", "LakeOntario", "LibertyVillage", "Waterfront"],
  },
  {
    divider: { id: "districtDivider_notDepicted", image: "districtDivider_notDepicted" },
    keys: ["PATH", "Sewers", "Streets", "Subway"],
  },
];

function overlayBtn(key) {
  const base = `playerHud_mapOverlayToggle_${key}`;
  return [
    `          <Panel class="map_sidebar_toggle_slot map_sidebar_toggle_slot_overlay">`,
    `            <Image id="${base}" class="hover_button hover_button_base hover_button_base_overlay map_sidebar_toggle_layer" image="toggleOverlay_${key}_inactive" />`,
    `            <Image id="${base}_hover" visibility="Blue" class="hover_button hover_button_map_shared_layer map_sidebar_toggle_layer" image="toggleOverlay_${key}_hover" />`,
    `            <Image id="${base}_active" visibility="Blue" class="hover_button hover_button_map_shared_layer map_sidebar_toggle_layer" image="toggleOverlay_${key}_active" />`,
    `          </Panel>`,
  ].join("\n");
}

function districtBtn(key) {
  const base = `playerHud_mapDistrictToggle_${key}`;
  return [
    `          <Panel class="map_sidebar_toggle_slot map_sidebar_toggle_slot_district">`,
    `            <Image class="hover_button hover_button_thin hover_button_base hover_button_base_district map_sidebar_toggle_layer" id="${base}" image="toggleDistrict_${key}_inactive" />`,
    `            <Image class="hover_button hover_button_thin hover_button_map_shared_layer map_sidebar_toggle_layer" id="${base}_hover" visibility="Blue" image="toggleDistrict_${key}_hover" />`,
    `            <Image class="hover_button hover_button_thin hover_button_map_shared_layer map_sidebar_toggle_layer" id="${base}_active" visibility="Blue" image="toggleDistrict_${key}_active" />`,
    `          </Panel>`,
  ].join("\n");
}

const overlayBody = [];
for (const row of overlayRows) {
  if (row.type === "divider") {
    overlayBody.push(
      `          <Image id="db_base_${row.id}" class="hover_button_panel_border hover_button_panel_border_short" image="${row.image}" />`
    );
  } else if (row.type === "spacer") {
    const ph = row.preferredHeight ? ` preferredHeight="${row.preferredHeight}"` : "";
    overlayBody.push(`          <Text class="${row.cls}"${ph} />`);
  } else {
    overlayBody.push(overlayBtn(row.key));
  }
}

const districtBody = [];
for (const section of districtSections) {
  const d = section.divider;
  districtBody.push(
    `          <Image id="db_base_${d.id}" class="hover_button_panel_border hover_button_panel_border_short" image="${d.image}" />`
  );
  for (const key of section.keys) {
    districtBody.push(districtBtn(key));
  }
}

const out = `<!-- Shared map overlay + district toggle sidebars (TOR-444 Option B / TOR-462).
     Root visibility = seats with map open; hover/active use per-player visibility unions.
     Each toggle is a fixed-height slot Panel (base always present) so Blue visibility on
     hover/active does not collapse VerticalLayout alignment.
     Per-seat map HorizontalLayout keeps width spacers so the pan surface stays aligned.
     Regenerate: node .dev/scripts/gen_map_sidebars_slots.js -->
<Panel id="playerHud_mapSidebarsShared" class="playerHud_coreLayer" visibility="Blue" active="false" raycastTarget="false">
  <HorizontalLayout class="hud_map_parent_container" raycastTarget="false">
    <Panel id="playerHud_mapSidebar_overlays" class="hud_map_hover_button_panel_wrapper">
      <Panel class="hover_button_panel_container" height="725">
        <VerticalLayout id="playerHud_mapSidebar_overlays_list" class="hover_button_panel">
${overlayBody.join("\n")}
        </VerticalLayout>
      </Panel>
    </Panel>
    <Panel class="hud_map_center_container" raycastTarget="false" color="clear" />
    <Panel class="hud_map_navigation_panel" raycastTarget="false" />
    <Panel id="playerHud_mapSidebar_districts" class="hud_map_hover_button_panel_wrapper">
      <Panel id="playerHud_mapSidebar_districts_container" class="hover_button_panel_container hover_button_panel_container_wide" height="900">
        <VerticalLayout id="playerHud_mapSidebar_districts_list" class="hover_button_panel" childAlignment="UpperLeft" spacing="0">
${districtBody.join("\n")}
        </VerticalLayout>
      </Panel>
    </Panel>
  </HorizontalLayout>
</Panel>
`;

const dest = path.join(__dirname, "../../ui/shared/panel_map_sidebars.xml");
fs.writeFileSync(dest, out, "utf8");
console.log(`Wrote ${dest} (${out.split("\n").length} lines)`);
