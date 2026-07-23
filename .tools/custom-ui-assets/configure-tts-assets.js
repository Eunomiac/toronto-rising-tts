#!/usr/bin/env node
"use strict";

/**
 * Create or rewrite tts-assets.config.json (interactive).
 *
 *   npm run tts-assets:configure
 */

const { loadOrSetupConfig } = require("./lib/tts-assets-config.js");

async function main() {
  const result = await loadOrSetupConfig({ interactive: true, forceSetup: true });
  console.error(`[tts-assets] Config ready: ${result.configPath}`);
  console.error(`[tts-assets] savesDir=${result.config.savesDir}`);
  console.error(`[tts-assets] defaultSaveName=${result.config.defaultSaveName}`);
  console.error(
    `[tts-assets] backupBeforeWrite=${result.config.backupBeforeWrite !== false}`,
  );
}

main().catch((err) => {
  console.error(`[tts-assets] FAIL: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
