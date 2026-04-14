#!/usr/bin/env node
/**
 * MCP stdio server: execute Lua in Tabletop Simulator via the External Editor API (localhost 39998/39999).
 *
 * Agent guidance: dev/TTS_MCP.md; dev/TTS_BUNDLING_SETUP.md (ports 39998/39999); dev/tts-api/Getting Started/External Editor API.md.
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

const customMessageInputSchema = {
  customMessage: z
    .record(z.string(), z.unknown())
    .describe("JSON object forwarded to TTS as `customMessage` (Lua table) for `onExternalMessage`."),
};

server.registerTool(
  "tts_send_custom_message",
  {
    description:
      "Use when the **game** exposes `onExternalMessage` handlers that respond to IDE-driven payloads (e.g. sebaestschjin TTS Tools file writes or custom protocols). Sends External Editor **messageID 2**; TTS forwards `customMessage` as a Lua table. **Does not** collect prints or return values — for debugging or probes with feedback, use `tts_execute_lua` instead. Same prerequisites as execute: TTS + External Editor; watch for port 39998 conflicts with other bridge software.",
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
