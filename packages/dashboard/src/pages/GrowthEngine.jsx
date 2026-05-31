import React, { useState } from "react";
import { useApi } from "../lib/api/hooks";

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  blue:    "#2563eb",
  green:   "#059669",
  amber:   "#d97706",
  red:     "#dc2626",
  purple:  "#7c3aed",
  slate:   "#0f172a",
  slateM:  "#1e293b",
  muted:   "#64748b",
  border:  "#e2e8f0",
  surface: "#f8fafc",
};

const STATUS_COLOR = { high: C.green, medium: C.amber, low: C.red };

// ── Difficulty pill ───────────────────────────────────────────────────────────

const DIFF = {
  Urgent: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
  Medium: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Easy:   { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = C.blue, height = 6 }) {
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: "100%",
        background: color,
        borderRadius: 99,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, badge, children, action, actionLabel }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.slate, letterSpacing: -0.2 }}>{title}</div>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: "#fff", background: C.blue,
              borderRadius: 99, padding: "2px 7px", letterSpacing: 0.5,
            }}>{badge}</span>
          )}
        </div>
        {action && actionLabel && (
          <button onClick={action} style={{
            fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none",
            cursor: "pointer", padding: 0,
          }}>
            {actionLabel} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Skeleton loading ──────────────────────────────────────────────────────────

function Skeleton({ h = 20, w = "100%", radius = 6, style = {} }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "ge-shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

const SKELETON_CSS = `
@keyframes ge-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
@keyframes ge-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
.ge-in { animation: ge-in 0.3s ease both }
`;

// ── Section 1: Growth Readiness Score (Hero) ──────────────────────────────────

function ReadinessHero({ readiness, meta }) {
  const score    = readiness?.score ?? 0;
  const label    = readiness?.label ?? "Loading…";
  const status   = readiness?.status ?? "";
  const factors  = readiness?.factors ?? {};

  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.blue : score >= 40 ? C.amber : C.red;
  const circumference = 2 * Math.PI * 52; // r=52
  const dashOffset    = circumference * (1 - score / 100);

  const FACTOR_LABELS = {
    platforms:     { label: "Platform Connections", max: 20 },
    content:       { label: "Content Activity",      max: 20 },
    campaigns:     { label: "Campaign Execution",    max: 15 },
    consistency:   { label: "Publishing Consistency",max: 15 },
    seo:           { label: "SEO Readiness",         max: 10 },
    brandDna:      { label: "Brand DNA Complete",    max: 10 },
    brandComplete: { label: "Brand Profile",         max: 10 },
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.slate} 0%, ${C.slateM} 100%)`,
      borderRadius: 20, padding: "32px 28px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", gap: 40, alignItems: "flex-start",
      flexWrap: "wrap",
    }}>
      {/* Score ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ position: "relative", width: 128, height: 128 }}>
          <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="64" cy="64" r="52" fill="none" stroke={scoreColor} strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginTop: 2 }}>/ 100</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 800, color: scoreColor, textAlign: "center" }}>{label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginTop: 2 }}>Growth Readiness</div>
      </div>

      {/* Right side */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, marginBottom: 22 }}>{status}</div>

        {/* Factor bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {Object.entries(FACTOR_LABELS).map(([key, { label: fLabel, max }]) => {
            const val = factors[key] ?? 0;
            const pct = Math.round((val / max) * 100);
            return (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{fLabel}</span>
                  <span style={{ fontSize: 11, color: val === max ? scoreColor : "rgba(255,255,255,0.4)", fontWeight: 700 }}>{val}/{max}</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: val === max ? scoreColor : "rgba(255,255,255,0.3)",
                    borderRadius: 99, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
        {[
          { label: "Platforms", val: meta?.platformCount ?? 0, icon: "plug" },
          { label: "Published",  val: meta?.deliveryCount ?? 0, icon: "paper-plane" },
          { label: "Campaigns",  val: meta?.campaignTotal ?? 0, icon: "bullhorn" },
        ].map(({ label: l, val, icon }) => (
          <div key={l} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "12px 16px", minWidth: 96, textAlign: "center",
          }}>
            <i className={`fas fa-${icon}`} style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 6, display: "block" }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 2: Growth Roadmap ─────────────────────────────────────────────────

function RoadmapItem({ item, switchTab }) {
  return (
    <div
      onClick={() => switchTab?.(item.tab)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 12px", borderRadius: 9,
        background: "#fff", border: `1px solid ${C.border}`,
        cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
        marginBottom: 6,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${C.border}`, flexShrink: 0, marginTop: 1,
        background: "#fff",
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.slate, lineHeight: 1.4 }}>{item.text}</div>
        {item.time && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.time}</div>}
      </div>
      <i className="fas fa-chevron-right" style={{ fontSize: 10, color: "#cbd5e1", marginTop: 4, flexShrink: 0 }} />
    </div>
  );
}

