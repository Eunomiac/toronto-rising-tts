import { useMemo, useState, type DragEvent, type ReactElement } from "react";
import type { CatalogCharacter } from "./catalogs";
import { endDrag, getDndSession } from "./dnd/session";
import { useGenericCatalog } from "./genericCatalog";
import { GROUP_DRAG_TYPE, NPC_DRAG_TYPE } from "./stage";
import "./offstagePreload.css";

export const OffstagePreload = ({ named, selected, onAdd, onRemove, onPreload }: {
  named: readonly CatalogCharacter[];
  selected: readonly string[];
  onAdd: (keys: readonly string[]) => void;
  onRemove: (key: string) => void;
  onPreload: () => void;
}): ReactElement => {
  const generics = useGenericCatalog();
  const [query, setQuery] = useState("");
  const [candidate, setCandidate] = useState("");
  const options = useMemo(() => new Map([
    ...named.filter((npc) => npc.filename).map((npc) => [npc.characterKey, npc.fullName] as const),
    ...(generics ?? []).map((npc) => [npc.key, `${npc.label} · ${npc.key.match(/\d+$/)?.[0] ?? npc.key}`] as const)
  ]), [named, generics]);
  const search = query.trim().toLowerCase();
  const matches = [...options].filter(([key, label]) => !selected.includes(key)
    && `${label} ${key}`.toLowerCase().includes(search)).slice(0, 40);
  const choice = matches.some(([key]) => key === candidate) ? candidate : matches[0]?.[0] ?? "";

  const drop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getDndSession().payload;
    const keys = payload?.dragKind === "npcRosterGroup"
      ? payload.members.map((member) => member.characterKey)
      : [event.dataTransfer.getData(NPC_DRAG_TYPE)];
    const eligible = keys.filter((key) => options.has(key) && !selected.includes(key));
    if (eligible.length) onAdd(eligible);
    endDrag();
  };
  return (
    <section className="lab-offstage-preload" aria-label="Offstage preload" data-tr-dnd-scene-preload
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(NPC_DRAG_TYPE) || event.dataTransfer.types.includes(GROUP_DRAG_TYPE)) {
          event.preventDefault();
        }
      }}
      onDrop={drop}
    >
      <header>
        <strong>Offstage preload</strong>
        <button type="button" className="lab-btn" disabled={!selected.length} onClick={onPreload}>Preload now</button>
      </header>
      <p className="lab-note">Drag NPCs here from the roster or search below. Preload keeps them ready for later entrances.</p>
      <div className="lab-offstage-preload-picker">
        <input className="lab-select" aria-label="Search offstage NPCs" placeholder="Search NPCs" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="lab-select" aria-label="Offstage NPC to add" value={choice} onChange={(event) => setCandidate(event.target.value)}>
          {!choice && <option value="">No matches</option>}
          {matches.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select>
        <button type="button" className="lab-btn" disabled={!choice} onClick={() => onAdd([choice])}>Add</button>
      </div>
      <ul>
        {selected.map((key) => {
          const name = options.get(key) ?? key;
          return <li key={key}>
            <span>{name}</span>
            <button type="button" className="lab-btn" aria-label={`Remove ${name} from offstage preload`} onClick={() => onRemove(key)}>×</button>
          </li>;
        })}
      </ul>
    </section>
  );
};
