import React, { useState } from "react";

/* ── Static opportunity pool — in production, replace with /api/customer/opportunities ── */
const OPPORTUNITY_POOL = [
  {
    id: "opp-01", subTab: "recommended",
    category: "visibility", urgency: "critical", confidence: "High Confidence",
    platform: "LinkedIn", funnelStage: "Awareness",
    goal: "Restore visibility momentum",
    rationale: "No content has been published in the last 5 days. Platform algorithms begin demoting accounts after 72 hours of inactivity. Every day without content compounds the visibility penalty.",
    impact: "Recovery of estimated 34% reach suppression",
    businessOutcome: "Restored algorithmic standing within 7 days of consistent publishing.",
    format: "Educational carousel or thought-leadership post",
    title: "Re-activate your publishing cadence — authority is at risk.",
  },
  {
    id: "opp-02", subTab: "recommended",
    category: "authority", urgency: "high", confidence: "Benchmarked",
    platform: "LinkedIn", funnelStage: "Authority",
    goal: "Build category authority",
    rationale: "Your content mix is 80% awareness-layer. Top performers in your vertical publish at least 1 deep authority piece per week — a framework, data insight, or case study.",
    impact: "+40% share rate vs standard posts",
    businessOutcome: "Category authority positioning within 60 days of consistent authority content.",
    format: "Long-form thought-leadership article (800–1,200 words)",
    title: "Publish your first authority framework this week.",
  },
  {
    id: "opp-03", subTab: "recommended",
    category: "opportunity", urgency: "high", confidence: "Inferred",
    platform: "Instagram", funnelStage: "Awareness",
    goal: "Expand visual audience reach",
    rationale: "Your visual content receives 3× more engagement than text posts but represents only 20% of your publishing volume. Increasing visual formats addresses this imbalance directly.",
    impact: "Estimated +3× engagement rate on visual posts",
    businessOutcome: "Stronger top-of-funnel brand recognition in 30 days.",
    format: "Branded visual carousel (5–7 slides)",
    title: "Visual content outperforms text 3:1 — shift your mix.",
  },
  {
    id: "opp-04", subTab: "seo",
    category: "seo", urgency: "high", confidence: "Estimated",
    platform: "Blog / Website", funnelStage: "Discovery",
    goal: "Capture organic search traffic",
    rationale: "Competitor analysis shows 3 high-volume keywords in your vertical with low competition scores. Publishing 2 targeted articles this month would capture this window before competitors do.",
    impact: "300–800 monthly organic visits within 90 days",
    businessOutcome: "Sustainable inbound traffic without paid spend.",
    format: "Long-form SEO article (1,500–2,000 words)",
    title: "3 high-opportunity SEO keywords identified — window is open.",
  },
  {
    id: "opp-05", subTab: "seo",
    category: "seo", urgency: "medium", confidence: "Estimated",
    platform: "Blog / Website", funnelStage: "Discovery",
    goal: "Improve content indexability",
    rationale: "Your existing articles lack structured keyword placement in H2 headings and meta descriptions. Updating the top 5 articles with proper SEO architecture could improve rankings without creating new content.",
    impact: "+15–30% organic impressions within 4 weeks",
    businessOutcome: "Increased search visibility from existing content investment.",
    format: "SEO optimisation pass (no new content required)",
    title: "Quick win: re-optimise your top 5 articles for +30% search visibility.",
  },
  {
    id: "opp-06", subTab: "authority",
    category: "authority", urgency: "high", confidence: "Benchmarked",
    platform: "LinkedIn + Blog", funnelStage: "Authority",
    goal: "Establish thought-leadership positioning",
    rationale: "No published opinion pieces or industry commentary detected. Brands that publish 2+ opinion posts per month are seen as 4× more credible by their target audience than brands that only share updates.",
    impact: "4× credibility perception improvement (industry benchmark)",
    businessOutcome: "Media enquiries, speaking invitations, and referral growth.",
    format: "Strong-opinion post or industry commentary (500–800 words)",
    title: "Publish a strong opinion — silence is a positioning strategy by default.",
  },
  {
    id: "opp-07", subTab: "competitor",
    category: "competitor", urgency: "medium", confidence: "Simulated",
    platform: "LinkedIn", funnelStage: "Awareness",
    goal: "Close competitor content gap",
    rationale: "Leading competitors in your vertical are publishing 4–6× per week. Your current cadence of 2× per week creates a compounding authority gap. Increasing to 4× would close the gap within 45 days.",
    impact: "Closes competitor authority gap within 6–8 weeks",
    businessOutcome: "Equal algorithmic standing with top competitors.",
    format: "Mixed format batch: 2× carousel, 1× educational, 1× opinion",
    title: "Competitor publishing cadence is outpacing yours by 2:1.",
  },
  {
    id: "opp-08", subTab: "competitor",
    category: "competitor", urgency: "medium", confidence: "Simulated",
    platform: "LinkedIn + Instagram", funnelStage: "Authority",
    goal: "Occupy competitor whitespace",
    rationale: "Competitive analysis reveals your top 3 competitors do not publish case studies or results-based content. This is a significant whitespace — proof-of-results content generates 60% higher conversion intent.",
    impact: "+60% conversion intent from proof-based content",
    businessOutcome: "Differentiated positioning and increased conversion rate.",
    format: "Case study post series (3–5 pieces)",
    title: "Case study gap identified — competitors aren't doing what converts best.",
  },
  {
    id: "opp-09", subTab: "engagement",
    category: "growth", urgency: "medium", confidence: "Estimated",
    platform: "LinkedIn", funnelStage: "Engagement",
    goal: "Recover declining engagement rate",
    rationale: "Engagement rate has dropped 28% over the last 30 days. This is typically caused by content format monotony. Introducing conversation-starters, polls, and direct questions typically restores engagement within 2 weeks.",
    impact: "Estimated +35% engagement recovery within 14 days",
    businessOutcome: "Restored algorithmic amplification and audience relationship depth.",
    format: "Conversational post, poll, or open question",
    title: "Engagement declining — introduce conversation-starter formats.",
  },
  {
    id: "opp-10", subTab: "growth-campaigns",
    category: "growth", urgency: "medium", confidence: "Estimated",
    platform: "LinkedIn + Email", funnelStage: "Conversion",
    goal: "Activate email list growth",
    rationale: "Social followers are not converting to email subscribers. Adding a value-based lead magnet linked from your top 3 posts would begin capturing high-intent leads for long-term nurturing.",
    impact: "Estimated +12% email conversion from social",
    businessOutcome: "Platform-independent audience ownership and recurring lead flow.",
    format: "Lead magnet promo post + landing page",
    title: "Email capture is unactivated — social audience not converting to owned list.",
  },
  {
    id: "opp-11", subTab: "weekly",
    category: "recommendation", urgency: "high", confidence: "Inferred",
    platform: "LinkedIn", funnelStage: "Authority",
    goal: "Weekly strategic priority",
    rationale: "Based on your Brand DNA and current content gaps, this week's highest-leverage action is establishing a consistent authority publishing slot.",
    impact: "Foundational cadence established",
    businessOutcome: "Compounding authority growth starting from week 1.",
    format: "1× authority post + 3× awareness posts",
    title: "Week 1 priority: Establish your authority publishing rhythm.",
  },
  {
    id: "opp-12", subTab: "performance",
    category: "intelligence", urgency: "low", confidence: "Estimated",
    platform: "All Platforms", funnelStage: "All Stages",
    goal: "Performance baseline",
    rationale: "Tracking opportunity performance enables the system to improve recommendation accuracy over time. Mark completed opportunities to refine your intelligence feed.",
    impact: "Improved recommendation accuracy",
    businessOutcome: "Higher-quality opportunities over time.",
    format: "Action review",
    title: "Complete 5 opportunities to unlock performance tracking.",
  },
];

