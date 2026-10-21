import { parseCsv, type CsvRows } from "../../src/shared/csv.ts";

export const SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
export const NPC_STAT_TABS = ["CHARACTERS", "GENERICS STATS", "MEM NAMED STATS", "MEM GENERIC STATS"] as const;
export type NpcStatTab = (typeof NPC_STAT_TABS)[number];
const USER_AGENT = "toronto-rising-npc-stats/2.0";

const fetchText = async (url: string, what: string): Promise<string> => {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": USER_AGENT } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${what}: HTTP ${response.status} from ${url}`);
  return body;
};

const resolveGids = async (): Promise<ReadonlyMap<NpcStatTab, string>> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  const html = await fetchText(url, "sheet tab list");
  const out = new Map<NpcStatTab, string>();
  for (const tab of NPC_STAT_TABS) {
    const escaped = tab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`name: "${escaped}"[^}]*?gid: "(\\d+)"`).exec(html);
    if (!match) throw new Error(`No "${tab}" tab in ${url}.`);
    out.set(tab, match[1]!);
  }
  return out;
};

export const fetchNpcStatTabs = async (): Promise<Readonly<Record<NpcStatTab, CsvRows>>> => {
  const gids = await resolveGids();
  const entries = await Promise.all(NPC_STAT_TABS.map(async (tab) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gids.get(tab)}`;
    const body = await fetchText(url, tab);
    const head = body.trimStart();
    if (head.startsWith("<!DOCTYPE") || head.startsWith("<html") || head.includes("Sign in to your Google Account")) {
      throw new Error(`${tab}: got HTML rather than CSV. Check sharing. URL: ${url}`);
    }
    return [tab, parseCsv(body)] as const;
  }));
  return Object.fromEntries(entries) as Record<NpcStatTab, CsvRows>;
};

export const fetchCharactersRows = async (): Promise<CsvRows> => (await fetchNpcStatTabs()).CHARACTERS;
