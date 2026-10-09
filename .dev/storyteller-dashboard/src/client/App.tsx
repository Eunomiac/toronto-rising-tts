import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { initGenerateNpc } from "./generateNpcTab";
import { LabTab } from "./lab/LabTab";
import { initLuaTab } from "./luaTab";
import { PcSheetTab } from "./pcSheet/PcSheetTab";
import { ScenesPanel } from "./scenesPanel/ScenesPanel";
import { TermImageLayer } from "./termImages/TermImageLayer";

const DEFAULT_TAB_ID = "tab-scenes";
const LAB_TAB_ID = "tab-lab";

const ALL_TABS = [
  { id: DEFAULT_TAB_ID, panelId: "panel-scenes", label: "Scenes" },
  { id: "tab-pcs", panelId: "panel-pcs", label: "PCs" },
  { id: "tab-lua", panelId: "panel-lua", label: "Lua" },
  { id: "tab-generate-npc", panelId: "panel-generate-npc", label: "Generate NPC" },
  { id: LAB_TAB_ID, panelId: "panel-lab", label: "Lab" }
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

const TABS = ALL_TABS.filter((tab) => tab.id !== LAB_TAB_ID || import.meta.env.DEV);

const initialTab = (): TabId =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("lab") ? LAB_TAB_ID : DEFAULT_TAB_ID;

export const App = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
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
        {import.meta.env.DEV && <div id="lab-controls" className="app-tabs-extra" />}
      </nav>

      <section
        id="panel-scenes"
        className="tab-panel lab-panel"
        role="tabpanel"
        aria-labelledby={DEFAULT_TAB_ID}
        hidden={activeTab !== DEFAULT_TAB_ID}
      >
        <ScenesPanel active={activeTab === DEFAULT_TAB_ID} />
      </section>

      <section
        id="panel-pcs"
        className="tab-panel pc-sheet-panel"
        role="tabpanel"
        aria-labelledby="tab-pcs"
        hidden={activeTab !== "tab-pcs"}
      >
        <PcSheetTab active={activeTab === "tab-pcs"} />
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

      {import.meta.env.DEV && (
        <section
          id="panel-lab"
          className="tab-panel lab-panel"
          role="tabpanel"
          aria-labelledby={LAB_TAB_ID}
          hidden={activeTab !== LAB_TAB_ID}
        >
          <LabTab active={activeTab === LAB_TAB_ID} />
        </section>
      )}

      <div id="modal-root"></div>
      <TermImageLayer />
    </>
  );
};
