# TTS Tools Gateway — Integration Guide (DRAFT)

> **Status:** Control protocol implemented in source (`packages/tts-gateway`, `packages/gateway-client`, extension **2.4.0**). **Not** Marketplace-published yet. APIs may still change before a public release.

**Who this is for:** Authors of local tools that want to talk to Tabletop Simulator’s External Editor API **at the same time** as the TTS Tools VS Code / Cursor extension (or other registered apps).

**Who this is not for:** People who only use the TTS Tools extension alone — you can ignore the gateway; it starts automatically with the extension.

---

## Background (30 seconds)

TTS allows **one** process to listen on editor port **39998** (messages *from* TTS). Many tools can send commands *to* TTS on **39999**.

The **TTS Tools Gateway** is a small helper started by the TTS Tools extension. It:

1. Holds **39998** (force-claims it from other reclaimable listeners; **never** kills Tabletop Simulator itself).
2. Lets multiple local apps **register** and receive fan-out of TTS events.
3. Proxies **executeLua** (and other return-expecting calls) so `returnMessage`s go to the right client.

When the gateway is **not** running (Cursor closed, extension disabled), apps talk to TTS **directly** on 39998 — same as today. Prefer using the client library so that failover is automatic.

**Do not** poll TTS ports for “is anyone home?” status. Connecting to **39999** or briefly binding **39998** from a status timer hitch Tabletop Simulator. The gateway control port (**39997**) can answer presence without touching TTS.

---

## Choose your integration path

