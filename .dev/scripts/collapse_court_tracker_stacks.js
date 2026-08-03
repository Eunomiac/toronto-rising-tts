"use strict";

/**
 * TOR-444: Collapse Prince's Court exclusive tracker stacks (on/agg/sup or on/impaired/stain)
 * to one Image per cell with guarded image= swaps.
 *
 * Rewrites ui/shared/panel_ref_princes_court.xml in place.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "../..");
const COURT = path.join(projectRoot, "ui/shared/panel_ref_princes_court.xml");

let xml = fs.readFileSync(COURT, "utf8");

/** @type {RegExp} */
const tripleHealthWill = /<Image id="box_on_(health|willpower)_(\d+)_([A-Za-z]+)"([^/]*?)\/>\s*<Image id="box_agg_\1_\2_\3"[^/]*\/>\s*<Image id="box_sup_\1_\2_\3"[^/]*\/>/g;

xml = xml.replace(tripleHealthWill, (_m, kind, n, seat, attrs) => {
  const offset = (attrs.match(/offsetXY="[^"]+"/) || ["offsetXY=\"0 0\""])[0];
  return `<Image id="box_${kind}_${n}_${seat}" image="box_white" class="box box_standard" ${offset} active="false" />`;
});

const tripleHumanity =
  /<Image id="box_on_humanity_(\d+)_([A-Za-z]+)"([^/]*?)\/>\s*<Image id="box_impaired_humanity_\1_\2"[^/]*\/>\s*<Image id="box_stain_humanity_\1_\2"[^/]*\/>/g;

xml = xml.replace(tripleHumanity, (_m, n, seat, attrs) => {
  const offset = (attrs.match(/offsetXY="[^"]+"/) || ["offsetXY=\"0 0\""])[0];
  return `<Image id="box_humanity_${n}_${seat}" image="box_white" class="box box_standard" ${offset} active="false" />`;
});

// Hunger stays single Image (box_on_hunger_N_Seat) — rename to box_hunger_N_Seat for consistency
xml = xml.replace(
  /id="box_on_hunger_(\d+)_([A-Za-z]+)"/g,
  'id="box_hunger_$1_$2"'
);

const remainingOn = (xml.match(/id="box_on_(health|willpower|humanity)_/g) || []).length;
const remainingAgg = (xml.match(/id="box_agg_/g) || []).length;
if (remainingOn > 0 || remainingAgg > 0) {
  console.warn(
    `[collapse_court_trackers] leftover stacks: on=${remainingOn} agg=${remainingAgg}`
  );
}

fs.writeFileSync(COURT, xml, "utf8");
console.log("[collapse_court_trackers] Rewrote", path.relative(projectRoot, COURT));
