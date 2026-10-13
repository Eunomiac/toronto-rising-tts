import { parseCsv, type CsvRows } from "../../src/shared/csv.ts";

/** Reads the Toronto Rising sheet's CHARACTERS tab, headers included, exactly as typed. */

const SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const TAB = "CHARACTERS";
const USER_AGENT = "toronto-rising-npc-stats/1.0";

const fetchText = async (url: string, what: string): Promise<string> => {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": USER_AGENT } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${what}: HTTP ${response.status} from ${url}`);
  }
  return text;
};

/** The tab's gid, from the sheet's public HTML view (the tab list there carries each tab's gid). */
const resolveGid = async (): Promise<string> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  const html = await fetchText(url, "sheet tab list");
  const match = new RegExp(`name: "${TAB}"[^}]*?gid: "(\\d+)"`).exec(html);
  if (!match) {
    throw new Error(`No "${TAB}" tab in ${url} (renamed, or the sheet is no longer public?)`);
  }
  return match[1]!;
};

/** The gviz CSV endpoint drops text cells in numeric columns, so this uses the export-by-gid endpoint. */
export const fetchCharactersRows = async (): Promise<CsvRows> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${await resolveGid()}`;
  const text = await fetchText(url, TAB);
  const head = text.trimStart();
  if (head.startsWith("<!DOCTYPE") || head.startsWith("<html") || head.includes("Sign in to your Google Account")) {
    throw new Error(`${TAB}: got an HTML page, not CSV. Check the sheet's sharing. URL: ${url}`);
  }
  return parseCsv(text);
};