| Layer | Use when | Effort |
| --- | --- | --- |
| **1 — `@tts-tools/gateway-client` (recommended)** | Your app is Node / Electron / VS Code / similar | ~10 lines |
| **2 — Gateway protocol** | You cannot use npm (Python, C#, Go, …) | Implement the control API yourself |
| **3 — Copy-paste stub** | Tiny one-off script; you accept maintaining it | Paste + tweak |

**Rule of thumb:** If you can install an npm package, use **Layer 1**. Do not re-implement port claiming, return-ID routing, or failover in your app.

---

## Layer 1 — `@tts-tools/gateway-client` (recommended)

### Install

```bash
npm install @tts-tools/gateway-client
```

> Until published to npm, depend on the monorepo path: `file:../gateway-client` next to `tts-tools`.

### Minimal example

```ts
import { connectGateway } from "@tts-tools/gateway-client";

const tts = await connectGateway({
  // Optional. Used for tagged print/error routing (see below).
  routeTag: "MYAPP",
});

tts.on("print", (message) => {
  console.log("[TTS]", message);
});

tts.on("error", (payload) => {
  console.error("[TTS error]", payload.guid, payload.errorMessagePrefix, payload.error);
});

tts.on("loadingANewGame", (payload) => {
  // scriptStates from TTS after load / Save & Play
  console.log("scripts:", payload.scriptStates?.length);
});

tts.on("customMessage", (payload) => {
  console.log("custom", payload.customMessage);
});

tts.on("status", (status) => {
  // Epic C: "gateway" | "disconnected" — full auto-rejoin is a later release
  console.log("TTS link:", status.mode, status.detail ?? "");
});

// Anything that expects a return value — always go through the client
const result = await tts.executeLua(`return 1 + 1`);
console.log(result); // 2

// Clean shutdown when your app exits
await tts.close();
```

### What the library does for you

You should **not** write this yourself:

| Concern | Handled by `gateway-client` |
| --- | --- |
| Is the gateway up? | Pings the control port |
| Gateway up | Registers; receives fan-out |
| Gateway down / Cursor quit | Session emits `disconnected` (full direct fallback = later) |
| `executeLua` return routing | Sends via gateway; tracks `requestId` |
| Heartbeats | Detects dead gateway quickly |

Your app code stays at: connect → subscribe → call helpers → close.

### Suggested app structure

```ts
// ttsBridge.ts — single module all your features import
import { connectGateway, type GatewaySession } from "@tts-tools/gateway-client";

let session: GatewaySession | undefined;

export async function getTts(): Promise<GatewaySession> {
  if (!session) {
    session = await connectGateway({ routeTag: "MYAPP" });
  }
  return session;
}
```

Use **one** bridge for the whole app. Do not open multiple competing 39998 listeners inside one process.

### Optional: tagged messages from Lua

If you register `routeTag: "MYAPP"`, TTS Lua can target only your app:

```lua
print("<@MYAPP@>Only MYAPP should see this")
print("Everyone registered (and direct listeners) see this")
```

Untagged print / error / custom string bodies are **broadcast** to all registered clients. The gateway strips `<@TAG@>` before delivery when it matches a registrant.

Tags are **optional**. Most apps never need them.

### Fire-and-forget vs returns

| Call | Path |
| --- | --- |
| `executeLua` / anything needing a return | Through the gateway |
| Pure fire-and-forget (if exposed) | May hit TTS **39999** directly |

Prefer the library methods; do not open raw sockets to 39999 for returns unless you are on Layer 2/3 and know the demux rules.

### Lifecycle notes

- **Starting Cursor / enabling TTS Tools** starts the gateway helper (if not already running) and force-claims 39998.
- **Quitting Cursor / disabling the extension** stops the gateway. Your library session should flip to `disconnected` via `status` events.
- **Extension Host reload** may briefly drop the gateway; reconnect after reload.

---

## Layer 2 — Gateway protocol (non-JS)

Implement this only if you cannot use the npm client. Prefer matching whatever `gateway-client` does.

### Ports (frozen for v1 source)

| Port | Role |
| --- | --- |
| `39998` | TTS → editor messages (held by **gateway** when running; by your app when in direct mode) |
| `39999` | Client → TTS commands |
| `39997` | Gateway **control** port (register, heartbeat, proxied executeLua) — NDJSON, one JSON object per line |

### Control messages (client → gateway)

```json
{"type":"register","clientId":"my-app","routeTag":"MYAPP"}
{"type":"heartbeat"}
{"type":"executeLua","requestId":1,"script":"return 1","guid":"-1"}
{"type":"command","payload":{"messageID":0}}
{"type":"shutdown"}
```

### Control messages (gateway → client)

```json
{"type":"hello","version":1,"editorPort":39998,"commandPort":39999}
{"type":"registered","clientId":"my-app","routeTag":"MYAPP"}
{"type":"heartbeat"}
{"type":"event","messageID":2,"payload":{"messageID":2,"message":"hello"}}
{"type":"return","requestId":1,"returnValue":2}
{"type":"error","message":"...","requestId":1}
```

### Client algorithm

1. **Discover:** TCP connect to **39997**.
2. **If gateway present:** wait for `hello` → `register` → keep **heartbeat** → receive `event` / `return`.
3. **If gateway absent:** bind **39998** yourself and speak the [External Editor API](https://api.tabletopsimulator.com/externaleditorapi/) as today.
4. **If heartbeat fails:** close → go to step 3 (or reconnect when control returns).

### Fan-out rules (inbound from TTS)

| Event | Routing |
| --- | --- |
| `print` / `error` / `loadingANewGame` / `customMessage` | Broadcast to all registrants, unless optional `<@TAG@>` matches one `routeTag` (then unicast + strip) |
| `returnMessage` | **Unicast** to the client that issued the corresponding proxied request |

### Do not

- Kill `TabletopSimulator.exe` when claiming ports.
- Assume you are the only listener without checking the control port first.
- Send `executeLua` to 39999 while registered with the gateway and expect to see the return on your own socket — returns arrive on **39998** at the gateway; you must use the proxied API.

---

## Layer 3 — Copy-paste stub (last resort)

Prefer Layer 1. Minimal Node sketch:

```ts
import * as net from "node:net";

async function main() {
  const socket = net.connect(39997, "127.0.0.1");
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      if (msg.type === "hello") {
        socket.write(JSON.stringify({ type: "register", clientId: "stub" }) + "\n");
      }
      console.log(msg);
    }
  });
}
```

---

## External Editor API refresher

Official docs: [Tabletop Simulator — External Editor API](https://api.tabletopsimulator.com/externaleditorapi/).

The gateway does not replace TTS’s protocol; it **multiplexes** the single 39998 listener and helps with return routing when multiple tools are attached.

---

## FAQ

**Q: Do I need the TTS Tools extension installed?**
For multi-app use, yes (it ships/starts the gateway). For solo use of your tool, no — bind 39998 yourself (or use the client when a gateway is already up).

**Q: Will the gateway keep running after I close Cursor?**
No (v1). Closing Cursor / disabling the extension stops the helper.

**Q: Can two apps both bind 39998?**
No. Either the gateway holds it, or exactly one direct listener.

**Q: How do I debug “who got this print”?**
Use an optional `routeTag` and `<@YOURTAG@>` prefixes from Lua, or temporarily log all broadcasts.

**Q: Is there authentication?**
Planned for Marketplace readiness: a user-local token so random processes cannot register silently. Draft clients should assume “localhost trust” until that lands.

---

## Document history

| Version | Notes |
| --- | --- |
| draft-0 | Preliminary README aligned with fork design notes. Not implemented. |
| draft-1 | Control port **39997** frozen; NDJSON shapes documented; source implementation in tts-tools 2.4.0. |
