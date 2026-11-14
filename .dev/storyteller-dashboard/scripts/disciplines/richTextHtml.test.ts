import { describe, expect, it } from "vitest";
import { parseSharedStringItem, richRunsToHtml } from "./richTextHtml.ts";

describe("richTextHtml", () => {
  it("preserves bold, color, font, italic, and line breaks", () => {
    const html = richRunsToHtml([
      { text: "Roll " },
      { text: "Resolve + Animalism", bold: true, color: "FF4C0000", font: "Alegreya Sans SC" },
      { text: ".\n● " },
      { text: "On a Win", bold: true, color: "FF006600", font: "Alegreya Sans" },
      { text: ", sense hostility.\n    ○ Nested." }
    ]);
    expect(html).toContain("font-family:'Alegreya Sans SC'");
    expect(html).toContain("color:#4C0000");
    expect(html).toContain("color:#006600");
    expect(html).toContain("<b>Resolve + Animalism</b>");
    expect(html).toContain("<br>");
    expect(html).toContain("● ");
    expect(html).toContain("○ Nested.");
  });

  it("maps rare fonts and parses shared-string XML runs", () => {
    const parsed = parseSharedStringItem(
      `<r><rPr><rFont val="Days One"/><color rgb="FF980000"/></rPr><t>Persuasion</t></r>` +
        `<r><rPr><rFont val="Bellefair"/><i/><u/></rPr><t xml:space="preserve"> note</t></r>`
    );
    expect(parsed.plain).toBe("Persuasion note");
    const html = richRunsToHtml(parsed.runs);
    expect(html).toContain("font-family:'Days One'");
    expect(html).toContain("font-family:'Alegreya Sans'");
    expect(html).toContain("<u><i> note</i></u>");
  });
});
