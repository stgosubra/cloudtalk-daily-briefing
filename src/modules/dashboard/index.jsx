import { useMemo } from "react";
import { motion } from "framer-motion";
import { C, FONT_SANS, FONT_MONO, FONT_DISPLAY, OWNER } from "../../lib/palette.js";
import { TODAY_ISO, WEEK_PROSPECTS, WEEK_OTHER_EVENTS } from "../briefing/data.js";
import { TILE_MODULES } from "../../lib/modules.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constellation Grid - Dashboard landing
// Dark near-black canvas with asymmetric red/purple corner gradients.
// 4-col grid of module tiles. Today's module gets a brighter border and lift.
// ─────────────────────────────────────────────────────────────────────────────

// Monoline icons - 22px, stroke-only, single path style for visual coherence
const Icon = {
  briefing: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  precall: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h13l3 3v9H4z" />
      <path d="M8 11h8M8 14h5" />
    </svg>
  ),
  calculator: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h2M12 19h2M16 19h0" />
    </svg>
  ),
  competitor: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18l5-6 4 3 6-9" />
      <path d="M14 6h4v4" />
    </svg>
  ),
  coach: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a4 4 0 0 0-4 4v3a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  ),
  selfserved: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="M18 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  ),
  roadmap: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V4M6 4h11l-2 3.5L17 11H6" />
    </svg>
  ),
  pipeline: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-5 7v6l-6 2v-8z" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h6v16H4zM10 4h4v16h-4zM16 6l4 1-3 14-4-1z" />
    </svg>
  ),
  quotes: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 6H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" />
    </svg>
  ),
  battlecards: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4v5c0 4-3.5 7.5-8 9-4.5-1.5-8-5-8-9V7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  ),
  demos: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M9 21h6M12 17v4M10 8l4 2.5L10 13z" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.7L12 16.9 6.8 19l1-5.7L3.5 9.2l5.9-.9z" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  ),
  wiki: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 9h6M8 13h8M8 17h5" />
    </svg>
  ),
  stale: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4M12 7v5l3 2" />
    </svg>
  ),
};

// Tiles are the shared registry plus this file's SVG icons. Icon keys match
// module ids, so the lookup needs no special cases. `signal` is static metadata
// from the registry; module 01's is computed at render time (see todaySignal).
const TILES = TILE_MODULES.map((m) => ({
  ...m,
  icon: Icon[m.id],
  live: m.status === "live",
}));

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Live "Today" tile signal - derived from the actual refreshed briefing data
// (WEEK_PROSPECTS/WEEK_OTHER_EVENTS keyed by TODAY_ISO) instead of a hardcoded
// count, so it never goes stale relative to what module 01 actually shows.
function todaySignal() {
  const calls = WEEK_PROSPECTS[TODAY_ISO]?.length ?? 0;
  const other = WEEK_OTHER_EVENTS[TODAY_ISO]?.length ?? 0;
  const total = calls + other;
  if (total === 0) return "Nothing on the calendar today";
  const parts = [];
  if (calls) parts.push(`${calls} discovery call${calls === 1 ? "" : "s"}`);
  if (other) parts.push(`${other} other event${other === 1 ? "" : "s"}`);
  return `${parts.join(" · ")} today`;
}

export default function DashboardModule({ onNavigate }) {
  const today = useMemo(() => formatToday(), []);
  const hello = useMemo(() => greeting(), []);
  const tiles = useMemo(
    () => TILES.map((t) => (t.id === "briefing" ? { ...t, signal: todaySignal() } : t)),
    [],
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08090f",
      backgroundImage: [
        "radial-gradient(900px 600px at 0% 0%, rgba(220,38,38,0.10), transparent 60%)",
        "radial-gradient(900px 700px at 100% 100%, rgba(50,83,220,0.12), transparent 60%)",
        "radial-gradient(1200px 800px at 50% 50%, rgba(77,130,255,0.04), transparent 70%)",
      ].join(", "),
      color: C.text,
      fontFamily: FONT_SANS,
      padding: "44px 36px 72px 36px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* faint star dots */}
      <StarField />

      {/* HERO */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 56, maxWidth: 1280 }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2.5,
          color: C.textHint, textTransform: "uppercase", marginBottom: 12,
        }}>
          {today} · Cockpit
        </div>
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(34px, 4.2vw, 52px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: -1.2,
          margin: 0,
          background: "linear-gradient(180deg, #ffffff 0%, #b8bcd1 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {hello}, {OWNER.name.split(" ")[0]}.
        </h1>
        <div style={{
          marginTop: 14, fontSize: 16, color: C.textMuted, maxWidth: 620, lineHeight: 1.5,
        }}>
          Your constellation - 18 modules, 7 live. Pick a star to dive in.
        </div>
      </div>

      {/* GRID */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        maxWidth: 1040,
      }}>
        {tiles.map((t, i) => (
          <Tile key={t.id} tile={t} index={i} onNavigate={onNavigate} />
        ))}
      </div>

      {/* footer */}
      <div style={{
        position: "relative", zIndex: 1,
        marginTop: 56, maxWidth: 1280,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: FONT_MONO, fontSize: 10, color: C.textHint, letterSpacing: 1.4,
      }}>
        <span>CLOUDTALK · SE EMEA · COCKPIT v0.4</span>
        <span>⌘K  PALETTE   ·   ⌘B  RAIL</span>
      </div>
    </div>
  );
}

