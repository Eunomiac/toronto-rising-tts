"use strict";

const fs = require("fs");
const path = require("path");

const playbookPath = path.join(__dirname, "..", "E2E Playbooks", "Dice-E2E.md");
let content = fs.readFileSync(playbookPath, "utf8");

content = content.replace(
  /function\(\)\s*\n((?:    [^\n]+\n)*?)(    rollE2eSettlePresetCheck\(([^\n]+)\)\s*\n)((?:    [^\n]+\n)*?)  end,/g,
  (match, before, settleLine, settleArgs, after) => {
    if (
      before.includes("rollE2eSettlePresetCheck") ||
      after.includes("rollE2eSettlePresetCheckResume") ||
      before.includes("return rollE2eSettlePresetCheck")
    ) {
      return match;
    }
    const colorMatch = settleArgs.match(/^"([^"]+)"/);
    const color = colorMatch ? colorMatch[1] : "Brown";
    const settleOnly = before.trim() === "" && after.trim() === "";
    if (settleOnly) {
      return [
        "function()",
        "    return rollE2eSettlePresetCheck(" + settleArgs + ")",
        "  end,",
        "  function()",
        '    rollE2eSettlePresetCheckResume("' + color + '")',
        "  end,",
      ].join("\n");
    }
    return [
      "function()",
      before + "    return rollE2eSettlePresetCheck(" + settleArgs + ")",
      "  end,",
      "  function()",
      '    rollE2eSettlePresetCheckResume("' + color + '")',
      after + "  end,",
    ].join("\n");
  }
);

fs.writeFileSync(playbookPath, content);
console.log("[patch_dice_e2e_settle] done");
