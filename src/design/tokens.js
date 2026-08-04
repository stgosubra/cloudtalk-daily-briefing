// Design system tokens for the glassmorphic / sci-fi HUD redesign.
// Proving ground: Module 01 (Today / Briefing). All values are concrete -
// no theme-switching or runtime resolution. Phase 2 modules import from here.
//
// Palette anchor: obsidian base + indigo/violet mid-tones + cyan & magenta
// accent bleeds. Designed for dark canvas only.

export const COLOR = {
  obsidian: {
    void:  "#04050B",
    base:  "#07091466",   // 40% obsidian over canvas
    raise: "#0B0E1C",
    deep:  "#0A0D18",
  },
  ink: {
    line:    "rgba(120,140,200,0.08)",
    lineHot: "rgba(150,170,230,0.18)",
    mesh:    "rgba(110,130,200,0.05)",
  },
  glass: {
    tier1: "rgba(20,24,44,0.40)",
    tier2: "rgba(28,32,56,0.62)",
    tier3: "rgba(40,46,80,0.80)",
    well:  "rgba(4,5,11,0.85)",
  },
  edge: {
    faint: "rgba(255,255,255,0.06)",
    spec:  "rgba(255,255,255,0.14)",
    hot:   "rgba(180,200,255,0.28)",
    bloom: "rgba(124,140,255,0.45)",
  },
  iris: {
    50:  "#E8E6FF",
    100: "#D4CCFF",
    300: "#9F8FFF",
    500: "#6B5BFF",
    700: "#3B2EB8",
    900: "#1A124D",
  },
  cyan: {
    300: "#7CF1FF",
    500: "#2EC8FF",
    glow: "rgba(46,200,255,0.45)",
  },
  fuchsia: {
    500: "#E84CFF",
    glow: "rgba(232,76,255,0.35)",
  },
  text: {
    high:  "#F5F6FF",
    mid:   "#C7CBE0",
    low:   "#8389A6",
    hint:  "#5C6080",
    onGlass: "#E9ECFF",
  },
  status: {
    success: "#4EE5A4",
    successGlow: "rgba(78,229,164,0.35)",
    warn:    "#FFC65A",
    warnGlow: "rgba(255,198,90,0.35)",
    danger:  "#FF6464",
    dangerGlow: "rgba(255,100,100,0.35)",
  },
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const BLUR = {
  tier1: "blur(24px) saturate(140%)",
  tier2: "blur(18px) saturate(135%)",
  tier3: "blur(12px) saturate(130%)",
  modal: "blur(30px) saturate(150%)",
};

export const SHADOW = {
  xs:  "0 1px 2px rgba(0,0,0,0.4)",
  sm:  "0 4px 12px rgba(0,0,0,0.35)",
  md:  "0 12px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.4)",
  lg:  "0 24px 60px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)",
  glowIris:  "0 0 24px rgba(107,91,255,0.45)",
  glowCyan:  "0 0 18px rgba(46,200,255,0.40)",
  glowFuchsia: "0 0 22px rgba(232,76,255,0.35)",
  insetWell: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.5)",
  insetGlass: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

export const FONT = {
  sans:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  display: "'Rubik', 'Inter', sans-serif",
};

// Type tokens - apply via spread:  style={{ ...TYPE.hudTitle }}
export const TYPE = {
  hudEyebrow: {
    fontFamily: FONT.mono,
    fontSize: 11,
    lineHeight: 1.4,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: COLOR.text.low,
  },
  hudTitle: {
    fontFamily: FONT.display,
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: 0.2,
    color: COLOR.text.high,
    textShadow: "0 0 18px rgba(107,91,255,0.35), 0 0 2px rgba(255,255,255,0.15)",
  },
  hudMetric: {
    fontFamily: FONT.mono,
    fontSize: 34,
    lineHeight: 1.0,
    fontVariantNumeric: "tabular-nums",
    color: COLOR.text.high,
  },
  bodyMd: {
    fontFamily: FONT.sans,
    fontSize: 14,
    lineHeight: 1.5,
    color: COLOR.text.mid,
  },
  bodySm: {
    fontFamily: FONT.sans,
    fontSize: 12,
    lineHeight: 1.45,
    color: COLOR.text.mid,
  },
  monoDetail: {
    fontFamily: FONT.mono,
    fontSize: 11,
    lineHeight: 1.3,
    letterSpacing: 0.4,
    color: COLOR.text.low,
  },
};

// Motion curves - use as transition timing-function or as Framer Motion ease arrays.
export const MOTION = {
  ease: {
    snap:     "cubic-bezier(0.2, 0.8, 0.2, 1)",
    elastic:  "cubic-bezier(0.16, 1.2, 0.3, 1)",
    glide:    "cubic-bezier(0.33, 1, 0.68, 1)",
    inertial: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  },
  // Framer Motion cubic-bezier arrays
  easeArr: {
    snap:     [0.2, 0.8, 0.2, 1],
    elastic:  [0.16, 1.2, 0.3, 1],
    glide:    [0.33, 1, 0.68, 1],
    inertial: [0.05, 0.7, 0.1, 1],
  },
  spring: {
    soft:   { type: "spring", stiffness: 220, damping: 26, mass: 0.9 },
    snappy: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 },
    bouncy: { type: "spring", stiffness: 300, damping: 18, mass: 0.8 },
  },
  duration: {
    micro: 0.12,
    quick: 0.18,
    base:  0.26,
    slow:  0.42,
    scene: 0.64,
  },
};

export const Z = {
  canvas: 0,
  aurora: 1,
  mesh:   2,
  surface: 10,
  card:   20,
  raised: 40,
  popover: 200,
  drawer:  400,
  modal:   600,
  cursorFx: 900,
  palette: 1000,
};

// Backwards-compat bridge for legacy code that still pulls from lib/palette.js.
// Maps the old C.* keys to nearest tokens so we can roll Phase 2 in safely.
export const C_BRIDGE = {
  bg:          COLOR.obsidian.void,
  surface:     COLOR.obsidian.raise,
  surfaceAlt:  COLOR.obsidian.deep,
  border:      COLOR.edge.faint,
  borderHover: COLOR.edge.hot,
  text:        COLOR.text.high,
  textMid:     COLOR.text.mid,
  textMuted:   COLOR.text.low,
  textHint:    COLOR.text.hint,
};