const SUB_TABS = [
  { id: "recommended",       label: "Recommended",         icon: "fas fa-star" },
  { id: "weekly",            label: "Weekly Strategic Plan", icon: "fas fa-calendar-week" },
  { id: "authority",         label: "Authority",            icon: "fas fa-crown" },
  { id: "seo",               label: "SEO Opportunities",    icon: "fas fa-search" },
  { id: "competitor",        label: "Competitor Gaps",       icon: "fas fa-binoculars" },
  { id: "engagement",        label: "Engagement Recovery",   icon: "fas fa-fire" },
  { id: "growth-campaigns",  label: "Growth Campaigns",     icon: "fas fa-rocket" },
  { id: "performance",       label: "Performance",          icon: "fas fa-chart-bar" },
];

const CATEGORY_COLORS = {
  visibility: { bg: "#f5f3ff", accent: "#7c3aed", badge: "#ede9fe" },
  authority:  { bg: "#eff6ff", accent: "#2563EB", badge: "#dbeafe" },
  seo:        { bg: "#f0f9ff", accent: "#0284c7", badge: "#e0f2fe" },
  competitor: { bg: "#fff1f2", accent: "#e11d48", badge: "#ffe4e6" },
  growth:     { bg: "#f0fdf4", accent: "#16a34a", badge: "#dcfce7" },
  opportunity: { bg: "#fffbeb", accent: "#d97706", badge: "#fef3c7" },
  recommendation: { bg: "#ecfeff", accent: "#0891b2", badge: "#cffafe" },
  intelligence: { bg: "#eef2ff", accent: "#4f46e5", badge: "#e0e7ff" },
};

const URGENCY_CONFIG = {
  critical: { label: "Critical",  color: "#ef4444" },
  high:     { label: "High",      color: "#f59e0b" },
  medium:   { label: "Medium",    color: "#2563EB" },
  low:      { label: "Low",       color: "#64748b" },
};

