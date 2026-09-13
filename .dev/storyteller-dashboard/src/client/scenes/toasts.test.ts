import { afterEach, describe, expect, it } from "vitest";
import { initToasts } from "./toasts";

describe("initToasts", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("removes a toast when it is clicked", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const { push } = initToasts(root);
    push("error", "Drop tokens on the control board.");
    const toast = root.querySelector("button");
    expect(toast).not.toBeNull();
    toast?.click();
    expect(root.querySelector("button")).toBeNull();
  });
});
