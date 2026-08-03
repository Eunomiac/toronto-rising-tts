"use strict";

/**
 * One-shot / build helper: lift map overlay + district toggle sidebars out of
 * ui/.templates/panel_map_core.xml into ui/shared/panel_map_sidebars.xml (TOR-444 Option B).
 *
 * Run: node .dev/scripts/extract_map_sidebars_shared.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const TEMPLATE = path.join(ROOT, "ui/.templates/panel_map_core.xml");
const SHARED_OUT = path.join(ROOT, "ui/shared/panel_map_sidebars.xml");

function stripColor(s) {
  return s.replace(/_@@color@@/g, "").replace(/@@color@@/g, "");
}

function main() {
  let t = fs.readFileSync(TEMPLATE, "utf8");

  const leftRe =
    /<Panel class="hud_map_hover_button_panel_wrapper">[\s\S]*?<\/Panel>\s*<\/Panel>/;
  const rightRe =
    /<Panel id="db_hud_map_hover_button_panel_wrapper_@@color@@"[\s\S]*?<\/Panel>\s*<\/Panel>/;

  const leftM = t.match(leftRe);
  const rightM = t.match(rightRe);
  if (!leftM || !rightM) {
    throw new Error(
      `Could not extract sidebars (left=${Boolean(leftM)} right=${Boolean(rightM)}). ` +
        "Template may already be converted."
    );
  }

  let left = stripColor(leftM[0]);
  left = left.replace(
    '<Panel class="hud_map_hover_button_panel_wrapper">',
    '<Panel id="playerHud_mapSidebar_overlays" class="hud_map_hover_button_panel_wrapper">'
  );

  let right = stripColor(rightM[0]);
  right = right
    .replace(
      'id="db_hud_map_hover_button_panel_wrapper"',
      'id="playerHud_mapSidebar_districts"'
    )
    .replace(
      'id="db_hover_button_panel_container"',
      'id="playerHud_mapSidebar_districts_container"'
    );

  const shared = `<!-- Shared map overlay + district toggle sidebars (TOR-444 Option B).
     Root visibility = seats with map open; hover/active layers use per-player visibility unions.
     Per-seat map HorizontalLayout keeps width spacers so the pan surface stays aligned. -->
<Panel id="playerHud_mapSidebarsShared" class="playerHud_coreLayer" visibility="None" active="false" raycastTarget="false">
  <HorizontalLayout class="hud_map_parent_container" raycastTarget="false">
${left}
    <Panel class="hud_map_center_container" raycastTarget="false" color="clear" />
    <Panel class="hud_map_navigation_panel" raycastTarget="false" />
${right}
  </HorizontalLayout>
</Panel>
`;

  fs.writeFileSync(SHARED_OUT, shared, "utf8");

  const leftSpacer =
    '    <!-- Width spacer for shared overlay sidebar (TOR-444 Option B). -->\n    <Panel class="hud_map_hover_button_panel_wrapper" raycastTarget="false" />\n';
  const rightSpacer =
    '    <!-- Width spacer for shared district sidebar (TOR-444 Option B). -->\n    <Panel class="hud_map_hover_button_panel_wrapper" raycastTarget="false" />\n';

  t = t.replace(leftM[0], leftSpacer.trimEnd());
  t = t.replace(rightM[0], rightSpacer.trimEnd());
  fs.writeFileSync(TEMPLATE, t, "utf8");

  console.log(
    `[extract_map_sidebars_shared] Wrote ${path.relative(ROOT, SHARED_OUT)} (${shared.length} chars)`
  );
  console.log(`[extract_map_sidebars_shared] Updated ${path.relative(ROOT, TEMPLATE)}`);
}

main();
