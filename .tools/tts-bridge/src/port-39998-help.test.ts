import { describe, expect, it } from "vitest";
import { formatInboundPortConflictMessage } from "./port-39998-help.js";

describe("formatInboundPortConflictMessage", () => {
  it("includes port, extension names, and system detail", () => {
    const msg = formatInboundPortConflictMessage(39998, "listen EADDRINUSE: address already in use 127.0.0.1:39998");
    expect(msg).toContain("39998");
    expect(msg).toContain("rolandostar.tabletopsimulator-lua");
    expect(msg).toContain("EADDRINUSE");
  });
});
