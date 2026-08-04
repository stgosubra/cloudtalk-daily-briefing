// CloudTalk Cockpit Dark palette - shared across modules.
// Mirrors the C object in modules/briefing/BriefingModule.jsx.
export const C = {
  bg: "#070a12",
  surface: "#0f1320",
  surfaceAlt: "#161a26",
  border: "#1e2433",
  borderHover: "#34405c",
  text: "#fafafa",
  textMid: "#cecfd2",
  textMuted: "#94979c",
  textHint: "#7c818c",
  // Brand blue aligned to the module family (#4d82ff / #1a56ff) so the rail,
  // active states and blue modules read as one system.
  blue: "#4d82ff",   blueBg: "#0c1340",   blueBorder: "#243089",
  emerald: "#47cd89", emeraldBg: "#0a2e1e", emeraldBorder: "#0c6a43",
  meet: "#4ade9f",   meetBg: "#0c2a20",   meetBorder: "#13614a",
  orange: "#ff8a5c", orangeBg: "#2a1206", orangeBorder: "#7a3517",
  purple: "#3253DC", purpleBg: "rgba(50,83,220,0.16)", purpleBorder: "rgba(50,83,220,0.42)",
  cyan: "#59d5d5",   cyanBg: "#06292c",   cyanBorder: "#0e6b6b",
  amber: "#fdb022",  amberBg: "#2a1d05",  amberBorder: "#7a4e0e",
  red: "#f97066",    redBg: "#2a0d0a",    redBorder: "#7a2e26",
};

export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const FONT_DISPLAY = "'Rubik', 'Inter', sans-serif";

// Re-exported from src/config.js so existing `import { OWNER } from "../lib/palette.js"`
// callers keep working while identity stays declared in exactly one place.
export { OWNER } from "../config.js";
