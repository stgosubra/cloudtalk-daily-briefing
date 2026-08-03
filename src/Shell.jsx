import { useState, useEffect } from "react";
import { C, FONT_SANS, FONT_MONO, FONT_DISPLAY, OWNER } from "./lib/palette";
import { MODULES } from "./lib/modules.js";
import { staleModules, declaredGaps } from "./lib/freshness.js";

import DashboardModule from "./modules/dashboard/index.jsx";
import BriefingModule from "./modules/briefing/index.jsx";
import CalculatorModule from "./modules/calculator/index.jsx";
import PerformanceModule from "./modules/performance/index.jsx";
import SelfServedModule from "./modules/selfserved/index.jsx";
import { onboardingAlertCount } from "./modules/selfserved/data.js";

// Module metadata comes from lib/modules.js; only the component binding lives
// here, because that is the one field that needs the imports above.
const COMPONENTS = {
  dashboard: DashboardModule,
  briefing: BriefingModule,
  calculator: CalculatorModule,
  performance: PerformanceModule,
  selfserved: SelfServedModule,
};

const NAV = MODULES.map((m) => ({ ...m, component: COMPONENTS[m.id] }));

const STORAGE_KEY = "ct.shell.activeModule";
const RAIL_COLLAPSED_KEY = "ct.shell.railCollapsed";

