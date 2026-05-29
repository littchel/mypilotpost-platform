import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api/client";

/* ─── Module tab config ────────────────────────────────── */

const MODULES = [
  { id: "platform_health",        label: "Platform Health",  icon: "fas fa-satellite-dish",  color: "#0891b2" },
  { id: "content_intelligence",   label: "Content",          icon: "fas fa-file-alt",        color: "#7c3aed" },
  { id: "audience_intelligence",  label: "Audience",         icon: "fas fa-users",           color: "#0369a1" },
  { id: "competitive_moat",       label: "Competitive",      icon: "fas fa-binoculars",      color: "#dc2626" },
  { id: "seo_intelligence",       label: "SEO",              icon: "fas fa-search",          color: "#059669" },
  { id: "conversion_intelligence",label: "Conversion",       icon: "fas fa-funnel-dollar",   color: "#d97706" },
  { id: "campaign_intelligence",  label: "Campaigns",        icon: "fas fa-bullhorn",        color: "#7c3aed" },
  { id: "growth_engine",          label: "Growth Engine",    icon: "fas fa-rocket",          color: "#2563eb" },
];

const CONFIDENCE_STYLES = {
  "Observed":            { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  "Observed + Inferred": { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
  "Industry Benchmark":  { bg: "#fdf4ff", border: "#d8b4fe", text: "#6b21a8" },
  "Estimated":           { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
};

const PRIORITY_COLORS = {
  high:   "#dc2626",
  medium: "#d97706",
  low:    "#16a34a",
};

const NOTIF_STYLES = {
  urgent:      { bg: "#fff1f2", border: "#fca5a5", icon: "fas fa-exclamation-circle", iconColor: "#dc2626" },
  warning:     { bg: "#fffbeb", border: "#fcd34d", icon: "fas fa-exclamation-triangle", iconColor: "#d97706" },
  opportunity: { bg: "#eff6ff", border: "#93c5fd", icon: "fas fa-lightbulb",          iconColor: "#2563eb" },
  win:         { bg: "#f0fdf4", border: "#86efac", icon: "fas fa-trophy",              iconColor: "#16a34a" },
};

/* ─── Atoms ─────────────────────────────────────────────── */

const ConfidenceBadge = ({ confidence }) => {
  const s = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES["Estimated"];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 99,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 700, color: s.text, letterSpacing: 0.3,
    }}>
      {confidence || "Estimated"}
    </span>
  );
};

const PriorityDot = ({ priority }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
    color: PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium,
  }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium }} />
    {priority || "medium"}
  </span>
);

const InsightCard = ({ insight, accentColor }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #e5e9f0",
      borderLeft: `4px solid ${accentColor}`, marginBottom: 14,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          padding: "18px 20px 14px", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <PriorityDot priority={insight.priority} />
              <ConfidenceBadge confidence={insight.confidence} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>
              {insight.title}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 5, lineHeight: 1.6 }}>
              {insight.finding}
            </div>
          </div>
          <i
            className={`fas fa-chevron-${expanded ? "up" : "down"}`}
            style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, flexShrink: 0 }}
          />
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid #f1f5f9" }}>
          {/* Why it matters */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 5 }}>
              Why It Matters
            </div>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.65 }}>
              {insight.why_it_matters}
            </div>
          </div>

          {/* Evidence */}
          {(insight.evidence || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 6 }}>
                Evidence
              </div>
              {insight.evidence.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                  <i className="fas fa-database" style={{ color: accentColor, fontSize: 11, marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{e}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Action */}
          <div style={{
            marginTop: 14, background: "#f8fafc", borderRadius: 10,
            padding: "14px 16px", border: "1px solid #e2e8f0",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: accentColor, marginBottom: 5 }}>
              Recommended Action
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.55 }}>
              {insight.recommended_action}
            </div>
            {insight.expected_impact && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                <i className="fas fa-arrow-trend-up" style={{ marginRight: 5, color: "#16a34a" }} />
                {insight.expected_impact}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ModulePanel = ({ moduleData, moduleConfig }) => {
  if (!moduleData) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
      <i className={moduleConfig.icon} style={{ fontSize: 32, marginBottom: 12, display: "block" }} />
      <div style={{ fontSize: 14 }}>No data available for this module yet.</div>
    </div>
  );

  const insights = moduleData.insights || [];

  return (
    <div>
      {/* Module summary banner */}
      {(moduleData.headline || moduleData.summary) && (
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "16px 20px",
          border: "1px solid #e2e8f0", marginBottom: 20,
        }}>
          {moduleData.headline && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>
              {moduleData.headline}
            </div>
          )}
          {moduleData.summary && (
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
              {moduleData.summary}
            </div>
          )}
        </div>
      )}

      {/* Insight cards */}
      {insights.map((insight, i) => (
        <InsightCard key={i} insight={insight} accentColor={moduleConfig.color} />
      ))}

      {insights.length === 0 && (
        <div style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>
          No insights generated for this module.
        </div>
      )}
    </div>
  );
};

/* ─── Notification Center ───────────────────────────────── */

