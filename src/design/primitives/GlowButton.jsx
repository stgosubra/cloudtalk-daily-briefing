import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { COLOR, RADIUS, SHADOW, FONT, MOTION } from "../tokens.js";

// GlowButton
// ----------------------------------------------------------------------------
// Pill / rounded button with three intent variants and a localized radial
// glow when active or hovered. Micro-compression on press (scale 0.97).
//
// Props:
//   variant   "primary" | "ghost" | "danger"   default "primary"
//   size      "sm" | "md" | "lg"               default "md"
//   active    bool                              persistent glow
//   icon      ReactNode                         optional leading slot

const VARIANTS = {
  primary: {
    base: {
      bg: `linear-gradient(135deg, ${COLOR.iris[500]} 0%, ${COLOR.iris[700]} 100%)`,
      text: COLOR.text.high,
      border: COLOR.edge.spec,
      glow: SHADOW.glowIris,
    },
    hover: {
      bg: `linear-gradient(135deg, ${COLOR.iris[300]} 0%, ${COLOR.iris[500]} 100%)`,
      border: COLOR.edge.hot,
    },
  },
  ghost: {
    base: {
      bg: COLOR.glass.tier2,
      text: COLOR.text.onGlass,
      border: COLOR.edge.faint,
      glow: "0 0 0 rgba(0,0,0,0)",
    },
    hover: {
      bg: COLOR.glass.tier3,
      border: COLOR.edge.spec,
    },
  },
  danger: {
    base: {
      bg: `linear-gradient(135deg, ${COLOR.status.danger} 0%, #B22A2A 100%)`,
      text: COLOR.text.high,
      border: COLOR.edge.spec,
      glow: `0 0 18px ${COLOR.status.dangerGlow}`,
    },
    hover: {
      bg: `linear-gradient(135deg, #FF8080 0%, ${COLOR.status.danger} 100%)`,
      border: COLOR.edge.hot,
    },
  },
};

const SIZE = {
  sm: { padding: "6px 12px", fontSize: 12, radius: RADIUS.sm },
  md: { padding: "9px 18px", fontSize: 13, radius: RADIUS.md },
  lg: { padding: "12px 22px", fontSize: 14, radius: RADIUS.md },
};

const GlowButton = forwardRef(function GlowButton(
  { variant = "primary", size = "md", active = false, icon, children, style, onMouseEnter, onMouseLeave, ...rest },
  ref
) {
  const [hover, setHover] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZE[size] || SIZE.md;
  const lit = hover || active;

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={MOTION.spring.snappy}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); onMouseLeave?.(e); }}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: FONT.sans,
        fontWeight: 500,
        letterSpacing: 0.15,
        borderRadius: s.radius,
        background: lit ? v.hover.bg : v.base.bg,
        color: v.base.text,
        border: `1px solid ${lit ? v.hover.border : v.base.border}`,
        boxShadow: `${lit || active ? v.base.glow : SHADOW.xs}, ${SHADOW.insetGlass}`,
        cursor: "pointer",
        userSelect: "none",
        transition: `background ${MOTION.duration.quick}s ${MOTION.ease.snap}, border-color ${MOTION.duration.quick}s ${MOTION.ease.snap}, box-shadow ${MOTION.duration.quick}s ${MOTION.ease.snap}`,
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
});

export default GlowButton;
