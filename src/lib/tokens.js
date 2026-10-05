// Design tokens - the single source of truth for every colour, radius, shadow
// and type step in the app.
//
// Before this file there were four palettes: lib/palette.js, design/tokens.js and
// a local `C` inside briefing, performance and selfserved. Switching modules
// changed the canvas colour, which made one app look like three. Nothing may
// define a colour outside this file.
//
// Palette direction: neutral canvas with a single faint ambient gradient. Colour
// is spent on state, not decoration - see SEMANTIC below for why that matters.

// ---------------------------------------------------------------------------
// Canvas and surfaces
// ---------------------------------------------------------------------------
// The canvas carries one very low-opacity indigo wash at the top. It reads as
// depth without tinting the field that red and amber alerts sit on; a saturated
// canvas (the glass/magenta direction) drags alert contrast down exactly where
// the app most needs it loud.
const CANVAS = "#0A0A0C";

export const C = {
  bg: CANVAS,
  bgGlow: `radial-gradient(1200px 520px at 50% -20%, rgba(99,102,241,0.07), transparent 65%), ${CANVAS}`,

  // Solid surfaces - rail, popovers, anything that must occlude what is behind it.
  surface: "#111115",
  surfaceAlt: "#17171b",

  // Card fill. A faint diagonal gradient instead of a flat block: it is where the
  // "lifted" feel comes from, and unlike a translucent glass fill it does not
  // wash out a coloured dot painted on top of it.
  cardBg: "linear-gradient(150deg, rgba(28,28,34,0.50), rgba(18,18,22,0.30))",
  cardBgHover: "linear-gradient(150deg, rgba(34,34,41,0.62), rgba(22,22,27,0.38))",
  // Recessed track - segmented toggles, progress rails, input wells.
  wellBg: "rgba(23,23,27,0.70)",

  border: "rgba(44,44,52,0.55)",
  borderStrong: "rgba(68,68,78,0.90)",
  borderHover: "rgba(90,90,102,0.95)",
  // Row dividers sit lighter than card borders so a list inside a card does not
  // read as a stack of boxes.
  divider: "rgba(44,44,52,0.45)",

  // ---------------------------------------------------------------------------
  // Text ramp
  // ---------------------------------------------------------------------------
  text: "#fafafa",
  textMid: "#d4d4d8",
  textMuted: "#a5a5ad",
  textHint: "#77777f",
  textFaint: "#55555d",

  // ---------------------------------------------------------------------------
  // Module accents - identity only, never state
  // ---------------------------------------------------------------------------
  // Each is a trio: fill / tint background / border. Mapped to modules in
  // lib/modules.js. A module keeps its accent whatever is happening inside it.
  blue:    "#3b82f6", blueBg:    "rgba(59,130,246,0.12)",  blueBorder:    "rgba(59,130,246,0.24)",
  emerald: "#10b981", emeraldBg: "rgba(16,185,129,0.12)",  emeraldBorder: "rgba(16,185,129,0.24)",
  meet:    "#34d399", meetBg:    "rgba(52,211,153,0.12)",  meetBorder:    "rgba(52,211,153,0.24)",
  orange:  "#f97316", orangeBg:  "rgba(249,115,22,0.12)",  orangeBorder:  "rgba(249,115,22,0.24)",
  purple:  "#8b5cf6", purpleBg:  "rgba(139,92,246,0.12)",  purpleBorder:  "rgba(139,92,246,0.24)",
  cyan:    "#22d3ee", cyanBg:    "rgba(34,211,238,0.12)",  cyanBorder:    "rgba(34,211,238,0.24)",
  amber:   "#f59e0b", amberBg:   "rgba(245,158,11,0.12)",  amberBorder:   "rgba(245,158,11,0.24)",
  red:     "#ef4444", redBg:     "rgba(239,68,68,0.12)",   redBorder:     "rgba(239,68,68,0.24)",
  neutral: "#52525b", neutralBg: "rgba(82,82,91,0.12)",    neutralBorder: "rgba(82,82,91,0.28)",
};

// ---------------------------------------------------------------------------
// Semantic state - deliberately separate from accent
// ---------------------------------------------------------------------------
// A breaching deal is `risk` red even though Deals is an amber module. Tangling
// these two is why the old UI looked permanently alarmed: amber meant both
// "pacing module" and "something is wrong", so nothing stood out.
//
// Discipline:
//   risk - a deadline that has ALREADY passed. Nothing else may use it.
//   warn - a deadline approaching, still actionable.
//   ok   - explicitly good, worth confirming.
//   idle - no state. The default. Most things should be idle.
//
// No pulsing, no flashing, no animation on any of these. Urgency comes from
// position on the page, not motion.
export const SEMANTIC = {
  risk: { fill: C.red,     bg: C.redBg,     border: C.redBorder },
  warn: { fill: C.amber,   bg: C.amberBg,   border: C.amberBorder },
  ok:   { fill: C.emerald, bg: C.emeraldBg, border: C.emeraldBorder },
  idle: { fill: C.neutral, bg: C.neutralBg, border: C.neutralBorder },
};

export const LEVEL_ORDER = { risk: 0, warn: 1, ok: 2, idle: 3 };

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
export const R = {
  xs: 4,    // inline chips
  sm: 8,    // small controls
  md: 10,   // logo squares, nav items
  lg: 14,   // inner panels
  xl: 16,   // cards
  xxl: 18,  // page frames
  pill: 999,
};

export const SHADOW = {
  card: "0 1px 2px rgba(0,0,0,0.30), 0 8px 24px -12px rgba(0,0,0,0.55)",
  cardHover: "0 1px 2px rgba(0,0,0,0.35), 0 14px 34px -14px rgba(0,0,0,0.65)",
  pop: "0 24px 70px rgba(0,0,0,0.60)",
};

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------
export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const FONT_DISPLAY = "'Rubik', 'Inter', sans-serif";

// The jump from label to hero is deliberately violent. The old scale ran 9-14px
// for everything, so a page of numbers had no entry point - every value competed
// with every other one.
export const T = {
  label: 10,   // uppercase section labels, tracked
  micro: 11,   // captions, deltas, metadata
  body: 13,    // table cells, row text
  bodyLg: 15,  // action lines, emphasised rows
  title: 21,   // module heading
  hero: 32,    // panel headline number
  heroLg: 42,  // page headline number
};

export const TRACK = {
  label: "0.14em",
  labelWide: "0.16em",
  tight: "-0.015em",
  tighter: "-0.025em",
  tightest: "-0.03em",
};

// Every numeric in the app is tabular so columns of figures align and a changing
// value does not reflow its row.
export const NUM = { fontVariantNumeric: "tabular-nums" };

// Identity stays declared in exactly one place.
export { OWNER } from "../config.js";
