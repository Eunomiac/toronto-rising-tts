/**
 * Opt-in live runner for core/pav_verification.ttslua (TOR-759).
 *
 * Usage:
 *   npm run verify:pav -- list
 *   npm run verify:pav -- TOR-758
 *   npm run verify:pav -- start TOR-755
 *   npm run verify:pav -- finish
 *   npm run verify:pav -- stop
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

const args = process.argv.slice(2);
const usage = `PAV verification commands:
  npm run verify:pav -- list
  npm run verify:pav -- TOR-758
  npm run verify:pav -- run TOR-756
  npm run verify:pav -- start TOR-755
  npm run verify:pav -- finish
  npm run verify:pav -- stop`;

if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
  console.log(usage);
  process.exit(0);
}

let command = args[0] ?? "list";
let issueId = args[1];
if (/^TOR-\d+$/.test(command)) {
  issueId = command;
  command = "run";
}

if (!["list", "run", "start", "finish", "stop"].includes(command)) {
  console.error(`Unknown command: ${command}\n\n${usage}`);
  process.exit(2);
}
if ((command === "run" || command === "start") && !/^TOR-\d+$/.test(issueId ?? "")) {
  console.error(`${command} requires an issue id such as TOR-758.\n\n${usage}`);
  process.exit(2);
}

const calls = {
  list: "DEBUG.verifyPavList()",
  run: `DEBUG.verifyPav(${JSON.stringify(issueId)})`,
  start: `DEBUG.verifyPavStart(${JSON.stringify(issueId)})`,
  finish: "DEBUG.verifyPavFinish()",
  stop: "DEBUG.verifyPavStop()",
};
const script = [
  `local result = ${calls[command]}`,
  "local encoded = JSON.encode(result)",
  "print(encoded)",
  "return encoded",
].join("\n");

const bridge = new TtsExternalEditorBridge();
try {
  const response = await bridge.executeWithOutput({
    script,
    guid: "-1",
    maxWaitMs: 20_000,
    idleTimeoutMs: 1_000,
  });
  if (response.error) {
    throw new Error(response.error.errorMessagePrefix || response.error.message);
  }
  if (response.timedOut) {
    throw new Error("The PAV command timed out waiting for Tabletop Simulator.");
  }
  const raw = typeof response.returnValue === "string"
    ? response.returnValue
    : [...response.prints].reverse().find((line) => line.trim().startsWith("{") || line.trim().startsWith("["));
  if (!raw) {
    throw new Error("Tabletop Simulator returned no JSON result.");
  }
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify(parsed, null, 2));
  if (parsed?.status === "fail") {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("If port 39998 is held by another editor bridge, release it before retrying.");
  process.exitCode = 1;
} finally {
  await bridge.close();
}
