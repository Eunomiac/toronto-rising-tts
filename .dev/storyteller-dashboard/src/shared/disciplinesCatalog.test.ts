import { describe, expect, it } from "vitest";
import {
  buildDisciplineLookup,
  disciplineTooltipHtml,
  isDisciplineCatalogKind,
  kindForExportDiscipline,
  lookupDisciplineEntry,
  type DisciplineEntry
} from "./disciplinesCatalog.js";

const entry = (partial: Partial<DisciplineEntry> & Pick<DisciplineEntry, "name" | "kind" | "discipline">): DisciplineEntry => ({
  level: 1,
  description: "Flavor.",
  rouseChecks: "1",
  ingredients: "",
  process: "",
  source: "VTM p.1",
  systemHtml: "<b>On a Win</b>",
  durationHtml: "Instant.",
  ...partial
});

describe("disciplinesCatalog", () => {
  it("maps Rituals and Ceremonies to kinds", () => {
    expect(kindForExportDiscipline("Rituals")).toBe("ritual");
    expect(kindForExportDiscipline("Ceremonies")).toBe("ceremony");
    expect(kindForExportDiscipline("Animalism")).toBe("power");
    expect(isDisciplineCatalogKind("power")).toBe(true);
    expect(isDisciplineCatalogKind("discipline")).toBe(false);
  });

  it("disambiguates Transferring the Soul by kind", () => {
    const ritual = entry({ name: "Transferring the Soul", kind: "ritual", discipline: "Rituals", level: 5 });
    const ceremony = entry({ name: "Transferring the Soul", kind: "ceremony", discipline: "Ceremonies", level: 5 });
    const lookup = buildDisciplineLookup([ritual, ceremony]);
    expect(lookupDisciplineEntry(lookup, { kind: "ritual", name: "Transferring the Soul" })?.discipline).toBe("Rituals");
    expect(lookupDisciplineEntry(lookup, { kind: "ceremony", name: "Transferring the Soul" })?.discipline).toBe("Ceremonies");
    expect(lookupDisciplineEntry(lookup, { name: "Transferring the Soul", discipline: "Ceremonies" })?.kind).toBe("ceremony");
  });

  it("omits blank ingredients and process and escapes plain fields", () => {
    const html = disciplineTooltipHtml(
      entry({
        name: "Bond <Famulus>",
        kind: "power",
        discipline: "Animalism",
        ingredients: "",
        process: "~",
        description: "A & B",
        systemHtml: "<span style=\"color:#006600\"><b>On a Win</b></span>"
      })
    );
    expect(html).toContain("Bond &lt;Famulus&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).toContain('style="color:#006600"');
    expect(html).not.toContain("discipline_ingredients");
    expect(html).not.toContain("discipline_process");
    expect(html).toContain("Animalism ●");
  });

  it("includes ingredients when present", () => {
    const html = disciplineTooltipHtml(
      entry({
        name: "Arnu Awakening",
        kind: "ritual",
        discipline: "Rituals",
        ingredients: "A wand",
        process: "Chant"
      })
    );
    expect(html).toContain("<strong>Ingredients:</strong> A wand");
    expect(html).toContain("<strong>Process:</strong> Chant");
  });
});
