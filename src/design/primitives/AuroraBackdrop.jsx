import { useRef } from "react";
import { COLOR, Z } from "../tokens.js";

// AuroraBackdrop
// ----------------------------------------------------------------------------
// Full-bleed canvas layer that sits behind module content. Three amorphous
// "blobs" of indigo / cyan / fuchsia drift on long sinusoidal paths and bleed
// through translucent glass panels above them. A faint blueprint mesh sits
// just above the blobs to give the canvas a coordinate feel without competing
// with content.
//
// Respects prefers-reduced-motion: when set, blobs are frozen at their initial
// positions and the mesh stays static.
//
// Usage:
//   <div style={{ position: "relative" }}>
//     <AuroraBackdrop />
//     ...content...
//   </div>

const BLOBS = [
  // [color, size%, originX%, originY%, ampX%, ampY%, period ms, phase]
  { color: "rgba(107,91,255,0.55)", size: 70, ox: 18, oy: 28, ax: 12, ay: 9,  period: 22000, phase: 0 },
  { color: "rgba(46,200,255,0.40)", size: 55, ox: 78, oy: 18, ax: 10, ay: 14, period: 27000, phase: 1.4 },
  { color: "rgba(232,76,255,0.32)", size: 60, ox: 62, oy: 82, ax: 14, ay: 10, period: 31000, phase: 2.8 },
];

export default function AuroraBackdrop({ showMesh = true, intensity = 1 }) {
  const layerRef = useRef(null);

  return (
    <div
      ref={layerRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: Z.aurora,
        background: `radial-gradient(ellipse at 50% 0%, ${COLOR.obsidian.raise} 0%, ${COLOR.obsidian.void} 70%)`,
      }}
    >
      {/* drifting color blobs */}
      {BLOBS.map((b, i) => (
        <div
          key={i}
          data-blob
          style={{
            position: "absolute",
            left: `${b.ox}%`,
            top: `${b.oy}%`,
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            marginLeft: `-${b.size / 2}vmax`,
            marginTop: `-${b.size / 2}vmax`,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, transparent 60%)`,
            filter: "blur(60px)",
            opacity: 0.85 * intensity,
            willChange: "transform",
          }}
        />
      ))}

      {/* blueprint mesh */}
      {showMesh && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: Z.mesh,
            backgroundImage: `
              linear-gradient(${COLOR.ink.mesh} 1px, transparent 1px),
              linear-gradient(90deg, ${COLOR.ink.mesh} 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 80%)",
          }}
        />
      )}

      {/* top fade so content reads cleanly near edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(4,5,11,0.4) 0%, transparent 18%, transparent 82%, rgba(4,5,11,0.55) 100%)`,
          zIndex: Z.mesh,
        }}
      />
    </div>
  );
}
