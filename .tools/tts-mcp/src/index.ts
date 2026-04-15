#!/usr/bin/env node
/**
 * MCP stdio server: execute Lua in Tabletop Simulator via the External Editor API (localhost 39998/39999).
 *
 * Agent guidance: .dev/TTS_MCP.md; .dev/TTS_BUNDLING_SETUP.md (ports 39998/39999); .dev/tts-api/Getting Started/External Editor API.md.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import net from "node:net";
import * as z from "zod/v4";
import { quietRefreshObject, TtsExternalEditorBridge } from "../../tts-bridge/dist/index.js";

const bridge = new TtsExternalEditorBridge();

/**
 * True if something accepts TCP on host:port before timeoutMs (TTS outbound editor port is 39999).
 */
function probeTcpAcceptsConnections(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

const server = new McpServer({
  name: "toronto-rising-tts",
  version: "1.0.0",
});

const executeInputSchema = {
  script: z.string().describe("Lua snippet executed in TTS for the given object GUID."),
  guid: z
    .string()
    .optional()
    .describe('Target script context (default Global: "-1").'),
  maxWaitMs: z
    .number()
    .int()
    .positive()
    .max(120_000)
    .optional()
    .describe(
      "Wall-clock cap (ms) for the whole execute: after this, `timedOut: true` if nothing finished the session earlier. Bridge default 30000 when omitted. Raise toward the 120000 max for multi-minute sequences (e.g. lighting tests); leave lower for quick probes."
    ),
  idleTimeoutMs: z
    .number()
    .int()
    .positive()
    .max(60_000)
    .optional()
    .describe(
      "After the last inbound print/custom during a print-driven run, wait this many ms of silence before treating the execute as done. Default 60000 when omitted (forgiving for gaps between sequence steps). Pass a smaller value (e.g. 2000–5000) for fast print-only snippets where latency matters. Does not apply the full wait when the snippet ends with a JSON-serializable `return` (TTS sends completion promptly)."
    ),
};

const executeOutputSchema = {
  prints: z.array(z.string()),
  returnValue: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
      guid: z.string(),
      errorMessagePrefix: z.string(),
    })
    .optional(),
  customMessages: z.array(z.unknown()),
  timedOut: z.boolean(),
};

server.registerTool(
  "tts_execute_lua",
  {
    description:
      "Use this tool whenever you need to run Lua against the **live Tabletop Simulator session** and read back results — e.g. inspect objects, validate state, reproduce bugs with print/return, or verify scripted behavior without asking the user to paste TTS console output. Prefer calling it **proactively** for Toronto Rising / TTS tasks when runtime feedback matters, not only when the user says \"run this in TTS\". Prerequisites: TTS is open with a table loaded and **External Editor** enabled in game options. Executes in script context of `guid` (default Global `\"-1\"`). Returns: `prints`, optional `returnValue` when TTS sends External Editor `messageID` 5 (snippet returned a JSON-serializable value), `error` on Lua failure, `customMessages` for `sendExternalMessage` during the call, and `timedOut`. **Return values:** booleans, numbers, strings, and typical JSON mappings usually work; raw Lua tables / userdata often do **not** — use `return JSON.encode(yourTable)` or `print(...)` for structured data. Empty `return` may omit `returnValue` from the payload. **Timeouts (set explicitly when shape matters):** default `idleTimeoutMs` is 60s — good for long coroutine/sequence gaps; use a **shorter** `idleTimeoutMs` for quick print-only probes. Default `maxWaitMs` is 30s — use a **higher** `maxWaitMs` (up to 120s) when the whole run can exceed that. A snippet that **returns** a serializable value typically completes without waiting the full idle window after prints. If `EADDRINUSE` on port 39998 appears, another editor bridge holds the inbound port — release it or pause that integration.",
    inputSchema: executeInputSchema,
    outputSchema: executeOutputSchema,
  },
  async ({ script, guid, maxWaitMs, idleTimeoutMs }) => {
    const result = await bridge.executeWithOutput({
      script,
      guid: guid ?? "-1",
      maxWaitMs: maxWaitMs ?? undefined,
      idleTimeoutMs: idleTimeoutMs ?? undefined,
    });
    const text = JSON.stringify(result, null, 2);
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        prints: result.prints,
        returnValue: result.returnValue,
        error: result.error,
        customMessages: result.customMessages,
        timedOut: result.timedOut,
      },
    };
  }
);

