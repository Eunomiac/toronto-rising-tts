#!/usr/bin/env node
"use strict";

/**
 * Push assets/ to Steam Cloud (the same push the build runs), then delete Cloud copies
 * of files removed locally. Run npm run build afterwards so outputs pick up new links.
 *
 * Usage: npm run cloud:push [-- --dry-run] [--protect-all-saves]
 */

const { loadCloudConfig } = require("./lib/cloud_config.js");
const { openSteamSession } = require("./lib/steam_session.js");
const { planPush, applyPush, applyDeletes } = require("./lib/push.js");

/**
 * @param {ReturnType<typeof planPush>} plan
 */
function printPlan(plan) {
  for (const d of plan.localDuplicates) console.log(`DUPLICATE LOCAL ${d.file}: same file as ${d.sameAs}; Cloud keeps one copy`);
  for (const f of plan.uploads) console.log(`upload  ${f.relPath}`);
  for (const m of plan.moves) console.log(`move    ${m.row.folder}/${m.row.name} → ${m.folder}`);
  for (const c of plan.deleteCandidates) console.log(`delete  ${c.row.folder}/${c.row.name} (${c.reason})`);
  if (plan.cloudOnly.length > 0) {
    console.log(`${plan.cloudOnly.length} Cloud file(s) under the root were never synced from assets/ (see npm run cloud:strays).`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const cfg = loadCloudConfig();
  const session = openSteamSession();
  try {
    const plan = planPush(cfg, session);
    printPlan(plan);
    console.log(
      `${plan.inSync.length} in sync, ${plan.uploads.length} to upload, ${plan.moves.length} to move, ${plan.deleteCandidates.length} to delete.`,
    );
    if (args.has("--dry-run")) return;
    const pushed = await applyPush(cfg, session, plan, { label: "push", log: (m) => console.log(m) });
    if (pushed.skipped) {
      process.exitCode = 1;
      return;
    }
    const { deleted, kept } = applyDeletes(cfg, session, plan, {
      label: "push",
      log: (m) => console.log(m),
      warn: (m) => console.warn(`WARN ${m}`),
      protectAllSaves: args.has("--protect-all-saves"),
    });
    console.log(`Push done: ${plan.uploads.length} uploaded, ${plan.moves.length} moved, ${deleted.length} deleted, ${kept.length} kept.`);
  } finally {
    session.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