const NotificationCenter = ({ notifications }) => {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = (notifications || []).filter((_, i) => !dismissed.has(i));
  if (!visible.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 10 }}>
        Intelligence Alerts
      </div>
      {(notifications || []).map((n, i) => {
        if (dismissed.has(i)) return null;
        const s = NOTIF_STYLES[n.type] || NOTIF_STYLES.opportunity;
        return (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
            padding: "13px 16px", marginBottom: 8,
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <i className={s.icon} style={{ color: s.iconColor, fontSize: 15, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{n.body}</div>
              {n.action && (
                <div style={{ fontSize: 12, fontWeight: 600, color: s.iconColor, marginTop: 4 }}>
                  → {n.action}
                </div>
              )}
            </div>
            <button
              onClick={() => setDismissed(p => new Set([...p, i]))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 0, flexShrink: 0 }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Empty State ─────────────────────────────────────────── */

const EmptyState = ({ activeBrand }) => (
  <div style={{ textAlign: "center", maxWidth: 540, margin: "60px auto", padding: "0 16px" }}>
    <div style={{ fontSize: 48, marginBottom: 20 }}>🧠</div>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
      AI Brand Intelligence
    </h2>
    <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.65, marginBottom: 28 }}>
      Get a real-time intelligence report for{" "}
      <strong>{activeBrand?.name || "your brand"}</strong> — 8 modules covering Platform Health,
      Content, Audience, Competitive Position, SEO, Conversion, Campaigns, and Growth.
      Every insight is generated from your actual data.
    </p>
    <a href="/brand-audit" style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
      borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none",
      boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
    }}>
      <i className="fas fa-chart-line" /> Run Brand Audit First
    </a>
  </div>
);

/* ─── Generate State ──────────────────────────────────────── */

const GeneratingState = () => (
  <div style={{ textAlign: "center", padding: "56px 0" }}>
    <div style={{ width: 48, height: 48, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
      Generating Intelligence Report
    </div>
    <div style={{ fontSize: 13, color: "#64748b" }}>
      Analysing your brand data across 8 modules — this takes 15–30 seconds
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */

export default function DashboardInsights({ activeBrand }) {
  const [activeModule, setActiveModule] = useState("platform_health");
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!activeBrand?.id) return;
    setLoading(true);
    setError(null);
    try {
      const url = forceRefresh
        ? "/api/customer/intelligence/modules?refresh=true"
        : "/api/customer/intelligence/modules";
      const res = await apiRequest(url);
      if (res?.data) {
        setIntelligenceData(res.data);
        setGeneratedAt(res.generated_at);
        setIsCached(!!res.cached);
      }
    } catch (err) {
      setError(err?.message || "Failed to load intelligence data.");
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const modules     = intelligenceData?.modules     || null;
  const notifs      = intelligenceData?.notifications || [];
  const activeConf  = MODULES.find(m => m.id === activeModule) || MODULES[0];
  const moduleData  = modules?.[activeModule] || null;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 8 }}>
          AI-Powered Intelligence
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Brand Intelligence
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 560, lineHeight: 1.6 }}>
              {modules
                ? <>Real-time intelligence for <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong>.
                    {isCached && formattedDate && <> Cached at {formattedDate}.</>}
                  </>
                : <>AI-generated insights from your live brand data — across 8 strategic modules.</>
              }
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {modules && (
              <button
                onClick={() => load(true)}
                disabled={loading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px",
                  background: "#f1f5f9", border: "1px solid #e2e8f0",
                  borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                  color: "#374151",
                }}
              >
                <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`} style={{ fontSize: 12 }} />
                Refresh
              </button>
            )}
            {!modules && !loading && (
              <button
                onClick={() => load(false)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
                  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                  border: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                }}
              >
                <i className="fas fa-brain" /> Generate Intelligence Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />
            Intelligence generation failed
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d" }}>{error}</div>
          <button
            onClick={() => load(true)}
            style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Try again →
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && <GeneratingState />}

      {/* No data + not loading */}
      {!loading && !modules && !error && <EmptyState activeBrand={activeBrand} />}

      {/* Intelligence UI */}
      {!loading && modules && (
        <div>
          {/* Notification center */}
          {notifs.length > 0 && <NotificationCenter notifications={notifs} />}

          {/* Module tabs */}
          <div style={{
            display: "flex", gap: 2, marginBottom: 24,
            borderBottom: "1px solid #e5e9f0", paddingBottom: 0, overflowX: "auto",
          }}>
            {MODULES.map(m => {
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "10px 15px",
                    background: "none", border: "none",
                    borderBottom: isActive ? `2px solid ${m.color}` : "2px solid transparent",
                    color: isActive ? m.color : "#64748b",
                    fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: "pointer",
                    whiteSpace: "nowrap", marginBottom: -1, transition: "all 0.15s",
                  }}
                >
                  <i className={m.icon} style={{ fontSize: 11 }} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Module panel */}
          <ModulePanel moduleData={moduleData} moduleConfig={activeConf} />
        </div>
      )}
    </div>
  );
}
