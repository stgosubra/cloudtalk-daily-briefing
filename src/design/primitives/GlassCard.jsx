import { forwardRef, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { COLOR, BLUR, RADIUS, SHADOW, MOTION, Z } from "../tokens.js";

// GlassCard
// ----------------------------------------------------------------------------
// Translucent surface with backdrop blur, specular border, and (optional)
// parallax tilt + liquid-glass hover sheen.
//
// Props:
//   tier        1 | 2 | 3        - opacity / blur depth (default 2)
//   tilt        bool             - enables 6deg pointer-tracked tilt
//   sheen       bool             - liquid-glass sheen on hover
//   glow        "iris"|"cyan"|"fuchsia"|null - active glow color
//   padding     css value        - inner padding (default 20)
//   radius      css value        - corner radius (default RADIUS.lg)
//   asMotion    bool             - render as motion.div with mount spring
//
// Style note: nested cards should bump tier 1 -> 2 -> 3 to read as physical
// stack instead of flat fills.

const TIER_FILL = {
  1: COLOR.glass.tier1,
  2: COLOR.glass.tier2,
  3: COLOR.glass.tier3,
};
const TIER_BLUR = {
  1: BLUR.tier1,
  2: BLUR.tier2,
  3: BLUR.tier3,
};

const GLOW_MAP = {
  iris:    SHADOW.glowIris,
  cyan:    SHADOW.glowCyan,
  fuchsia: SHADOW.glowFuchsia,
};

const GlassCard = forwardRef(function GlassCard(
  {
    tier = 2,
    tilt = false,
    sheen = false,
    glow = null,
    padding = 20,
    radius = RADIUS.lg,
    asMotion = false,
    style,
    children,
    ...rest
  },
  ref
) {
  const innerRef = useRef(null);
  const sheenRef = useRef(null);

  useEffect(() => {
    if (!tilt && !sheen) return;
    const node = innerRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let rafId = 0;
    let targetRx = 0, targetRy = 0, rx = 0, ry = 0;
    let sx = 0, sy = 0, tsx = 0, tsy = 0;

    const onMove = (e) => {
      const rect = node.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;   // 0..1
      const py = (e.clientY - rect.top) / rect.height;   // 0..1
      if (tilt) {
        targetRy = (px - 0.5) * 6;     // max 3deg each way
        targetRx = -(py - 0.5) * 6;
      }
      if (sheen) {
        tsx = px * 100;
        tsy = py * 100;
      }
    };
    const onLeave = () => {
      targetRx = 0; targetRy = 0;
      tsx = 50; tsy = -20;
    };
    const animate = () => {
      rx += (targetRx - rx) * 0.12;
      ry += (targetRy - ry) * 0.12;
      sx += (tsx - sx) * 0.18;
      sy += (tsy - sy) * 0.18;
      if (tilt) {
        node.style.transform = `perspective(900px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
      }
      if (sheen && sheenRef.current) {
        sheenRef.current.style.background = `radial-gradient(380px circle at ${sx}% ${sy}%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, transparent 60%)`;
      }
      rafId = requestAnimationFrame(animate);
    };
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, [tilt, sheen]);

  const baseStyle = {
    position: "relative",
    background: TIER_FILL[tier] || TIER_FILL[2],
    backdropFilter: TIER_BLUR[tier] || TIER_BLUR[2],
    WebkitBackdropFilter: TIER_BLUR[tier] || TIER_BLUR[2],
    border: `1px solid ${tier === 3 ? COLOR.edge.spec : COLOR.edge.faint}`,
    borderRadius: radius,
    padding,
    boxShadow: `${SHADOW.md}, ${SHADOW.insetGlass}${glow ? `, ${GLOW_MAP[glow]}` : ""}`,
    color: COLOR.text.onGlass,
    zIndex: Z.card,
    transformStyle: tilt ? "preserve-3d" : undefined,
    transition: `box-shadow ${MOTION.duration.base}s ${MOTION.ease.snap}, border-color ${MOTION.duration.base}s ${MOTION.ease.snap}`,
    ...style,
  };

  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const inner = (
    <>
      {sheen && (
        <div
          ref={sheenRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      )}
      {children}
    </>
  );

  if (asMotion) {
    return (
      <motion.div
        ref={setRefs}
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={MOTION.spring.soft}
        style={baseStyle}
        {...rest}
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <div ref={setRefs} style={baseStyle} {...rest}>
      {inner}
    </div>
  );
});

export default GlassCard;
