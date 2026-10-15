import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** npm run npc-art:report — reprints the last npc-art:draw discrepancy list (the Full build's final step). */
const reportPath = path.resolve(import.meta.dirname, "..", "..", "..", "build-logs", "npc-art-discrepancies.txt");
if (!existsSync(reportPath)) {
  throw new Error(`${reportPath} is missing. Run npm run npc-art:draw first.`);
}
const report = readFileSync(reportPath, "utf8");
console.log(`\n${"=".repeat(80)}\n${report.trimEnd()}\n${"=".repeat(80)}`);
