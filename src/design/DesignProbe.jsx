import { AuroraBackdrop, GlassCard, GlowButton, NeonDivider, HudLabel } from "./primitives/index.js";
import { COLOR, RADIUS, SHADOW, TYPE, FONT } from "./tokens.js";

// Visual probe page for Phase 1 primitives.
// Open the app with #design in the URL hash to render this instead of Shell.
// Phase 2 will retire this in favor of the actual Module 01 rebuild.

export default function DesignProbe() {
  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      background: COLOR.obsidian.void,
      color: COLOR.text.high,
      fontFamily: FONT.sans,
      overflow: "hidden",
    }}>
      <AuroraBackdrop />

      <div style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1180,
        margin: "0 auto",
        padding: "56px 32px 80px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <HudLabel variant="eyebrow" dot="success">Design system - Phase 1</HudLabel>
            <div style={{ marginTop: 10 }}>
              <HudLabel variant="title">Primitives probe</HudLabel>
            </div>
            <div style={{ ...TYPE.bodyMd, marginTop: 8, color: COLOR.text.low }}>
              Tokens + 5 primitives. Hover the cards to test tilt and sheen.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <GlowButton variant="ghost">Cancel</GlowButton>
            <GlowButton variant="primary">Proceed</GlowButton>
          </div>
        </div>

        <NeonDivider tone="iris" glow style={{ marginBottom: 36 }} />

        {/* Tier showcase */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28 }}>
          {[1, 2, 3].map((tier) => (
            <GlassCard key={tier} tier={tier} tilt sheen asMotion>
              <HudLabel variant="eyebrow">Tier {tier}</HudLabel>
              <div style={{ marginTop: 10, ...TYPE.hudMetric }}>0{tier}</div>
              <div style={{ ...TYPE.bodySm, color: COLOR.text.low, marginTop: 8 }}>
                {tier === 1 && "Parent container - 40% fill, 24px blur"}
                {tier === 2 && "Nested card - 62% fill, 18px blur"}
                {tier === 3 && "Interactive item - 80% fill, 12px blur"}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Glow + metric bento */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 28 }}>
          <GlassCard tier={2} glow="iris" tilt sheen asMotion padding={28}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
              <HudLabel variant="eyebrow" dot="iris">Pipeline weight</HudLabel>
              <HudLabel variant="eyebrow">EUR</HudLabel>
            </div>
            <HudLabel variant="metric">€ 248,300</HudLabel>
            <NeonDivider tone="ink" style={{ margin: "18px 0" }} />
            <div style={{ display: "flex", gap: 18 }}>
              <Stat label="Commit" value="92,400" tone="success" />
              <Stat label="Best case" value="155,900" tone="iris" />
              <Stat label="Upside" value="38,200" tone="cyan" />
            </div>
          </GlassCard>

          <GlassCard tier={2} glow="cyan" tilt sheen asMotion>
            <HudLabel variant="eyebrow" dot="cyan">System status</HudLabel>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="API" status="success" detail="142ms" />
              <Row label="Agent" status="success" detail="ready" />
              <Row label="Mailer" status="warn" detail="degraded" />
              <Row label="Index" status="success" detail="synced" />
            </div>
          </GlassCard>
        </div>

        {/* Button matrix */}
        <GlassCard tier={1} padding={24} asMotion>
          <HudLabel variant="eyebrow">Buttons</HudLabel>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <GlowButton size="sm" variant="primary">Primary sm</GlowButton>
            <GlowButton size="md" variant="primary">Primary md</GlowButton>
            <GlowButton size="lg" variant="primary">Primary lg</GlowButton>
            <GlowButton size="md" variant="ghost">Ghost</GlowButton>
            <GlowButton size="md" variant="ghost" active>Ghost active</GlowButton>
            <GlowButton size="md" variant="danger">Danger</GlowButton>
          </div>
          <NeonDivider tone="cyan" style={{ marginTop: 22, marginBottom: 14 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <HudLabel variant="eyebrow" dot="success">Live</HudLabel>
            <HudLabel variant="eyebrow" dot="warn">Degraded</HudLabel>
            <HudLabel variant="eyebrow" dot="danger">Offline</HudLabel>
            <HudLabel variant="eyebrow" dot="iris">Pending</HudLabel>
            <HudLabel variant="eyebrow" dot="cyan">Syncing</HudLabel>
          </div>
        </GlassCard>

        <div style={{ marginTop: 40, ...TYPE.monoDetail, textAlign: "center" }}>
          PHASE 1 - PROBE - tokens.js + 5 primitives - drop #design from the URL to return to shell
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <HudLabel variant="eyebrow" dot={tone}>{label}</HudLabel>
      <span style={{ fontFamily: FONT.mono, fontSize: 18, color: COLOR.text.high }}>{value}</span>
    </div>
  );
}

function Row({ label, status, detail }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      background: COLOR.glass.tier3,
      border: `1px solid ${COLOR.edge.faint}`,
      borderRadius: RADIUS.sm,
      boxShadow: SHADOW.insetGlass,
    }}>
      <HudLabel variant="eyebrow" dot={status}>{label}</HudLabel>
      <span style={{ ...TYPE.monoDetail, color: COLOR.text.mid }}>{detail}</span>
    </div>
  );
}
