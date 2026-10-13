import { pingSheet } from "./sheetWriter.ts";

/**
 * npm run npc-stats:check-sheet — checks the sheet write-back setup (Apps Script web app, URL and secret in .env)
 * without writing anything.
 */

const reply = await pingSheet();
if (reply.missingHeaders.length > 0) {
  throw new Error(`The web app answered, but ${reply.tab} is missing header(s): ${reply.missingHeaders.join(", ")}`);
}
console.log(`npc-stats:check-sheet: connected. ${reply.tab} has ${reply.keys} API keys and every stat column.`);