function GrowthRoadmap({ roadmap, switchTab }) {
  const { today = [], thisWeek = [], thisMonth = [], progress = 0 } = roadmap || {};

  const columns = [
    { key: "today",    label: "Today",      color: C.red,   items: today },
    { key: "thisWeek", label: "This Week",   color: C.amber, items: thisWeek },
    { key: "thisMonth",label: "This Month",  color: C.blue,  items: thisMonth },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <ProgressBar pct={progress} color={C.blue} height={6} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{progress}% done</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {columns.map(col => (
          <div key={col.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: 1 }}>{col.label}</span>
              {col.items.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: col.color, borderRadius: 99, padding: "1px 6px", marginLeft: 2 }}>
                  {col.items.length}
                </span>
              )}
            </div>
            {col.items.length === 0 ? (
              <div style={{ padding: "12px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
                <i className="fas fa-check-circle" style={{ fontSize: 16, color: C.green, marginBottom: 4, display: "block" }} />
                <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>All done</span>
              </div>
            ) : (
              col.items.map(item => <RoadmapItem key={item.id} item={item} switchTab={switchTab} />)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3: Recommended Actions ───────────────────────────────────────────

function ActionCard({ action, switchTab }) {
  const diff = DIFF[action.difficulty] || DIFF.Easy;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${C.border}`,
      borderLeft: `4px solid ${C.blue}`,
      borderRadius: 12, padding: "16px 16px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.slate, lineHeight: 1.35, flex: 1 }}>
          {action.action}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: diff.text, background: diff.bg, border: `1px solid ${diff.border}`,
          borderRadius: 99, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap",
        }}>{action.difficulty}</span>
      </div>

      {action.context && (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
          {action.context.length > 120 ? action.context.slice(0, 117) + "…" : action.context}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <i className="fas fa-bolt" style={{ fontSize: 10, color: C.amber }} />
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Expected impact: </span>
        <span style={{ fontSize: 11, color: C.slate, fontWeight: 700 }}>{action.impact}</span>
      </div>

      <button
        onClick={() => switchTab?.(action.tab)}
        style={{
          width: "100%", padding: "9px 0", borderRadius: 8, border: "none",
          background: C.blue, color: "#fff", fontWeight: 700, fontSize: 12,
          cursor: "pointer", marginTop: 4,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Take Action →
      </button>
    </div>
  );
}

// ── Section 4: Growth Forecast ────────────────────────────────────────────────

function GrowthForecast({ forecast }) {
  if (!forecast) return null;

  const { postsPerWeek, activeCampaigns, status, message, reachRange, audienceRange,
          hasData, targetPostsPerWeek, targetCampaigns } = forecast;

  const statusColor = STATUS_COLOR[status] || C.muted;
  const postBar     = Math.min(100, (postsPerWeek / (targetPostsPerWeek * 1.5)) * 100);
  const campaignBar = Math.min(100, (activeCampaigns / (targetCampaigns * 2)) * 100);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{
        background: `linear-gradient(135deg, ${C.slate}, ${C.slateM})`,
        padding: "18px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Growth Trajectory</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: statusColor }}>{message}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>30-day projection</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: statusColor }}>{reachRange}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Reach Increase</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: statusColor }}>{audienceRange}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Audience Growth</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity meters */}
      <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Posts per week</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.slate }}>{postsPerWeek}</span>
          </div>
          <ProgressBar pct={postBar} color={postBar >= 66 ? C.green : postBar >= 33 ? C.amber : C.red} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Target: {targetPostsPerWeek}+/week</div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Active campaigns</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.slate }}>{activeCampaigns}</span>
          </div>
          <ProgressBar pct={campaignBar} color={campaignBar >= 50 ? C.green : C.amber} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Target: {targetCampaigns}+ active</div>
        </div>
      </div>

      {!hasData && (
        <div style={{ padding: "0 20px 18px" }}>
          <div style={{
            background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
            padding: "10px 14px", fontSize: 12, color: "#92400e",
          }}>
            <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
            Forecast updates as you publish content and run campaigns. Start publishing to build your baseline.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section 5: Growth Milestones ──────────────────────────────────────────────

function MilestoneChip({ milestone, switchTab }) {
  const { achieved, label, icon, points, tab } = milestone;

  return (
    <div
      onClick={() => !achieved && switchTab?.(tab)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: "14px 10px",
        background: achieved ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "#f8fafc",
        border: `1px solid ${achieved ? "#bbf7d0" : C.border}`,
        borderRadius: 14, minWidth: 90, maxWidth: 110,
        cursor: achieved ? "default" : "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative", flexShrink: 0,
      }}
      onMouseEnter={e => { if (!achieved) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: achieved ? C.green : "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`fas fa-${icon}`} style={{ fontSize: 14, color: achieved ? "#fff" : "#94a3b8" }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: achieved ? "#15803d" : C.muted, textAlign: "center", lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: achieved ? C.green : "#94a3b8",
        background: achieved ? "#dcfce7" : "#f1f5f9",
        borderRadius: 99, padding: "2px 6px",
      }}>
        +{points}pts
      </div>
      {achieved && (
        <div style={{
          position: "absolute", top: -6, right: -6,
          width: 20, height: 20, borderRadius: "50%",
          background: C.green, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(5,150,105,0.4)",
        }}>
          <i className="fas fa-check" style={{ fontSize: 9, color: "#fff" }} />
        </div>
      )}
    </div>
  );
}

function GrowthMilestones({ milestones, switchTab }) {
  const { items = [], achieved, total, next } = milestones || {};

  return (
    <div>
      {/* Progress summary */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 18,
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "14px 18px",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.slate }}>{achieved} of {total} milestones reached</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{Math.round((achieved / total) * 100)}%</span>
          </div>
          <ProgressBar pct={(achieved / total) * 100} color={C.blue} height={8} />
        </div>
        {next && (
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 2 }}>Next milestone</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.slate }}>{next.label}</div>
          </div>
        )}
      </div>

      {/* Milestone chips — horizontal scroll */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, paddingTop: 2 }}>
        {items.map(m => (
          <MilestoneChip key={m.id} milestone={m} switchTab={switchTab} />
        ))}
      </div>
    </div>
  );
}

// ── Section 6: Growth Experiments ────────────────────────────────────────────

function ExperimentCard({ exp, switchTab }) {
  const DIFF_COLORS = {
    Low:    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    Medium: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    High:   { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  };
  const d = DIFF_COLORS[exp.difficulty] || DIFF_COLORS.Low;

  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.slate, lineHeight: 1.3, flex: 1 }}>{exp.title}</div>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: d.text, background: d.bg, border: `1px solid ${d.border}`,
          borderRadius: 99, padding: "2px 7px", flexShrink: 0,
        }}>{exp.difficulty}</span>
      </div>

      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{exp.goal}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Expected Outcome</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.slate }}>{exp.expectedOutcome}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Duration</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.slate }}>{exp.duration} · {exp.postsNeeded} posts</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {(exp.platforms || []).map(p => (
          <span key={p} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#eff6ff", color: C.blue, fontWeight: 600, border: "1px solid #bfdbfe" }}>{p}</span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          onClick={() => switchTab?.(exp.templateTab || "templates")}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
            background: `linear-gradient(135deg, ${C.blue}, #1d4ed8)`,
            color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          Launch Experiment →
        </button>
        {exp.templateSuggestion && (
          <button
            onClick={() => switchTab?.("templates")}
            style={{
              padding: "9px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: "#fff",
              color: C.muted, fontWeight: 600, fontSize: 11, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Use {exp.templateSuggestion}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div>
      <style>{SKELETON_CSS}</style>
      {/* Hero skeleton */}
      <div style={{ background: C.slateM, borderRadius: 20, padding: "32px 28px", marginBottom: 32, display: "flex", gap: 40 }}>
        <Skeleton h={128} w={128} radius={99} style={{ background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton h={14} w="60%" style={{ background: "rgba(255,255,255,0.06)" }} />
          {[1,2,3,4].map(i => <Skeleton key={i} h={8} style={{ background: "rgba(255,255,255,0.06)" }} />)}
        </div>
      </div>
      {/* Section skeletons */}
      {[1,2,3].map(i => (
        <div key={i} style={{ marginBottom: 32 }}>
          <Skeleton h={18} w={160} radius={6} style={{ marginBottom: 16 }} />
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(j => <Skeleton key={j} h={14} w={`${70 + j * 8}%`} />)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GrowthEngine({ activeBrand, switchTab }) {
  const brandId = activeBrand?.id;

  const { data, loading, error } = useApi(
    brandId ? `/api/customer/growth-engine` : null,
    [brandId]
  );

  if (!brandId) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div style={{ fontSize: 14, color: C.muted }}>Select a brand to view Growth Engine.</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "24px 0" }}>
      <style>{SKELETON_CSS}</style>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.slate, margin: 0 }}>Growth Engine</h2>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 0 }}>Loading your growth intelligence…</p>
      </div>
      <LoadingSkeleton />
    </div>
  );

  if (error) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div style={{ fontSize: 14, color: C.red, marginBottom: 8 }}>Unable to load Growth Engine data.</div>
      <div style={{ fontSize: 12, color: C.muted }}>Check your connection and try refreshing.</div>
    </div>
  );

  const { readiness, roadmap, actions, forecast, milestones, experiments, meta } = data || {};

  return (
    <div style={{ padding: "24px 0" }} className="ge-in">
      <style>{SKELETON_CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.slate, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            Growth Engine
            <span style={{
              fontSize: 9, fontWeight: 800, color: "#fff", background: C.blue,
              borderRadius: 99, padding: "3px 8px", letterSpacing: 0.6,
            }}>LIVE</span>
          </h2>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Your strategic growth operating system — where intelligence becomes action.
          </p>
        </div>
        {meta?.growthPoints > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 99, padding: "6px 14px",
          }}>
            <i className="fas fa-star" style={{ fontSize: 12, color: C.blue }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{meta.growthPoints} pts · {meta.growthLevel}</span>
            {meta.streakDays > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginLeft: 4 }}>
                🔥 {meta.streakDays} day streak
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Section 1: Growth Readiness Score ── */}
      <div style={{ marginBottom: 32 }}>
        <ReadinessHero readiness={readiness} meta={meta} />
      </div>

      {/* ── Sections 2 + 3: Roadmap + Actions (2-col) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, marginBottom: 32, alignItems: "start" }}>
        <Section title="Growth Roadmap" badge={`${roadmap?.today?.length || 0} today`}>
          <GrowthRoadmap roadmap={roadmap} switchTab={switchTab} />
        </Section>
        <Section title="Recommended Actions" badge={`${actions?.length || 0} actions`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(actions || []).length === 0 ? (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "20px", textAlign: "center" }}>
                <i className="fas fa-check-circle" style={{ fontSize: 20, color: C.green, marginBottom: 8, display: "block" }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>No urgent actions</div>
                <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Your brand is in good shape. Keep publishing.</div>
              </div>
            ) : (
              (actions || []).map(a => <ActionCard key={a.id} action={a} switchTab={switchTab} />)
            )}
          </div>
        </Section>
      </div>

      {/* ── Section 4: Growth Forecast ── */}
      <Section title="Growth Forecast">
        <GrowthForecast forecast={forecast} />
      </Section>

      {/* ── Section 5: Growth Milestones ── */}
      <Section
        title="Growth Milestones"
        badge={milestones ? `${milestones.achieved}/${milestones.total}` : ""}
      >
        <GrowthMilestones milestones={milestones} switchTab={switchTab} />
      </Section>

      {/* ── Section 6: Growth Experiments ── */}
      <Section title="Growth Experiments" badge="Suggested">
        {(experiments || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>
            Connect platforms and complete Brand DNA to unlock personalised experiments.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {(experiments || []).map(exp => (
              <ExperimentCard key={exp.id} exp={exp} switchTab={switchTab} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
