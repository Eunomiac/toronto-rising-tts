#!/usr/bin/env node
/**
 * MCP stdio server: execute Lua in Tabletop Simulator via the External Editor API (localhost 39998/39999).
 *
 * Agent guidance: .dev/TTS_MCP.md; .dev/TTS_BUNDLING_SETUP.md (ports 39998/39999); .dev/tts-api/Getting Started/External Editor API.md.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { TtsExternalEditorBridge } from "../../tts-bridge/dist/index.js";

const bridge = new TtsExternalEditorBridge();

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
    .max(120_000)
    .optional()
    .describe(
      "After the last inbound print/custom during a print-driven run, wait this many ms of silence before treating the execute as done. Bridge default 90000 when omitted (forgiving for gaps between sequence steps, e.g. easing visual demos). Pass a smaller value (e.g. 2000–5000) for fast print-only snippets where latency matters. When TTS sends `messageID` 5 promptly (e.g. `return` of a string/number/boolean or JSON-friendly value), the bridge often finishes without waiting the full idle window; **nested Lua tables may never trigger a usable `returnValue`**, so prefer `JSON.encode` + `print` per `.dev/TTS_MCP.md` (*Return values*)."
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
      "Use this tool whenever you need to run Lua against the **live Tabletop Simulator session** and read back results — e.g. inspect objects, validate state, reproduce bugs with print/return, or verify scripted behavior without asking the user to paste TTS console output. Prefer calling it **proactively** for Toronto Rising / TTS tasks when runtime feedback matters, not only when the user says \"run this in TTS\". Prerequisites: TTS is open with a table loaded and **External Editor** enabled in game options. Executes in script context of `guid` (default Global `\"-1\"`). Returns: `prints`, optional `returnValue` when TTS sends External Editor `messageID` 5, `error` on Lua failure, `customMessages` for `sendExternalMessage` during the call, and `timedOut`. **Return values:** treat `returnValue` as **best-effort**. Booleans, numbers, strings, and simple JSON-like values usually work. **Nested Lua tables** often produce **no** `returnValue` on the client even when the script succeeded — use **`return JSON.encode(payload)`** and **`print(encoded)`**, then **`JSON.parse`** on the host (fall back to scanning `prints` if needed). **Structured multi-line output:** in this mod use **`U.emitForAgent`** / **`U.mcpEmitResult`** (`lib/util.ttslua`) so each event is a **`TR_AGENT_V1 `** + JSON line (see `.dev/TTS_MCP.md` *Machine-readable agent lines*). Full return-value pattern: `.dev/TTS_MCP.md` *Return values (`messageID` 5) and structured data*; example script: `.tools/tts-bridge/scripts/export-color-object-tags-to-markdown.mjs`. Empty `return` may omit `returnValue`. **Timeouts (set explicitly when shape matters):** default `idleTimeoutMs` is 90s — good for long coroutine/sequence gaps; use a **shorter** `idleTimeoutMs` for quick print-only probes. Default `maxWaitMs` is 30s — use a **higher** `maxWaitMs` (up to 120s) when the whole run can exceed that. If `EADDRINUSE` on port 39998 appears, another editor bridge holds the inbound port — release it or pause that integration.",
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
