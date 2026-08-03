import { COLOR } from "../tokens.js";

// NeonDivider
// ----------------------------------------------------------------------------
// Laser-thin (1px), gradient-faded divider. Replaces thick layout borders.
// orientation: "h" (default) | "v"
// tone: "iris" | "cyan" | "fuchsia" | "ink" (default "ink")
//
// Implementation: hairline gradient that fades to transparent at both ends,
// so dividers feel like cut lines instead of hard borders.

const TONE = {
  iris:    COLOR.iris[500],
  cyan:    COLOR.cyan[500],
  fuchsia: COLOR.fuchsia[500],
  ink:     "rgba(150,170,230,0.30)",
};

export default function NeonDivider({
  orientation = "h",
  tone = "ink",
  inset = 0,
  glow = false,
  style,
}) {
  const color = TONE[tone] || TONE.ink;
  const isH = orientation === "h";
  const gradient = `linear-gradient(${isH ? "90deg" : "180deg"}, transparent 0%, ${color} 18%, ${color} 82%, transparent 100%)`;

  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        background: gradient,
        boxShadow: glow ? `0 0 8px ${color}` : "none",
        ...(isH
          ? { height: 1, width: `calc(100% - ${inset * 2}px)`, marginLeft: inset, marginRight: inset }
          : { width: 1, height: `calc(100% - ${inset * 2}px)`, marginTop: inset, marginBottom: inset }),
        ...style,
      }}
    />
  );
}
