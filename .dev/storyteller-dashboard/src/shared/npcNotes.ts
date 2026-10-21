const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

/** Keep NPC notes deliberately small: paragraphs, line breaks, bold and italic only. */
export const normalizeNpcNotes = (value: string): string => {
  const source = value.trim();
  if (!source) return "";
  if (!/<\/?[a-z][\s\S]*>/i.test(source)) {
    return source.split(/\r?\n/).map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`).join("");
  }
  return source
    .replace(/<(\/?)b>/gi, "<$1strong>")
    .replace(/<(\/?)i>/gi, "<$1em>")
    .replace(/<(?!\/?(?:p|br|strong|em)\b)[^>]*>/gi, "")
    .replace(/<(p|br|strong|em)\b[^>]*>/gi, "<$1>")
    .replace(/<\/(p|strong|em)\b[^>]*>/gi, "</$1>")
    .replace(/<(?!\/?(?:p|br|strong|em)>)/gi, "&lt;")
    .trim();
};

export const npcNotesFromSheetSections = (
  sections: readonly { readonly label: string; readonly entries: readonly string[] }[]
): string => normalizeNpcNotes(sections.flatMap(({ label, entries }) => entries.length === 0 ? [] : [
  `<p><em>${escapeHtml(label)}</em></p>`,
  ...entries.map((entry) => {
    const match = /^\s*([^()]+?)\s*(\(.*\))?\s*$/.exec(entry);
    return `<p><strong>${escapeHtml(match?.[1]?.trim() ?? entry.trim())}</strong>${match?.[2] ? ` ${escapeHtml(match[2])}` : ""}</p>`;
  })
]).join(""));
