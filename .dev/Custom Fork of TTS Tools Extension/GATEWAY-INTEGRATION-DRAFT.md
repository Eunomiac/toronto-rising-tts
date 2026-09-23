# TTS Tools Gateway — Integration Guide (DRAFT)

> **Status:** Preliminary design draft. The gateway is **not implemented yet**. APIs, ports, and message shapes may change before v1. This document describes the intended third-party experience so we can validate the design.

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

**Do not** poll TTS ports for “is anyone home?” status. Connecting to **39999** or briefly binding **39998** from a status timer hitch Tabletop Simulator. Until the gateway answers hold-state without touching TTS, dashboards should only report whether **they** currently hold 39998.

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

> Package name and version are placeholders until published.

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
  // "gateway" | "direct" | "disconnected" — library managed the switch
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
| Gateway down / Cursor quit | Falls back to **direct** listen on 39998 |
| Gateway appears while you held 39998 | Detects port loss / claims; **re-registers** with the gateway |
| `executeLua` return routing | Sends via gateway when attached; tracks `returnID` |
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

Use **one** bridge for the whole app (PC UI, Lua panel, importers, …). Do not open multiple competing 39998 listeners inside one process.

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
| `executeLua` / anything needing a return | Through the gateway (or library equivalent when in direct mode) |
| Pure fire-and-forget (if exposed) | May hit TTS **39999** directly |

Prefer the library methods; do not open raw sockets to 39999 for returns unless you are on Layer 2/3 and know the demux rules.

### Lifecycle notes

- **Starting Cursor / enabling TTS Tools** starts the gateway helper (if not already running) and force-claims 39998.
- **Quitting Cursor / disabling the extension** stops the gateway. Your library session should flip to `direct` or `disconnected` via `status` events.
- **Extension Host reload** may briefly drop the gateway; the library is expected to auto-recover.

---

## Layer 2 — Gateway protocol (non-JS)

Implement this only if you cannot use the npm client. Prefer matching whatever `gateway-client` does in the final release — this section will be expanded with exact JSON schemas when the control API stabilizes.

### Ports (planned defaults — TBD)

| Port | Role |
| --- | --- |
| `39998` | TTS → editor messages (held by **gateway** when running; by your app when in direct mode) |
| `39999` | Client → TTS commands |
| `39xxx` (TBD) | Gateway **control** port (register, heartbeat, proxied executeLua) |

### Client algorithm (must mirror the library)

1. **Discover:** TCP/HTTP ping control port (exact path TBD, e.g. `GET /health` or a one-line JSON hello).
2. **If gateway present:**
   - `REGISTER { clientId, routeTag?, callback... }`
   - Keep **heartbeat**
   - Receive event stream (prints, errors, loads, custom, returns for *your* requests)
   - Send return-expecting commands **via control API**, not by inventing your own returnID demux on a shared broadcast
3. **If gateway absent:**
   - Bind **39998** yourself and speak the [External Editor API](https://api.tabletopsimulator.com/externaleditorapi/) as today
4. **If your 39998 server dies** while a control port appears: treat as gateway claim → go to step 2
5. **If heartbeat fails:** close register → go to step 3

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

> This stub will be filled with a minimal Node example that speaks the control port once the protocol freezes. Until then, use Layer 1.

Sketch only:

```ts
// DRAFT — do not ship; API not final
async function main() {
  const gatewayUp = await pingControlPort();
  if (gatewayUp) {
    await registerAndListen();
  } else {
    await listenDirect39998();
  }
}
```

If you paste this into production, you own keeping it updated when the protocol changes. **Use Layer 1 instead.**

---

## External Editor API refresher

Official docs: [Tabletop Simulator — External Editor API](https://api.tabletopsimulator.com/externaleditorapi/).

The gateway does not replace TTS’s protocol; it **multiplexes** the single 39998 listener and helps with return routing when multiple tools are attached.

---

## FAQ

**Q: Do I need the TTS Tools extension installed?**
For multi-app use, yes (it ships/starts the gateway). For solo use of your tool, no — bind 39998 yourself (or use the client in direct mode).

**Q: Will the gateway keep running after I close Cursor?**
No (v1). Closing Cursor / disabling the extension stops the helper. Your client should fall back to direct mode.

**Q: Can two apps both bind 39998?**
No. Either the gateway holds it, or exactly one direct listener. The client library prevents your app from fighting itself; it cannot stop a *different* app that ignores this guide.

**Q: How do I debug “who got this print”?**
Use an optional `routeTag` and `<@YOURTAG@>` prefixes from Lua, or temporarily log all broadcasts.

**Q: Is there authentication?**
Planned for Marketplace readiness: a user-local token so random processes cannot register silently. Draft clients should assume “localhost trust” until that lands.

---

## Document history

| Version | Notes |
| --- | --- |
| draft-0 | Preliminary README aligned with Toronto Rising fork design notes (Save & Play / port gateway plan). Not implemented. |
