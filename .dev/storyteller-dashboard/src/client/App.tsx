import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { initGenerateNpc } from "./generateNpcTab";
import { initLuaTab } from "./luaTab";
import { initScenesTab } from "./scenesTab";
import { initStageNpcs } from "./stageNpcs";

const DEFAULT_TAB_ID = "tab-stage-npcs";

const TABS = [
  { id: "tab-stage-npcs", panelId: "panel-stage-npcs", label: "Stage NPCs" },
  { id: "tab-scenes", panelId: "panel-scenes", label: "Scenes" },
  { id: "tab-lua", panelId: "panel-lua", label: "Lua" },
  { id: "tab-generate-npc", panelId: "panel-generate-npc", label: "Generate NPC" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export const App = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB_ID);
  const started = useRef(false);

  useLayoutEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void initStageNpcs();
    initScenesTab();
    initLuaTab();
    initGenerateNpc();
  }, []);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event("resize"));
    if (activeTab === DEFAULT_TAB_ID) {
      document.getElementById("generic-npc-search")?.focus();
    }
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
      </nav>

      <section
        id="panel-stage-npcs"
        className="tab-panel stage-npcs-panel"
        role="tabpanel"
        aria-labelledby="tab-stage-npcs"
        hidden={activeTab !== "tab-stage-npcs"}
      >
        <aside className="saved-tags-rail" aria-label="Saved search tags">
          <div className="saved-tags-list" id="saved-tags-list"></div>
        </aside>
        <div className="stage-npcs-main">
          <div className="stage-npcs-toolbar">
            <div className="stage-npcs-search-row">
              <input id="generic-npc-search" type="search" placeholder="Search NPCs…" autoComplete="off" />
              <button id="generic-npc-save-tags" type="button" title="Save current search terms as tags">+</button>
            </div>
            <div className="status idle" id="generic-npc-status">Ready.</div>
          </div>
          <div className="generic-npc-grid" id="generic-npc-grid" aria-label="Generic NPCs"></div>
          <footer className="generic-npc-queue">
            <div className="generic-npc-queue-list" id="generic-npc-queue-list"></div>
            <div className="generic-npc-queue-actions">
              <span id="generic-npc-queue-count">No NPCs selected</span>
              <button id="generic-npc-clear-added" type="button">Clear Generics</button>
              <button id="generic-npc-clear" type="button" disabled>Clear</button>
              <button id="generic-npc-copy" type="button" disabled>Copy</button>
              <button id="generic-npc-spawn" type="button" disabled>Spawn in TTS</button>
            </div>
            <div className="status idle" id="generic-npc-bridge-status">Checking TTS bridge…</div>
          </footer>
        </div>
        <aside className="generic-npc-preview" aria-label="Full cutout preview">
          <img id="generic-npc-preview-image" alt="" hidden />
          <p className="generic-npc-preview-empty" id="generic-npc-preview-empty">Hover a cutout</p>
          <p className="generic-npc-preview-label" id="generic-npc-preview-label" hidden></p>
        </aside>
      </section>

      <section
        id="panel-scenes"
        className="tab-panel scenes-panel"
        role="tabpanel"
        aria-labelledby="tab-scenes"
        hidden={activeTab !== "tab-scenes"}
      >
        <div className="scenes-chrome">
          <div className="scenes-chrome-row scenes-chrome-identity">
            <label className="scenes-field scenes-field-grow">
              <span>Title</span>
              <input id="scenes-title" type="text" placeholder="Title" />
            </label>
            <div className="scenes-field">
              <span>Placement</span>
              <div className="scenes-mode-toggle">
                <button id="scenes-mode-standard" className="lock active" type="button">Standard</button>
                <button id="scenes-mode-scatter" type="button">Scatter</button>
              </div>
            </div>
          </div>
          <div className="scenes-chrome-row" id="scenes-table-row">
            <div className="scenes-field scenes-field-grow">
              <span>Table</span>
              <div id="scenes-table-chips" className="scenes-table-chips"></div>
            </div>
          </div>
          <div className="scenes-chrome-row scenes-chrome-clock">
            <label className="scenes-check scenes-present-day"><input id="scenes-present-day" type="checkbox" defaultChecked /> Present day</label>
            <label className="scenes-clock-slider">
              <span>Time of day <output id="scenes-clock-time-out" htmlFor="scenes-clock-minutes">21:00</output></span>
              <input id="scenes-clock-minutes" type="range" min={0} max={1435} step={5} defaultValue={1260} />
            </label>
            <label className="scenes-clock-slider">
              <span>Day <output id="scenes-clock-day-out" htmlFor="scenes-clock-day">13</output></span>
              <input id="scenes-clock-day" type="range" min={1} max={31} defaultValue={13} />
            </label>
            <label className="scenes-clock-slider">
              <span>Month <output id="scenes-clock-month-out" htmlFor="scenes-clock-month">September</output></span>
              <input id="scenes-clock-month" type="range" min={1} max={12} defaultValue={9} />
            </label>
            <label className="scenes-clock-slider scenes-clock-year">
              <span>Year</span>
              <input id="scenes-clock-year" type="number" min={1} max={2100} defaultValue={2026} />
            </label>
          </div>
          <div className="scenes-chrome-row scenes-chrome-place">
            <div className="scenes-field">
              <span>District</span>
              <button id="scenes-district" type="button">District</button>
            </div>
            <div className="scenes-field">
              <span>Site</span>
              <button id="scenes-site" type="button">Site</button>
            </div>
            <div className="scenes-field">
              <span>Skybox</span>
              <button id="scenes-skybox" type="button">Skybox</button>
            </div>
            <label className="scenes-field">
              <span>Weather</span>
              <select id="scenes-weather"></select>
            </label>
            <label className="scenes-field">
              <span>Lighting</span>
              <select id="scenes-lighting"></select>
            </label>
            <label className="scenes-check"><input id="scenes-fog" type="checkbox" defaultChecked /> Top fog</label>
            <div className="scenes-field">
              <span>Sound</span>
              <button id="scenes-sound" type="button">Soundscape</button>
            </div>
            <div className="scenes-field">
              <span>Conditions</span>
              <button id="scenes-conditions" type="button">Conditions</button>
            </div>
          </div>
        </div>
        <div className="scenes-palette">
          <button id="scenes-add-npcs" type="button">Add NPCs…</button>
          <div id="scenes-palette-list" className="scenes-palette-list"></div>
        </div>
        <div className="scenes-board-wrap" id="scenes-board-wrap">
          <div className="scenes-board-frame" id="scenes-board-frame">
            <img id="scenes-board-img" className="scenes-board-img" alt="Control board" />
            <div id="scenes-board-overlay" className="scenes-board-overlay"></div>
          </div>
        </div>
        <footer className="scenes-footer">
          <div className="status idle" id="scenes-bridge-status">Checking TTS bridge…</div>
          <div className="scenes-footer-actions">
            <button id="scenes-copy" type="button">Copy JSON</button>
            <button id="scenes-import" type="button" disabled>Import in TTS</button>
          </div>
        </footer>
        <div id="scenes-toasts" className="scenes-toasts" aria-live="polite"></div>
      </section>
      <div id="scenes-drag-layer" className="scenes-drag-layer"></div>

      <section
        id="panel-lua"
        className="tab-panel lua-panel"
        role="tabpanel"
        aria-labelledby="tab-lua"
        hidden={activeTab !== "tab-lua"}
      >
        <div className="lua-toolbar">
          <button id="lua-run" type="button">Run</button>
          <div className="status idle" id="lua-status">Uses the same External Editor hook as Execute Code. Disable the TTS Tools extension first — only one editor can listen on 39998.</div>
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
    </>
  );
};