const OpportunityCard = ({ opp, onAction, dismissed, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  if (dismissed) return null;

  const colors = CATEGORY_COLORS[opp.category] || CATEGORY_COLORS.opportunity;
  const urgency = URGENCY_CONFIG[opp.urgency] || URGENCY_CONFIG.medium;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid #e5e9f0`,
      borderLeft: `4px solid ${colors.accent}`,
      borderRadius: 16,
      padding: "24px 28px",
      marginBottom: 16,
      transition: "box-shadow 0.2s, transform 0.2s",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ background: colors.badge, color: colors.accent, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {opp.category}
          </span>
          <span style={{ background: "#f8fafc", color: urgency.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: `1px solid ${urgency.color}22` }}>
            {urgency.label} Priority
          </span>
          <span style={{ background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>
            {opp.confidence}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "3px 8px", borderRadius: 8 }}>
            {opp.platform}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>·</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{opp.funnelStage}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8, lineHeight: 1.4 }}>
        {opp.title}
      </div>

      {/* Goal */}
      <div style={{ fontSize: 13, color: colors.accent, fontWeight: 600, marginBottom: 10 }}>
        Strategic Goal: {opp.goal}
      </div>

      {/* Rationale (always visible) */}
      <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, marginBottom: 16 }}>
        {opp.rationale}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Expected Impact</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{opp.impact}</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Business Outcome</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{opp.businessOutcome}</div>
            </div>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Suggested Format</div>
            <div style={{ fontSize: 14, color: "#15803d" }}>{opp.format}</div>
          </div>
        </div>
      )}

      {/* CTA Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            id={`opp-draft-${opp.id}`}
            onClick={() => onAction?.("draft", opp)}
            style={{ background: colors.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Generate Draft
          </button>
          <button
            id={`opp-calendar-${opp.id}`}
            onClick={() => onAction?.("calendar", opp)}
            style={{ background: "#f8fafc", color: "#334155", border: "1px solid #e5e9f0", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Add to Calendar
          </button>
          <button
            id={`opp-save-${opp.id}`}
            onClick={() => onAction?.("save", opp)}
            style={{ background: "#f8fafc", color: "#334155", border: "1px solid #e5e9f0", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={() => setExpanded(x => !x)}
            style={{ background: "none", color: "#64748b", border: "1px solid #e5e9f0", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {expanded ? "Show Less" : "Full Details"}
          </button>
        </div>
        <button
          id={`opp-dismiss-${opp.id}`}
          onClick={() => onDismiss?.(opp.id)}
          style={{ background: "none", color: "#94a3b8", border: "none", fontSize: 12, cursor: "pointer", padding: "4px 8px" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

const PerformancePanel = () => (
  <div style={{ textAlign: "center", padding: "60px 40px" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Opportunity Performance Tracking</h3>
    <p style={{ fontSize: 15, color: "#64748b", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>
      Complete 5 opportunities to unlock performance tracking. The system will learn which opportunity types drive the best outcomes for your brand and refine future recommendations accordingly.
    </p>
    <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #e5e9f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14, fontWeight: 700 }}>
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);

export default function ContentOpportunities({ activeBrand, switchTab }) {
  const [activeSubTab, setActiveSubTab] = useState("recommended");
  const [dismissed, setDismissed] = useState([]);

  const handleAction = (action, opp) => {
    if (action === "draft")    switchTab?.("social");
    if (action === "calendar") switchTab?.("schedule");
    if (action === "save")     alert(`"${opp.title}" saved to your opportunity library.`);
  };

  const handleDismiss = (id) => setDismissed(d => [...d, id]);

  const visible = OPPORTUNITY_POOL.filter(o => o.subTab === activeSubTab && !dismissed.includes(o.id));
  const allDismissed = visible.length === 0 && activeSubTab !== "performance";

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1040, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 10 }}>
          AI Growth Intelligence
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
          Content Opportunities
        </h1>
        <p style={{ fontSize: 15, color: "#64748b", maxWidth: 640, lineHeight: 1.6 }}>
          AI-detected business growth opportunities for <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong> — translated into executable content actions, ranked by strategic impact.
        </p>
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, borderBottom: "1px solid #e5e9f0", paddingBottom: 0, overflowX: "auto" }}>
        {SUB_TABS.map(tab => {
          const isActive = activeSubTab === tab.id;
          const count = tab.id === "performance" ? null :
            OPPORTUNITY_POOL.filter(o => o.subTab === tab.id && !dismissed.includes(o.id)).length;
          return (
            <button
              key={tab.id}
              id={`opp-tab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                background: "none", border: "none",
                borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                color: isActive ? "#2563EB" : "#64748b",
                fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
                whiteSpace: "nowrap", marginBottom: -1, transition: "color 0.2s",
              }}
            >
              <i className={tab.icon} style={{ fontSize: 12 }} />
              {tab.label}
              {count > 0 && (
                <span style={{ background: isActive ? "#2563EB" : "#f1f5f9", color: isActive ? "#fff" : "#64748b", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      {activeSubTab === "performance" ? (
        <PerformancePanel />
      ) : allDismissed ? (
        <div style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>All opportunities reviewed</h3>
          <p style={{ fontSize: 14, color: "#64748b" }}>New opportunities will appear as the intelligence engine detects them.</p>
        </div>
      ) : (
        <div>
          {visible.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              dismissed={dismissed.includes(opp.id)}
              onAction={handleAction}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