const bridgeStatusInputSchema = {};

const bridgeStatusOutputSchema = {
  bridgeListening39998: z.boolean(),
  ttsOutbound39999Accepting: z.boolean(),
  hint: z.string(),
};

server.registerTool(
  "tts_bridge_status",
  {
    description:
      "Check whether **this MCP process** is listening on **39998** and whether **Tabletop Simulator** appears to accept editor traffic on **39999**. Use when tools hang, fail with socket errors, or you suspect **rolandostar.tabletopsimulator-lua** / **sebaestschjin.tts-editor** already holds 39998. If startup failed with EADDRINUSE, fix the conflict first (see error text), then restart MCP.",
    inputSchema: bridgeStatusInputSchema,
    outputSchema: bridgeStatusOutputSchema,
  },
  async () => {
    const bridgeListening39998 = bridge.isInboundListening();
    const ttsOutbound39999Accepting = await probeTcpAcceptsConnections("127.0.0.1", 39999, 3000);
    let hint: string;
    if (!bridgeListening39998) {
      hint =
        "This MCP bridge is not listening on 39998 (unexpected after a successful server start). Restart the toronto-rising-tts MCP server.";
    } else if (!ttsOutbound39999Accepting) {
      hint =
        "Nothing accepted TCP on 127.0.0.1:39999 within 3s. Open Tabletop Simulator, load a table, and enable **External Editor** (Options → General). Firewall or another blocker can also cause this.";
    } else {
      hint =
        "39998 (this MCP) and 39999 (TTS) look reachable. If the TTSLua extension still errors on Get Scripts / execute, another tool may be fighting for 39998 — pick one bridge per session or disable the conflicting extension, then restart MCP.";
    }
    const structuredContent = {
      bridgeListening39998,
      ttsOutbound39999Accepting,
      hint,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  }
);

const customMessageInputSchema = {
  customMessage: z
    .record(z.string(), z.unknown())
    .describe("JSON object forwarded to TTS as `customMessage` (Lua table) for `onExternalMessage`."),
};

server.registerTool(
  "tts_send_custom_message",
  {
    description:
      "Use when the **game** exposes `onExternalMessage` handlers that respond to IDE-driven payloads. Sends External Editor **messageID 2**; TTS forwards `customMessage` as a Lua table. **Does not** collect prints or return values — for debugging or probes with feedback, use `tts_execute_lua` instead. **Note:** Lua `sendExternalMessage` with `type: \"write\"` is delivered as **messageID 4** from TTS to the editor; the repo **tts-bridge** persists those to **`.dev/.debug/`** when it listens on **39998** (Cursor MCP calls `ensureListening` on startup, or run `npm run tts-bridge:listen`). Same prerequisites as execute: TTS + External Editor; only **one** listener may bind **39998** (e.g. pause conflicting VS Code extensions).",
    inputSchema: customMessageInputSchema,
  },
  async ({ customMessage }) => {
    await bridge.sendCustomMessage(customMessage);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true }, null, 2),
        },
      ],
    };
  }
);

