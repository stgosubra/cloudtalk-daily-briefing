import { useState, useMemo } from "react";
import { C, SHADOW } from "../../lib/tokens.js";
import { countries, search, TYPE_LABELS, TIER_LABELS } from "./numbers-logic.js";

// Module 03 / Numbers tab - Country phone number finder.
// Matches the scoped-CSS pattern from MinutesCalc (same .nfind prefix,
// same token interpolation, same topbar/body layout).

const TYPE_COLORS = {
  local: C.emerald,
  national: C.blue,
  mobile: C.cyan,
  "toll-free": C.purple,
};

const TIER_COLORS = {
  low: C.emerald,
  mid: C.amber,
  high: C.red,
};

const ALL_TYPES = ["local", "national", "mobile", "toll-free"];

export default function NumbersFinder() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(null);

  const results = useMemo(() => {
    let list = search(query);
    if (typeFilter) {
      list = list.filter((c) => c.types.includes(typeFilter));
    }
    return list;
  }, [query, typeFilter]);

  const reset = () => { setQuery(""); setTypeFilter(null); };

  return (
    <div className="nfind">
      <style>{CSS}</style>
      <div className="app">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="logo-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
            </svg>
          </div>
          <div className="topbar-info">
            <div className="t-title">CloudTalk · country numbers</div>
            <div className="t-sub">Phone number availability and compliance by country</div>
          </div>
          <button type="button" className="clear-btn" onClick={reset} title="Reset search">Clear</button>
          <div className="badge">BETA</div>
        </div>

        {/* BODY */}
        <div className="body">
          {/* LEFT: SEARCH + FILTERS */}
          <div className="left">
            <div className="fblock">
              <div className="slabel">Search</div>
              <div className="flabel">Country, ISO code, or number type</div>
              <input
                className="g-input"
                type="text"
                placeholder="e.g. Spain, US, toll-free"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="divline" />

            <div className="fblock">
              <div className="slabel">Number type</div>
              <div className="flabel">Filter by availability</div>
              <div className="seg">
                <button
                  type="button"
                  className={`seg-btn${typeFilter === null ? " on" : ""}`}
                  onClick={() => setTypeFilter(null)}
                >All</button>
                {ALL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`seg-btn${typeFilter === t ? " on" : ""}`}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  >{TYPE_LABELS[t]}</button>
                ))}
              </div>
            </div>

            <div className="divline" />

            <div className="fblock">
              <div className="slabel">Summary</div>
              <div className="stat-row">
                <div className="stat-item">
                  <div className="stat-val">{results.length}</div>
                  <div className="stat-label">{results.length === 1 ? "country" : "countries"}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">{countries.length}</div>
                  <div className="stat-label">total</div>
                </div>
              </div>
            </div>

            <div className="divline" />

            <div className="fblock">
              <div className="slabel">Legend</div>
              <div className="legend">
                {ALL_TYPES.map((t) => (
                  <div key={t} className="legend-item">
                    <span className="legend-dot" style={{ background: TYPE_COLORS[t] }} />
                    <span className="legend-label">{TYPE_LABELS[t]}</span>
                  </div>
                ))}
              </div>
              <div className="legend" style={{ marginTop: 10 }}>
                {Object.entries(TIER_LABELS).map(([k, label]) => (
                  <div key={k} className="legend-item">
                    <span className="legend-dot" style={{ background: TIER_COLORS[k] }} />
                    <span className="legend-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: RESULTS */}
          <div className="right">
            {results.length === 0 ? (
              <div className="empty">
                <div className="empty-ring">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
                  </svg>
                </div>
                <div className="empty-txt">No countries match your search.<br />Try a different query or clear the filters.</div>
              </div>
            ) : (
              <div className="results">
                {results.map((c) => (
                  <div key={c.iso} className="country-card">
                    <div className="card-header">
                      <div className="card-iso">{c.iso}</div>
                      <div className="card-name">{c.name}</div>
                      <div className="card-tier" style={{
                        color: TIER_COLORS[c.tier],
                        background: `${TIER_COLORS[c.tier]}18`,
                        borderColor: `${TIER_COLORS[c.tier]}44`,
                      }}>{TIER_LABELS[c.tier]}</div>
                    </div>
                    <div className="card-types">
                      {ALL_TYPES.map((t) => {
                        const available = c.types.includes(t);
                        return (
                          <span
                            key={t}
                            className={`type-pill${available ? " available" : ""}`}
                            style={available ? {
                              color: TYPE_COLORS[t],
                              background: `${TYPE_COLORS[t]}18`,
                              borderColor: `${TYPE_COLORS[t]}44`,
                            } : undefined}
                          >{TYPE_LABELS[t]}</span>
                        );
                      })}
                    </div>
                    <div className="card-compliance">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      <span>{c.compliance}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.nfind{
  --bg:${C.bg};--bg2:${C.surface};
  --surf:${C.surfaceAlt};--surf2:${C.wellBg};
  --bdr:${C.border};--bdr2:${C.borderStrong};--bdr3:${C.blueBorder};
  --acc:${C.blue};--acc2:${C.cyan};--acc3:${C.blueBg};--glow:${C.bloomBg};
  --txt:${C.text};--muted:${C.textMuted};--muted2:${C.textHint};
  height:100%;overflow-y:auto;background:transparent;color:var(--txt);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;
}
.nfind *{box-sizing:border-box}
.nfind .app{width:100%;max-width:960px;background:${C.cardBg};border-radius:16px;overflow:hidden;border:1px solid var(--bdr);display:flex;flex-direction:column;box-shadow:${SHADOW.card}}
.nfind .topbar{display:flex;align-items:center;gap:13px;padding:14px 22px;background:var(--surf2);border-bottom:1px solid var(--bdr);backdrop-filter:blur(24px)}
.nfind .logo-wrap{width:38px;height:38px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--acc);flex-shrink:0}
.nfind .logo-wrap svg{width:22px;height:22px}
.nfind .topbar-info{flex:1}
.nfind .t-title{font-size:13px;font-weight:500;color:var(--txt);letter-spacing:-0.01em}
.nfind .t-sub{font-size:11px;color:var(--muted);margin-top:1px}
.nfind .badge{font-size:10px;padding:3px 10px;border-radius:20px;border:1px solid var(--bdr3);color:var(--acc2);background:var(--acc3);letter-spacing:0.07em}
.nfind .clear-btn{font-size:11px;font-weight:500;padding:5px 12px;border-radius:8px;border:1px solid var(--bdr2);background:var(--surf);color:var(--muted);cursor:pointer;transition:all .15s}
.nfind .clear-btn:hover{border-color:var(--bdr3);color:var(--acc2);background:var(--acc3)}
.nfind .body{display:grid;grid-template-columns:260px 1fr;min-height:620px}
.nfind .left{padding:20px 17px;border-right:1px solid var(--bdr);background:rgba(10,10,12,0.45);display:flex;flex-direction:column;gap:0;overflow-y:auto}
.nfind .slabel{font-size:9px;font-weight:500;color:var(--muted2);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:7px}
.nfind .fblock{margin-bottom:15px}
.nfind .flabel{font-size:11px;color:var(--muted);margin-bottom:5px;line-height:1.5}
.nfind .g-input{width:100%;height:35px;background:var(--surf2);border:1px solid var(--bdr2);border-radius:11px;padding:0 13px;font-size:13px;color:var(--txt);outline:none;transition:border-color .18s,box-shadow .18s;-webkit-appearance:none;appearance:none}
.nfind .g-input:focus{border-color:var(--bdr3);box-shadow:0 0 0 3px var(--glow)}
.nfind .g-input::placeholder{color:var(--muted2)}
.nfind .seg{display:flex;gap:3px;margin-bottom:10px;background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:3px;flex-wrap:wrap}
.nfind .seg-btn{flex:1;min-width:0;height:24px;border-radius:999px;border:none;background:transparent;color:var(--muted);font-size:10px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;padding:0 6px}
.nfind .seg-btn:hover{color:var(--acc2)}
.nfind .seg-btn.on{background:var(--acc3);color:var(--acc2);box-shadow:inset 0 0 0 1px var(--bdr3)}
.nfind .divline{height:1px;background:linear-gradient(90deg,transparent,var(--bdr) 12%,var(--bdr) 88%,transparent);margin:13px 0}
.nfind .stat-row{display:flex;gap:16px;margin-top:4px}
.nfind .stat-item{display:flex;flex-direction:column;gap:2px}
.nfind .stat-val{font-size:22px;font-weight:600;color:var(--txt);letter-spacing:-0.025em;font-variant-numeric:tabular-nums}
.nfind .stat-label{font-size:10px;color:var(--muted2)}
.nfind .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.nfind .legend-item{display:flex;align-items:center;gap:5px}
.nfind .legend-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.nfind .legend-label{font-size:10px;color:var(--muted)}
.nfind .right{padding:16px 18px;background:var(--bg2);display:flex;flex-direction:column;gap:8px;overflow-y:auto}
.nfind .results{display:flex;flex-direction:column;gap:8px}
.nfind .country-card{border:1px solid var(--bdr);border-radius:12px;padding:14px 16px;background:rgba(255,255,255,0.022);transition:border-color .15s,background .15s}
.nfind .country-card:hover{border-color:var(--bdr2);background:rgba(255,255,255,0.04)}
.nfind .card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.nfind .card-iso{font-size:11px;font-weight:600;color:var(--acc2);background:var(--acc3);border:1px solid var(--bdr3);border-radius:6px;padding:3px 7px;letter-spacing:0.06em;font-variant-numeric:tabular-nums}
.nfind .card-name{font-size:14px;font-weight:500;color:var(--txt);flex:1}
.nfind .card-tier{font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;border:1px solid;letter-spacing:0.04em}
.nfind .card-types{display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap}
.nfind .type-pill{font-size:11px;font-weight:500;padding:4px 10px;border-radius:8px;border:1px solid var(--bdr);color:var(--muted2);background:transparent;transition:all .15s}
.nfind .type-pill.available{border-style:solid}
.nfind .card-compliance{display:flex;align-items:flex-start;gap:6px;font-size:11px;color:var(--muted);line-height:1.4}
.nfind .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:13px;min-height:400px}
.nfind .empty-ring{width:56px;height:56px;border-radius:50%;border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--muted2)}
.nfind .empty-txt{font-size:12px;color:var(--muted2);text-align:center;line-height:1.8}
`;
