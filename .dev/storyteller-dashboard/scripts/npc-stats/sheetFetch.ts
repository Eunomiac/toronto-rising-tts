import { parseCsv, type CsvRows } from "../../src/shared/csv.ts";

export const SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const USER_AGENT = "toronto-rising-npc-stats/2.0";

const fetchText = async (url: string, what: string): Promise<string> => {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": USER_AGENT } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${what}: HTTP ${response.status} from ${url}`);
  return body;
};

export const fetchCharactersRows = async (): Promise<CsvRows> => {
  const body = await fetchText(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=686173989`, "CHARACTERS authoring");
  if (/^\s*</.test(body)) throw new Error("CHARACTERS authoring: received HTML instead of CSV");
  const rows = parseCsv(body);
  if (!rows[0]?.includes("API Key")) throw new Error("CHARACTERS authoring: API key header missing");
  return rows;
};
