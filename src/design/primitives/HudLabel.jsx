import { COLOR, TYPE } from "../tokens.js";

// HudLabel
// ----------------------------------------------------------------------------
// Phosphor-styled label primitive. Three variants:
//
//   eyebrow  - tiny uppercase mono caption above a section title
//   title    - section / module title with soft phosphor shadow
//   metric   - large mono numeric (tabular-nums) for headline values
//
// Optional dot prop renders a breathing status indicator next to the label.

const PULSE_STYLE = `
@keyframes hud-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
`;

// inject once
if (typeof document !== "undefined" && !document.getElementById("hud-pulse-keyframes")) {
  const tag = document.createElement("style");
  tag.id = "hud-pulse-keyframes";
  tag.textContent = PULSE_STYLE;
  document.head.appendChild(tag);
}

const DOT_TONE = {
  success: { c: COLOR.status.success, g: COLOR.status.successGlow },
  warn:    { c: COLOR.status.warn,    g: COLOR.status.warnGlow },
  danger:  { c: COLOR.status.danger,  g: COLOR.status.dangerGlow },
  iris:    { c: COLOR.iris[500],      g: "rgba(107,91,255,0.45)" },
  cyan:    { c: COLOR.cyan[500],      g: COLOR.cyan.glow },
};

export default function HudLabel({
  variant = "eyebrow",
  dot = null,
  glow = true,
  children,
  style,
  ...rest
}) {
  const base = variant === "title" ? TYPE.hudTitle
            : variant === "metric" ? TYPE.hudMetric
            : TYPE.hudEyebrow;

  const merged = { ...base, ...style };
  if (!glow && variant === "title") merged.textShadow = "none";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: variant === "metric" ? 10 : 8,
        ...merged,
      }}
      {...rest}
    >
      {dot && DOT_TONE[dot] && (
        <span
          aria-hidden
          style={{
            width: variant === "metric" ? 9 : 6,
            height: variant === "metric" ? 9 : 6,
            borderRadius: "50%",
            background: DOT_TONE[dot].c,
            boxShadow: `0 0 10px ${DOT_TONE[dot].g}`,
            animation: "hud-pulse 2.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
