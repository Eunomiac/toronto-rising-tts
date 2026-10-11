import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { initGenerateNpc } from "./generateNpcTab";
import { LabPins } from "./lab/LabPins";
import { initLuaTab } from "./luaTab";
import { OpenPcSheetContext } from "./pcSheet/openPcSheet";
import { PcSheetTab } from "./pcSheet/PcSheetTab";
import type { SeatColor } from "./pcSheet/types";
import { ScenesPanel } from "./scenesPanel/ScenesPanel";
import { TermImageLayer } from "./termImages/TermImageLayer";

const DEFAULT_TAB_ID = "tab-scenes";

/** `page` names the tab in `agent/lab-notes.json`, so dev notes pinned on it come back on the same tab. */
const TABS = [
  { id: DEFAULT_TAB_ID, panelId: "panel-scenes", label: "Scenes", page: "scenes" },
  { id: "tab-pcs", panelId: "panel-pcs", label: "PCs", page: "pcs" },
  { id: "tab-lua", panelId: "panel-lua", label: "Lua", page: "lua" },
  { id: "tab-generate-npc", panelId: "panel-generate-npc", label: "Generate NPC", page: "generate-npc" }
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Dev-only: pin design notes on whichever tab is showing. */
const NoteControls = ({ tab }: { tab: (typeof TABS)[number] }): ReactElement => {
  const [addMode, setAddMode] = useState(false);
  const [visible, setVisible] = useState(true);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setPanel(document.getElementById(tab.panelId)), [tab.panelId]);
  useLayoutEffect(() => {
    if (!addMode) {
      return undefined;
    }
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape" && !(event.target instanceof HTMLTextAreaElement)) {
        setAddMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode]);
  return (
    <div className="lab-controls">
      <button type="button" className={addMode ? "lock active" : undefined} title="Esc stops adding" onClick={() => setAddMode(!addMode)}>
        {addMode ? "Adding notes: click anywhere" : "Add note"}
      </button>
      <label className="lab-controls-toggle">
        <input type="checkbox" checked={visible} onChange={() => setVisible(!visible)} />
        Show notes
      </label>
      {panel && <LabPins page={tab.page} panel={panel} addMode={addMode} visible={visible} />}
    </div>
  );
};

export const App = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB_ID);
  const [pcSelected, setPcSelected] = useState<SeatColor>("Pink");
  const openPcSheet = useCallback((color: SeatColor): void => {
    setPcSelected(color);
    setActiveTab("tab-pcs");
  }, []);
  const started = useRef(false);

  useLayoutEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    initLuaTab();
    initGenerateNpc();
  }, []);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [activeTab]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: TabId): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === tabId);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
    if (!next) {
      return;
    }
    setActiveTab(next.id);
    document.getElementById(next.id)?.focus();
  };

  return (
    <>
      <nav className="app-tabs" role="tablist" aria-label="Storyteller Dashboard">
        {TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={tab.id}
              className={selected ? "lock active" : undefined}
              type="button"
              role="tab"
              aria-controls={tab.panelId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
        {import.meta.env.DEV && <NoteControls tab={TABS.find((tab) => tab.id === activeTab) ?? TABS[0]} />}
      </nav>

      <section
        id="panel-scenes"
        className="tab-panel lab-panel"
        role="tabpanel"
        aria-labelledby={DEFAULT_TAB_ID}
        hidden={activeTab !== DEFAULT_TAB_ID}
      >
        <OpenPcSheetContext.Provider value={openPcSheet}>
          <ScenesPanel active={activeTab === DEFAULT_TAB_ID} />
        </OpenPcSheetContext.Provider>
      </section>

      <section
        id="panel-pcs"
        className="tab-panel pc-sheet-panel"
        role="tabpanel"
        aria-labelledby="tab-pcs"
        hidden={activeTab !== "tab-pcs"}
      >
        <PcSheetTab active={activeTab === "tab-pcs"} selected={pcSelected} onSelect={setPcSelected} />
      </section>

      <section
        id="panel-lua"
        className="tab-panel lua-panel"
        role="tabpanel"
        aria-labelledby="tab-lua"
        hidden={activeTab !== "tab-lua"}
      >
        <div className="lua-toolbar">
          <button id="lua-run" type="button">Run</button>
          <div className="status idle" id="lua-status">Uses the TTS Tools gateway when Cursor is open; otherwise binds editor port 39998 directly. Claim / Release on the PCs tab connects or disconnects this shared bridge.</div>
        </div>
        <textarea id="lua-script" spellCheck={false} placeholder={'print("Hello from the Storyteller Dashboard")'}></textarea>
        <pre className="lua-output" id="lua-output"></pre>
      </section>

      <section
        id="panel-generate-npc"
        className="tab-panel"
        role="tabpanel"
        aria-labelledby="tab-generate-npc"
        hidden={activeTab !== "tab-generate-npc"}
      >
        <main className="dashboard-shell">
          <section className="control-panel">
            <div className="brand-block">
              <p className="eyebrow">Toronto Rising</p>
              <h1>Storyteller Dashboard</h1>
              <p>Second-monitor V5 NPC generator. No Tabletop Simulator integration in this MVP.</p>
            </div>
            <textarea id="prompt" placeholder="18, girl, has beef with Aishe, mortal…" rows={4}></textarea>
            <div className="shortcut-bar">
              <button id="generate-one" type="button">ENTER Generate</button>
              <button id="generate-many" type="button">SHIFT+ENTER x3</button>
              <button id="generate-image" type="button">CTRL+ENTER + Image</button>
              <button id="generate-many-image" type="button">CTRL+SHIFT Both</button>
            </div>
            <div className="quick-grid" id="quick-grid"></div>
            <div className="status idle" id="status">Ready.</div>
            <div className="mutation-row" id="mutation-row"></div>
          </section>
          <section className="npc-grid" id="npc-grid" aria-label="Generated NPCs"></section>
          <aside className="history-panel">
            <h2>Session History</h2>
            <div id="history-list"><p>No generated NPCs yet.</p></div>
          </aside>
        </main>
      </section>

      <div id="modal-root"></div>
      <TermImageLayer />
    </>
  );
};
