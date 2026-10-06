import { executeLua, luaLongString } from "../ttsBridge.js";
import { extractSnapshotJson } from "./bridge.js";
import { parseProjectsSnapshot, type ProjectCommand, type ProjectsSnapshot } from "./projects.js";

const TIMEOUT_MESSAGE = "TTS did not answer. Keep External Editor on; with Cursor open the Dashboard uses the TTS Tools gateway.";

const run = async (script: string): Promise<ProjectsSnapshot> => {
  const result = await executeLua(script);
  if (result.timedOut) {
    throw new Error(TIMEOUT_MESSAGE);
  }
  return parseProjectsSnapshot(JSON.parse(extractSnapshotJson(result)));
};

export const fetchProjectsSnapshot = (): Promise<ProjectsSnapshot> =>
  run(["local json = GlobalDashboardProjectsSnapshot()", "return json"].join("\n"));

/** Resolves with the fresh snapshot; throws the host error so the editor can show it. */
export const applyProjectCommand = async (command: ProjectCommand): Promise<ProjectsSnapshot> => {
  const snapshot = await run([
    `local json = GlobalDashboardProjectsApply(${luaLongString(JSON.stringify(command))})`,
    "return json"
  ].join("\n"));
  if (!snapshot.ok) {
    throw new Error(snapshot.error ?? "Projects apply failed");
  }
  return snapshot;
};
