import {
  buildDisciplineLookup,
  disciplineTooltipHtml,
  isDisciplineCatalogKind,
  lookupDisciplineEntry,
  type DisciplineEntry,
  type DisciplineLookup,
  type DisciplinesCatalogFile
} from "../../shared/disciplinesCatalog.js";

let lookup: DisciplineLookup = buildDisciplineLookup([]);
let loaded = false;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) listener();
};

export const subscribeDisciplines = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const loadDisciplinesCatalog = async (): Promise<void> => {
  const response = await fetch("/api/disciplines");
  if (response.status === 404) {
    lookup = buildDisciplineLookup([]);
    loaded = true;
    notify();
    return;
  }
  if (!response.ok) {
    throw new Error(`Disciplines catalog: HTTP ${response.status}`);
  }
  const body = (await response.json()) as DisciplinesCatalogFile;
  lookup = buildDisciplineLookup(body.entries ?? []);
  loaded = true;
  notify();
};

export const disciplinesCatalogLoaded = (): boolean => loaded;

export const findDisciplineEntry = (opts: {
  readonly kind?: string;
  readonly name: string;
  readonly discipline?: string;
}): DisciplineEntry | undefined => lookupDisciplineEntry(lookup, opts);

export const disciplineTipHtml = (entry: DisciplineEntry): string => disciplineTooltipHtml(entry);

export const termKindFromKey = (key: string): string => key.split(":")[0] ?? "";

export const termNameFromKey = (key: string): string => {
  const parts = key.split(":");
  return parts.slice(1).join(":") || "";
};

export const isDisciplineTermKey = (key: string): boolean => isDisciplineCatalogKind(termKindFromKey(key));
