import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EDITOR_PORT = 39998;

export type EditorPortListener = {
  readonly pid: number;
  readonly name: string;
  readonly command: string;
  readonly addresses: readonly string[];
};

export type ReclaimResult = {
  readonly killed: readonly EditorPortListener[];
  readonly skipped: readonly EditorPortListener[];
  readonly leftover: readonly EditorPortListener[];
  readonly failed: readonly { readonly pid: number; readonly error: string }[];
};

const LIST_CONNECTIONS_PS = `
$ErrorActionPreference = 'SilentlyContinue'
Get-NetTCPConnection -LocalPort ${EDITOR_PORT} |
  Where-Object { $_.State -eq 'Listen' } |
  ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess
    $cim = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.OwningProcess)
    [PSCustomObject]@{
      localAddress = $_.LocalAddress
      pid = $_.OwningProcess
      name = $proc.ProcessName
      command = $cim.CommandLine
    }
  } | ConvertTo-Json -Compress
`;

const isTabletopSimulator = (listener: EditorPortListener): boolean => {
  const name = listener.name.trim().toLowerCase();
  const command = listener.command.toLowerCase();
  return name.includes("tabletop") || /tabletopsimulator\.exe\b/.test(command);
};

export const shouldKillListener = (listener: EditorPortListener, selfPid: number): boolean => {
  if (listener.pid === selfPid) {
    return false;
  }
  if (isTabletopSimulator(listener)) {
    return false;
  }
  return true;
};

const parseListeners = (raw: string): EditorPortListener[] => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const parsed: unknown = JSON.parse(trimmed);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const byPid = new Map<number, { pid: number; name: string; command: string; addresses: string[] }>();
  for (const row of rows) {
    if (typeof row !== "object" || row === null) {
      continue;
    }
    const record = row as Record<string, unknown>;
    const pid = Number(record.pid);
    if (!Number.isInteger(pid) || pid <= 4) {
      continue;
    }
    const address = String(record.localAddress ?? "");
    const existing = byPid.get(pid);
    if (existing) {
      if (!existing.addresses.includes(address)) {
        existing.addresses.push(address);
      }
      continue;
    }
    byPid.set(pid, {
      pid,
      name: String(record.name ?? ""),
      command: record.command == null ? "" : String(record.command),
      addresses: [address]
    });
  }
  return [...byPid.values()];
};

export const listEditorPortListeners = async (): Promise<EditorPortListener[]> => {
  if (process.platform !== "win32") {
    throw new Error("Clearing port 39998 is only implemented on Windows.");
  }
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", LIST_CONNECTIONS_PS],
    { windowsHide: true, encoding: "utf8" }
  );
  return parseListeners(stdout);
};

const killPid = async (pid: number): Promise<void> => {
  await execFileAsync("taskkill.exe", ["/PID", String(pid), "/F"], {
    windowsHide: true,
    encoding: "utf8"
  });
};

export const reclaimEditorPort = async (selfPid: number): Promise<ReclaimResult> => {
  const listeners = await listEditorPortListeners();
  const skipped = listeners.filter((listener) => !shouldKillListener(listener, selfPid));
  const targets = listeners.filter((listener) => shouldKillListener(listener, selfPid));
  const killed: EditorPortListener[] = [];
  const failed: { pid: number; error: string }[] = [];
  for (const listener of targets) {
    try {
      await killPid(listener.pid);
      killed.push(listener);
    } catch (error: unknown) {
      failed.push({
        pid: listener.pid,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  const leftover = await listEditorPortListeners();
  return { killed, skipped, leftover, failed };
};