const quietRefreshInputSchema = {
  guid: z
    .string()
    .describe(
      "Object GUID to refresh (alphanumeric / hyphen / underscore). **Not** Global `-1` — use Save & Play for Global."
    ),
  luaEntryPath: z
    .string()
    .optional()
    .describe(
      "Optional. Path to object Lua (stub or script), relative to `repoRoot` unless absolute. **Omit both** `luaEntryPath` and `xmlPath` to auto-find `*.guid.lua` / `*.guid.xml` under `repoRoot` and `TTS_OBJECT_SYNC_DIRS`."
    ),
  xmlPath: z
    .string()
    .optional()
    .describe(
      "Optional. Path to object UI XML. **Omit both** paths for auto-discovery (game-day workflow)."
    ),
  repoRoot: z
    .string()
    .optional()
    .describe(
      "Repository root used for `require` / `<Include>` resolution (passed to `@tts-tools/savefile` bundleObject). Defaults to `process.cwd()` (set MCP `cwd` to your clone in mcp.json)."
    ),
  luaStatePath: z
    .string()
    .optional()
    .describe(
      "Optional path to LuaScriptState text; when set, replaces state from live getJSON before bundling."
    ),
  maxWaitMs: z
    .number()
    .int()
    .positive()
    .max(120_000)
    .optional()
    .describe(
      "Per execute round-trip cap (fetch getJSON + spawn). Default bridge 30000 if omitted; raise to 120000 for large objects / slow spawns."
    ),
  idleTimeoutMs: z
    .number()
    .int()
    .positive()
    .max(120_000)
    .optional()
    .describe(
      "Idle gap tolerance after last print (mainly affects steps without a return). Default 60000; increase if spawn triggers long print sequences."
    ),
};

const quietRefreshOutputSchema = {
  error: z.string().optional().describe("Set when validation, I/O, bundle, or Lua failed before/during refresh."),
  bundledJsonChars: z.number().int().optional(),
  fetch: z.object({
    prints: z.array(z.string()),
    returnValue: z.unknown().optional(),
    error: executeOutputSchema.error,
    customMessages: z.array(z.unknown()),
    timedOut: z.boolean(),
  }),
  spawn: z
    .object({
      prints: z.array(z.string()),
      returnValue: z.unknown().optional(),
      error: executeOutputSchema.error,
      customMessages: z.array(z.unknown()),
      timedOut: z.boolean(),
    })
    .optional(),
};

server.registerTool(
  "tts_quiet_refresh_object",
  {
    description:
      "Refresh **one** object’s Lua + UI in the **live** table **without** Save & Play. Fetches `getJSON()`, merges disk Lua/XML, bundles with `@tts-tools/savefile`, then Global `destruct` + `spawnObjectJSON`. **GUID-only:** omit `luaEntryPath` and `xmlPath` to find `*.guid.lua` / `*.guid.xml` under MCP `cwd` and optional `TTS_OBJECT_SYNC_DIRS` (see `.cursor/mcp.json`). **Caveats:** object is recreated (flicker; userdata refs may break). **Not for Global** (`-1`). Only one process may listen on **39998**; if a VS Code TTS extension holds it, MCP may be down — use one bridge per session.",
    inputSchema: quietRefreshInputSchema,
    outputSchema: quietRefreshOutputSchema,
  },
  async ({ guid, luaEntryPath, xmlPath, repoRoot, luaStatePath, maxWaitMs, idleTimeoutMs }) => {
    const luaTrim = luaEntryPath?.trim() ?? "";
    const xmlTrim = xmlPath?.trim() ?? "";
    const hasLua = luaTrim.length > 0;
    const hasXml = xmlTrim.length > 0;
    if (hasLua !== hasXml) {
      throw new Error("Provide both luaEntryPath and xmlPath, or omit both for auto-discovery.");
    }

    const root = repoRoot ?? process.cwd();
    const result = await quietRefreshObject(bridge, {
      guid,
      repoRoot: root,
      luaEntryPath: hasLua ? luaTrim : undefined,
      xmlPath: hasXml ? xmlTrim : undefined,
      luaStatePath: luaStatePath ?? undefined,
      maxWaitMs: maxWaitMs ?? undefined,
      idleTimeoutMs: idleTimeoutMs ?? undefined,
    });
    const text = JSON.stringify(result, null, 2);
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        error: result.error,
        bundledJsonChars: result.bundledJsonChars,
        fetch: result.fetch,
        spawn: result.spawn,
      },
    };
  }
);

async function main(): Promise<void> {
  await bridge.ensureListening();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(
    "tts-mcp:",
    error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : error
  );
  process.exitCode = 1;
});