export default function Shell() {
  const [activeId, setActiveId] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    return localStorage.getItem(STORAGE_KEY) || "dashboard";
  });
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
  });

  const [paletteOpen, setPaletteOpen] = useState(false);

  // Count of triggered self-served onboarding/upsell alerts (3-30 day band).
  const ssAlertCount = onboardingAlertCount();

  useEffect(() => { localStorage.setItem(STORAGE_KEY, activeId); }, [activeId]);
  useEffect(() => { localStorage.setItem(RAIL_COLLAPSED_KEY, collapsed ? "1" : "0"); }, [collapsed]);

  // Keyboard shortcuts:
  //   Cmd/Ctrl + K  -> command palette (primary, scales past 9 modules)
  //   Cmd/Ctrl + 1-9, 0 (10), - (11), = (12) -> direct jump (best-effort; the
  //                browser also binds Cmd+1-8 to tab switching, so the palette
  //                is the reliable path)
  //   Cmd/Ctrl + B  -> collapse rail
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const map = { "1":0, "2":1, "3":2, "4":3, "5":4, "6":5, "7":6, "8":7, "9":8, "0":9, "-":10, "=":11 };
      if (map[e.key] !== undefined) {
        e.preventDefault();
        const item = NAV[map[e.key]];
        if (item) setActiveId(item.id);
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // intent = a one-shot sub-view hint passed to the module being opened
  // (e.g. {module:"calculator", tab:"cost"}). The module reads it on mount.
  const [intent, setIntent] = useState(null);
  const goTo = (id, intentObj = null) => {
    setActiveId(id);
    setIntent(intentObj && intentObj.module === id ? intentObj : null);
    setPaletteOpen(false);
  };

  const active = NAV.find((n) => n.id === activeId) || NAV[0];
  const ActiveComponent = active.component;

  const railWidth = collapsed ? 64 : 232;

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: FONT_SANS,
    }}>
      {/* LEFT RAIL */}
      <aside style={{
        width: railWidth,
        flexShrink: 0,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width 160ms ease",
      }}>
        {/* Brand */}
        <div style={{
          padding: collapsed ? "18px 0" : "18px 18px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
        }}>
          {!collapsed && (
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600,
                letterSpacing: 0.2, color: C.text,
              }}>
                CloudTalk
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.4,
                color: C.textHint, marginTop: 2,
              }}>
                COCKPIT
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand (Cmd+B)" : "Collapse (Cmd+B)"}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              width: 28, height: 28, borderRadius: 6,
              cursor: "pointer",
              fontFamily: FONT_MONO, fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV.map((item) => {
            const isActive = item.id === activeId;
            const accent = C[item.accent] || C.blue;
            const accentBg = C[`${item.accent}Bg`] || C.blueBg;
            // Self-served onboarding/upsell alert: surface a warning on the nav label
            // so a triggered alert is visible even when module 07 isn't open.
            const navAlert =
              item.id === "selfserved" && !isActive && ssAlertCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                title={collapsed ? `${item.label} - ${item.sub}` : ""}
                style={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? 0 : 12,
                  padding: collapsed ? "10px 0" : "10px 16px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? accentBg : "transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  borderLeft: `3px solid ${isActive ? accent : "transparent"}`,
                  color: isActive ? C.text : C.textMuted,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_SANS,
                  transition: "background 80ms ease, color 80ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = C.surfaceAlt;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 10,
                  color: isActive ? accent : C.textHint,
                  letterSpacing: 0.5,
                  minWidth: collapsed ? 0 : 18,
                }}>
                  {item.num}
                </span>
                {!collapsed && (
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 10, color: C.textHint, fontFamily: FONT_MONO, letterSpacing: 0.3 }}>
                      {item.sub}
                    </span>
                  </span>
                )}
                {navAlert && (
                  <span
                    title={`${ssAlertCount} self-served onboarding alert${ssAlertCount === 1 ? "" : "s"} - open Self-Served`}
                    style={{
                      fontFamily: FONT_MONO, fontSize: collapsed ? 11 : 9,
                      color: C.red, lineHeight: 1,
                      ...(collapsed
                        ? { position: "absolute", top: 4, right: 6 }
                        : { display: "inline-flex", alignItems: "center", gap: 3 }),
                    }}
                  >
                    {"\u26A0"}{!collapsed && ssAlertCount > 0 && (
                      <span style={{ fontWeight: 600 }}>{ssAlertCount}</span>
                    )}
                  </span>
                )}
                {!collapsed && !navAlert && item.status === "live" && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: C.emerald, boxShadow: `0 0 6px ${C.emerald}`,
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: collapsed ? "14px 0" : "14px 16px",
          borderTop: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: C.blueBg, border: `1px solid ${C.blueBorder}`,
            color: C.blue, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            SS
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{OWNER.name}</div>
              <div style={{ fontSize: 10, color: C.textHint, fontFamily: FONT_MONO }}>SE - EMEA</div>
            </div>
          )}
        </div>
      </aside>

      {/* CONTENT */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <StalenessBanner />
        <DataGapsBanner />
        <ActiveComponent intent={intent} onNavigate={(id) => setActiveId(id)} />
      </main>

      {paletteOpen && (
        <CommandPalette nav={NAV} activeId={activeId} onSelect={goTo} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}

// The daily refresh is a scheduled Claude task that fires on machine wake, so a
// missed or failed morning is possible. When that happens the dashboard would
// otherwise show yesterday's numbers with no visible difference - which is the
// dangerous case, because the numbers still look plausible. This makes it loud.
function StalenessBanner() {
  const stale = staleModules();
  if (stale.length === 0) return null;

  const describe = (m) => {
    if (m.days == null) return `${m.num} ${m.label} (age unknown)`;
    return `${m.num} ${m.label} (${m.days === 1 ? "1 day" : `${m.days} days`} old)`;
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 22px",
      background: "rgba(220, 90, 90, 0.10)",
      borderBottom: `1px solid rgba(220, 90, 90, 0.30)`,
      fontSize: 12, color: C.text,
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.red, letterSpacing: 0.6 }}>
        STALE
      </span>
      <span>
        Not refreshed today: {stale.map(describe).join(", ")}. Run the{" "}
        <code style={{ fontFamily: FONT_MONO, fontSize: 11 }}>briefing-daily</code> refresh.
      </span>
    </div>
  );
}