function Tile({ tile, index, onNavigate }) {
  const accent = C[tile.accent] || C.blue;
  const accentBorder = C[`${tile.accent}Border`] || C.blueBorder;
  const isPrimary = !!tile.primary;
  const isLive = !!tile.live;

  const baseBorder = isPrimary
    ? `1px solid ${accent}`
    : isLive
    ? `1px solid ${C.border}`
    : `1px solid ${C.border}`;

  const baseShadow = isPrimary
    ? `0 0 0 1px ${accent} inset, 0 0 40px ${accent}33, 0 18px 40px rgba(0,0,0,0.45)`
    : "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 22px rgba(0,0,0,0.35)";

  const hoverShadow = isLive
    ? `0 0 0 1px ${accent} inset, 0 0 28px ${accent}33, 0 22px 48px rgba(0,0,0,0.5)`
    : baseShadow;

  return (
    <motion.button
      onClick={() => isLive && onNavigate && onNavigate(tile.id)}
      disabled={!isLive}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isLive ? 1 : 0.45, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={isLive ? { y: -4, scale: 1.012 } : {}}
      whileTap={isLive ? { scale: 0.985 } : {}}
      style={{
        position: "relative",
        textAlign: "left",
        background: isPrimary
          ? `linear-gradient(180deg, ${accent}14 0%, ${C.surface} 60%)`
          : "linear-gradient(180deg, #11131c 0%, #0c0e15 100%)",
        border: baseBorder,
        borderRadius: 16,
        padding: "18px 18px 16px 18px",
        minHeight: 152,
        cursor: isLive ? "pointer" : "not-allowed",
        color: C.text,
        fontFamily: FONT_SANS,
        boxShadow: baseShadow,
        overflow: "hidden",
        outline: "none",
      }}
      onMouseEnter={(e) => { if (isLive) e.currentTarget.style.boxShadow = hoverShadow; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = baseShadow; }}
    >
      {/* corner glow flare for the primary tile */}
      {isPrimary && (
        <div style={{
          position: "absolute", top: -40, right: -40, width: 140, height: 140,
          background: `radial-gradient(circle, ${accent}55, transparent 65%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* head row: num + status pill */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 18,
      }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5,
          color: isPrimary ? accent : C.textHint,
        }}>
          {tile.num}
        </span>
        {isLive ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1, color: C.textHint,
          }}>
            <motion.span
              animate={isPrimary ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: accent, boxShadow: `0 0 8px ${accent}`,
              }}
            />
            LIVE
          </span>
        ) : (
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1,
            color: C.amber, background: C.amberBg,
            border: `1px solid ${C.amberBorder}`,
            padding: "2px 6px", borderRadius: 3,
          }}>
            SOON
          </span>
        )}
      </div>

      {/* icon */}
      <div style={{
        color: isPrimary ? accent : isLive ? C.textMid : C.textHint,
        marginBottom: 14,
      }}>
        {tile.icon}
      </div>

      {/* name */}
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500,
        letterSpacing: -0.2, color: isLive ? C.text : C.textMuted,
        marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {tile.label}
      </div>

      {/* sub */}
      <div style={{
        fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.8,
        color: C.textHint, marginBottom: 14, textTransform: "uppercase",
      }}>
        {tile.sub}
      </div>

      {/* signal */}
      {isLive && tile.signal && (
        <div style={{
          fontSize: 12, color: isPrimary ? C.text : C.textMuted,
          borderTop: `1px solid ${isPrimary ? accent + "33" : C.border}`,
          paddingTop: 10,
        }}>
          {tile.signal}
        </div>
      )}
    </motion.button>
  );
}

// Faint star dots scattered across the canvas. Pure decoration, no interaction.
function StarField() {
  const stars = useMemo(() => {
    // Deterministic pseudo-random so the layout is stable between renders.
    const seed = 7;
    const out = [];
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < 42; i++) {
      out.push({
        top: rand() * 100,
        left: rand() * 100,
        size: rand() < 0.85 ? 1 : 2,
        opacity: 0.15 + rand() * 0.35,
      });
    }
    return out;
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((st, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${st.top}%`, left: `${st.left}%`,
          width: st.size, height: st.size, borderRadius: "50%",
          background: "#cfd3e6", opacity: st.opacity,
        }} />
      ))}
    </div>
  );
}
