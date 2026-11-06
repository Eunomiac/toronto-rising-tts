"use strict";

const { localFolderFor, isPushExcluded } = require("./assets_tree.js");
const TOKEN_FOLDER = "NPC Art/Tokens";
const TOKEN_FILE = /^npcToken_.+\.(?:front|back)\.webp$/;

// Older contents can remain under the same visible Cloud path after the ledger
// advances to the replacement. A filename alone is not an asset identity.
function planOrphanRetirements(cloudOnly, local, cloudRoot, generatedTokenKeys) {
  const byPath = new Map(local.map(file => [file.relPath.toLowerCase(), file]));
  const generationComplete = generatedTokenKeys.length > 0 && generatedTokenKeys.every(key =>
    byPath.has(`${TOKEN_FOLDER}/npcToken_${key}.front.webp`.toLowerCase()));
  const out = [];
  for (const row of cloudOnly) {
    const folder = localFolderFor(cloudRoot, row.folder);
    if (folder === null || isPushExcluded(folder)) continue;
    const relPath = folder ? `${folder}/${row.name}` : row.name;
    const replacement = byPath.get(relPath.toLowerCase());
    if (replacement) {
      // Shared-storage case aliases have a separate verified index-only path.
      if (replacement.key.toLowerCase() === row.key.toLowerCase()) continue;
      out.push({ relPath, row, reason: "superseded Cloud version", replacement: replacement.relPath });
    } else if (generationComplete && folder === TOKEN_FOLDER && TOKEN_FILE.test(row.name)) {
      out.push({ relPath, row, reason: "absent from completed NPC token generation" });
    }
  }
  return out;
}

function describeCloudStray(row, replacement) {
  const identity = `Cloud SHA-1 ${row.sha1}`;
  return replacement
    ? `${identity}; superseded by ${replacement.path} (SHA-1 ${replacement.sha1}${replacement.job ? `, job ${replacement.job}` : ""})`
    : `${identity}; no current replacement is registered`;
}

module.exports = { planOrphanRetirements, describeCloudStray };