// Gaps a refresh chose to declare instead of inventing a value for. Amber, not
// red: the data is current, one figure just carries a caveat. Separate banner so a
// declared caveat is never mistaken for a stale module.
function DataGapsBanner() {
  const gaps = declaredGaps();
  if (gaps.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 22px",
      background: "rgba(212, 160, 60, 0.09)",
      borderBottom: `1px solid rgba(212, 160, 60, 0.28)`,
      fontSize: 12, color: C.text,
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.amber, letterSpacing: 0.6, paddingTop: 1 }}>
        GAPS
      </span>
      <span>
        {gaps.map((g, i) => (
          <span key={i} style={{ display: "block" }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textMuted }}>{g.num}</span>{" "}
            {g.text}
          </span>
        ))}
      </span>
    </div>
  );
}

// Quick actions deep-link into a module's sub-view via an intent the module
// reads on mount. Navigation-level (real + instant) - no agent work triggered.
const ACTIONS = [
  { kind: "action", id: "calculator", label: "Estimate a cost / quote",   sub: "Calculator", accent: "blue",   intent: { module: "calculator", tab: "cost" } },
  { kind: "action", id: "calculator", label: "Minutes calculator",        sub: "Calculator", accent: "blue",   intent: { module: "calculator", tab: "minutes" } },
  { kind: "action", id: "performance", label: "My numbers this period",   sub: "Performance", accent: "emerald", intent: { module: "performance", tab: "period" } },
  { kind: "action", id: "performance", label: "Performance progression",  sub: "Performance", accent: "emerald", intent: { module: "performance", tab: "progression" } },
  { kind: "action", id: "performance", label: "SQO value by geo",         sub: "Performance", accent: "emerald", intent: { module: "performance", tab: "geo" } },
];

function CommandPalette({ nav, activeId, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const modules = nav.map((n) => ({ kind: "module", ...n }));
  const all = [...modules, ...ACTIONS];

  const results = (() => {
    const query = q.trim().toLowerCase();
    if (!query) return modules; // default list = modules only, keep it clean
    if (/^\d+$/.test(query)) {
      const byNum = modules.filter((n) => String(parseInt(n.num, 10)).startsWith(query));
      if (byNum.length) return byNum;
    }
    return all.filter((n) =>
      n.label.toLowerCase().includes(query) ||
      (n.sub || "").toLowerCase().includes(query) ||
      (n.num || "").includes(query)
    );
  })();

  useEffect(() => { setIdx(0); }, [q]);

  const pick = (item) => onSelect(item.id, item.intent || null);
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[idx]) pick(results[idx]); }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4,6,12,0.6)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)", background: C.surface,
          border: `1px solid ${C.borderHover}`, borderRadius: 12,
          boxShadow: "0 24px 70px rgba(0,0,0,0.6)", overflow: "hidden",
        }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to module - type a name or number..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "15px 18px",
            background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`,
            color: C.text, fontFamily: FONT_SANS, fontSize: 15, outline: "none",
          }}
        />
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {results.length === 0 && (
            <div style={{ padding: "14px 18px", color: C.textHint, fontSize: 13 }}>No match for "{q}"</div>
          )}
          {results.map((n, i) => {
            const accent = C[n.accent] || C.blue;
            const sel = i === idx;
            const isAction = n.kind === "action";
            const isActive = !isAction && n.id === activeId;
            return (
              <button
                key={(isAction ? "a:" + n.label : "m:" + n.id)}
                onMouseEnter={() => setIdx(i)}
                onClick={() => pick(n)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 18px", textAlign: "left", cursor: "pointer",
                  background: sel ? C.surfaceAlt : "transparent", border: "none",
                  borderLeft: `3px solid ${sel ? accent : "transparent"}`,
                }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: sel ? accent : C.textHint, minWidth: 20 }}>{isAction ? "▸" : n.num}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{n.label}</span>
                  <span style={{ fontSize: 11, color: C.textHint, fontFamily: FONT_MONO, marginLeft: 8 }}>{n.sub}</span>
                </span>
                {isActive && <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: C.emerald }}>current</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "8px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 14, fontFamily: FONT_MONO, fontSize: 10, color: C.textHint }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span><span style={{ marginLeft: "auto" }}>⌘K</span>
        </div>
      </div>
    </div>
  );
}
