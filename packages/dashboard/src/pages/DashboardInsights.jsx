import React, { useState, useEffect } from "react";
import { apiRequest } from "../lib/api/client";

const SUB_TABS = [
  { id: "executive",   label: "Executive",   icon: "fas fa-chess-king" },
  { id: "competitive", label: "Competitive", icon: "fas fa-binoculars" },
  { id: "audience",    label: "Audience",    icon: "fas fa-users" },
  { id: "growth",      label: "Growth",      icon: "fas fa-rocket" },
  { id: "content",     label: "Content",     icon: "fas fa-file-alt" },
  { id: "seo",         label: "SEO",         icon: "fas fa-search" },
];

/* ─── Shared atoms ─────────────────────────────────── */

const Card = ({ eyebrow, headline, body, accent = "#2563EB" }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: "24px 28px",
    border: "1px solid #e5e9f0", borderLeft: `5px solid ${accent}`,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 18,
  }}>
    {eyebrow && <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 8 }}>{eyebrow}</div>}
    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{headline}</div>
    <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{body}</div>
  </div>
);

const RiskCard = ({ level, title, detail }) => {
  const c = {
    high:   { bg: "#fff1f2", border: "#fca5a5", text: "#991b1b", dot: "#ef4444" },
    medium: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dot: "#f59e0b" },
    low:    { bg: "#f0fdf4", border: "#86efac", text: "#166534", dot: "#22c55e" },
  }[level] || { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dot: "#f59e0b" };
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.text }}>{level} priority</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
};

const ScoreBar = ({ label, value, color }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}%</span>
    </div>
    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
    </div>
  </div>
);

const dimColor = (v) => v >= 70 ? "#16a34a" : v >= 50 ? "#d97706" : "#dc2626";

const ConnectBanner = ({ message }) => (
  <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12 }}>
    <span style={{ fontSize: 18, flexShrink: 0 }}>📊</span>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 2 }}>Unlock Personalised Benchmarks</div>
      <div style={{ fontSize: 13, color: "#0c4a6e" }}>{message}</div>
    </div>
  </div>
);

/* ─── Empty State ───────────────────────────────────── */

const AuditEmptyState = ({ activeBrand }) => (
  <div style={{ textAlign: "center", maxWidth: 560, margin: "60px auto", padding: "0 16px" }}>
    <div style={{ fontSize: 48, marginBottom: 20 }}>🔍</div>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
      No brand intelligence yet
    </h2>
    <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.65, marginBottom: 28 }}>
      Run your free Brand Audit to unlock personalised insights for{" "}
      <strong>{activeBrand?.name || "your brand"}</strong>. Your audit results drive every panel
      in this section — scores, gaps, recommendations, and your 12-week growth roadmap.
    </p>
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
      <a href="/brand-audit" style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
        borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none",
        boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
      }}>
        <i className="fas fa-chart-line" /> Run Free Brand Audit
      </a>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, textAlign: "left", maxWidth: 520, margin: "0 auto" }}>
      {[
        { icon: "fas fa-dna", label: "Brand DNA Score™", desc: "Weighted score across 6 strategic dimensions" },
        { icon: "fas fa-exclamation-triangle", label: "Priority Gaps", desc: "Top 3–5 gaps limiting your growth" },
        { icon: "fas fa-road", label: "12-Week Roadmap", desc: "Actionable next steps tailored to your brand" },
      ].map(({ icon, label, desc }) => (
        <div key={label} style={{ padding: "16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <i className={icon} style={{ color: "#2563eb", marginBottom: 8, display: "block" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{desc}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Audit-aware panels ────────────────────────────── */

const ExecutivePanel = ({ audit, activeBrand }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="General Framework" headline="Build Strategic Brand Presence" body="Consistent brand publishing, platform authority, and content quality are the three levers that compound over time. Run your Brand Audit to get a personalised assessment of where you stand today." accent="#2563EB" />
      <ConnectBanner message="Connect your social accounts or run your Brand Audit to unlock personalised benchmarks and real performance data." />
    </div>
  );

  const score = audit.overall_score || 0;
  const breakdown = audit.score_breakdown || {};
  const actions = audit.strategic_analysis || [];
  const scoreColor = dimColor(score);
  const topGaps = actions.slice(0, 3);

  const urgencyLevel = (u) => {
    if (!u) return 'medium';
    const up = String(u).toUpperCase();
    if (up === 'HIGH' || up === 'CRITICAL') return 'high';
    if (up === 'LOW') return 'low';
    return 'medium';
  };

  return (
    <div>
      {/* Score overview */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e5e9f0", marginBottom: 18, display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ textAlign: "center", minWidth: 90 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>/ 100</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, marginTop: 4 }}>
            {score >= 70 ? "Strong" : score >= 50 ? "Developing" : "Needs Work"}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
            {activeBrand?.name || audit.brand_name} — Brand Intelligence Overview
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            {score >= 70
              ? "Your brand has solid foundations across the key strategic dimensions. Focused execution will drive accelerated growth."
              : score >= 50
              ? "You have genuine potential but key gaps are limiting reach and authority. A targeted plan can close these gaps."
              : "Significant gaps across core brand dimensions. Consistent execution in the priority areas below will drive the most impact."}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e5e9f0", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 16 }}>Score Breakdown — 6 Strategic Dimensions</div>
          {Object.entries(breakdown).map(([key, val]) => (
            <ScoreBar key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={val} color={dimColor(val)} />
          ))}
        </div>
      )}

      {/* Top Gaps */}
      {topGaps.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 14 }}>Priority Focus Areas</div>
          {topGaps.map((a, i) => (
            <RiskCard key={i} level={urgencyLevel(a.urgency)} title={a.metric || 'Strategic Gap'} detail={`${a.cause || ''}${a.recommendation ? ' → ' + a.recommendation : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
};

const CompetitivePanel = ({ audit }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="Competitive Landscape" headline="Position Yourself in a Competitive Market" body="Top performers in most verticals publish 4–6× per week with consistent visual identity and strong conversion architecture. Run your Brand Audit to see how your brand compares against industry benchmarks." accent="#7c3aed" />
      <ConnectBanner message="Connect your social accounts to see how your actual publishing frequency, engagement rate, and cross-platform presence compare to industry benchmarks." />
    </div>
  );

  const benchmarks = audit.benchmarks || {};
  const industry = audit.industry;

  return (
    <div>
      <Card eyebrow="Competitive Context" headline={`${industry || 'Your Industry'} — Benchmark Position`}
        body={`The average brand in this category scores ${benchmarks.avg_score || 55}/100 on the Brand DNA framework. Top 10% of performers reach ${benchmarks.top_10_percent || 85}/100. Your current score of ${audit.overall_score} positions you ${audit.overall_score >= (benchmarks.avg_score || 55) ? 'above' : 'below'} the industry average.`}
        accent="#7c3aed" />
      {benchmarks.engagement_baseline && (
        <Card eyebrow="Engagement Benchmark" headline="Industry Engagement Baseline"
          body={`The engagement baseline for this category is ${benchmarks.engagement_baseline}. Building toward this benchmark through consistent, high-quality content is the most reliable path to competitive positioning.`}
          accent="#0891b2" />
      )}
      <Card eyebrow="Strategic Framework" headline="The 3-Layer Content Authority Stack"
        body="Leading brands use a 3-layer strategy: Awareness (broad reach, educates) → Authority (deep expertise, earns trust) → Conversion (direct CTA, captures warm leads). Building all three creates a compounding flywheel that generates results across the full funnel."
        accent="#dc2626" />
      <ConnectBanner message="Connect your social accounts to see your actual publishing frequency and engagement rate relative to industry leaders." />
    </div>
  );
};

const AudiencePanel = ({ audit }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="Audience Intelligence" headline="Build an Audience That Compounds" body="Audience growth compounds when content is simultaneously valuable, consistent, and discoverable. Run your Brand Audit to unlock platform-specific audience intelligence based on your actual brand context." accent="#0891b2" />
      <ConnectBanner message="Connect your social accounts to see real audience growth rate, trust scores, and engagement depth based on your actual content performance." />
    </div>
  );

  const platforms = audit.platforms || [];
  const platformInsights = {
    linkedin: { note: "LinkedIn rewards consistent thought-leadership content. Posting 3–4× per week with expert commentary on industry topics compounds authority faster than any other B2B platform." },
    instagram: { note: "Instagram's algorithm rewards Reels engagement heavily. A 2:1 ratio of Reels to static posts maximises discoverability while maintaining visual brand consistency." },
    facebook: { note: "Facebook organic reach is low but community-focused content (polls, questions, behind-the-scenes) outperforms promotional content by 3–5× in engagement." },
    tiktok:   { note: "TikTok's discovery algorithm is the most powerful organic reach engine available. Educational and entertaining formats under 60 seconds consistently outperform branded content." },
    x:        { note: "X/Twitter rewards consistent, conversational posting. Threads with data or strong opinions generate 4–8× the reach of standalone tweets." },
  };

  return (
    <div>
      {platforms.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 14 }}>Platform-Specific Insights</div>
          {platforms.map(p => platformInsights[p] && (
            <Card key={p} eyebrow={p.replace(/\b\w/g, l => l.toUpperCase())} headline={`${p.charAt(0).toUpperCase() + p.slice(1)} — Channel Strategy`} body={platformInsights[p].note} accent="#0891b2" />
          ))}
        </div>
      )}
      {platforms.length === 0 && (
        <Card eyebrow="Audience Intelligence" headline="No Platforms Detected" body="No platforms were identified in your audit. Activating even 2 platforms with consistent content creates compounding audience growth advantages." accent="#0891b2" />
      )}
      <RiskCard level="medium" title="Referral Activation" detail="If your audience isn't sharing content, add a strong angle — a contrarian take, surprising data, or practical framework — to trigger sharing behaviour." />
      <ConnectBanner message="Connect your accounts to see real engagement depth, comment rate, and follower growth trends from your actual published content." />
    </div>
  );
};

const GrowthPanel = ({ audit }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="Growth Intelligence" headline="3 High-Leverage Growth Systems" body="Content repurposing, cross-platform amplification, and email capture integration are the three highest-ROI growth vectors available without ad spend. Run your Brand Audit to see a tailored 12-week roadmap." accent="#22c55e" />
    </div>
  );

  const nextSteps = audit.next_steps || [];
  const roadmap = audit.roadmap || {};
  const quickWins = roadmap.quick_wins || [];

  return (
    <div>
      {quickWins.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e5e9f0", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#22c55e", marginBottom: 14 }}>Quick Wins — Act This Week</div>
          {quickWins.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < quickWins.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 14, color: "#334155" }}>
              <i className="fas fa-bolt" style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {nextSteps.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 14 }}>Strategic Next Steps</div>
          {nextSteps.slice(0, 4).map((s, i) => (
            <Card key={i} eyebrow={`Priority ${i + 1}`}
              headline={typeof s === 'string' ? s.split('.')[0] : (s.label || s.action || `Step ${i + 1}`)}
              body={typeof s === 'string' ? s : (s.action || s.description || '')}
              accent="#22c55e" />
          ))}
        </div>
      )}

      <Card eyebrow="90-Day Growth Roadmap · Phase 1" headline="Consistency Foundation"
        body="Lock in a non-negotiable publishing schedule across your active platforms. Consistency is the growth multiplier — everything else amplifies on top of it."
        accent="#2563EB" />
      <Card eyebrow="90-Day Growth Roadmap · Phase 2" headline="Authority Stacking"
        body="Begin publishing 1 long-form authority post per week — a deep framework, data analysis, or case study. Authority content earns shares and media attention that short-form alone cannot generate."
        accent="#7c3aed" />
    </div>
  );
};

const ContentPanel = ({ audit }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="Content Intelligence" headline="Build a Complete Content Ecosystem" body="Most brands excel in one content dimension while leaving others underserved. A complete ecosystem spans informational, emotional, and conversion content. Run your Brand Audit to get a goal-specific content strategy." accent="#f59e0b" />
      <ConnectBanner message="Connect your social accounts to see your actual content mix breakdown, top-performing formats, and engagement patterns." />
    </div>
  );

  const goals = audit.goals || [];
  const GOAL_CONTENT_MAP = {
    brand_awareness:    { focus: "Educational & Inspirational", note: "40–50% of your content should educate or inspire. This is the highest-reach format and builds audience trust faster than any other type." },
    lead_gen:           { focus: "Conversion & Informational", note: "Lead generation content performs best when it solves a specific pain point and ends with a clear, low-friction CTA. Offer value before the ask." },
    engagement:         { focus: "Community & Conversational", note: "Engagement-focused content thrives on direct questions, bold opinions, and behind-the-scenes authenticity. Respond to every comment within 2 hours to amplify algorithm signals." },
    sales:              { focus: "Proof-Based & Direct Sales", note: "Testimonials, before/after results, and objection-handling content convert warm audiences most effectively. Mix social proof with direct offers at a 3:1 ratio." },
    thought_leadership: { focus: "Expert Analysis & Long-form", note: "Thought leadership compounds through depth and consistency. Publishing one in-depth, data-backed piece per week builds the authority that attracts media and collaboration opportunities." },
  };

  const goalInsights = goals.filter(g => GOAL_CONTENT_MAP[g]).map(g => ({ ...GOAL_CONTENT_MAP[g], goal: g }));

  return (
    <div>
      {goalInsights.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 14 }}>Goal-Specific Content Strategy</div>
          {goalInsights.map(({ goal, focus, note }) => (
            <Card key={goal} eyebrow={goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} headline={focus} body={note} accent="#f59e0b" />
          ))}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e5e9f0", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 16 }}>Optimal Content Mix Target</div>
        {[
          { type: "Informational / Educational", target: 40, color: "#2563EB" },
          { type: "Inspirational / Emotional",   target: 30, color: "#7c3aed" },
          { type: "Promotional / Conversion",    target: 20, color: "#f59e0b" },
          { type: "Community / Engagement",      target: 10, color: "#22c55e" },
        ].map(({ type, target, color }) => (
          <ScoreBar key={type} label={type} value={target} color={color} />
        ))}
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Industry-standard content mix targets — not based on your actual published content.</div>
      </div>

      <ConnectBanner message="Connect your social accounts to see your actual content mix breakdown and top-performing formats." />
    </div>
  );
};

const SEOPanel = ({ audit }) => {
  if (!audit) return (
    <div>
      <Card eyebrow="SEO & Visibility" headline="Unlock the Platform Search Layer" body="Your social content can work twice as hard by being optimised for platform-internal search. Run your Brand Audit to get visibility recommendations specific to your platforms and industry." accent="#0891b2" />
      <ConnectBanner message="Connect your social accounts to measure your actual search discoverability score and hashtag reach coverage." />
    </div>
  );

  const hasWebsite = !!audit.website_url;
  const diagnostic = audit.diagnostic || {};

  return (
    <div>
      {!hasWebsite && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "16px 20px", marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>
            <i className="fas fa-exclamation-triangle me-2" />No Website Connected
          </div>
          <div style={{ fontSize: 13, color: "#7c2d12" }}>Adding your website URL in a future audit improves Brand DNA scoring accuracy and enables website SEO analysis.</div>
        </div>
      )}
      {hasWebsite && (
        <Card eyebrow="Website Presence" headline="Website Connected"
          body={`Website detected at ${audit.website_url}. CTA effectiveness: ${diagnostic.cta_effectiveness || 'Not assessed'}. Ensure your website has clear conversion paths that align with your social content.`}
          accent="#22c55e" />
      )}
      <Card eyebrow="Platform SEO" headline="Keyword-Optimise Your Bio and First Caption Line"
        body="Adding 2–3 primary keywords to your profile bio and the first line of each caption materially improves platform search ranking within 2–4 weeks. Use the language your ideal customer uses to search for solutions."
        accent="#0891b2" />
      <RiskCard level="medium" title="Hashtag Strategy" detail="A structured hashtag approach (3 niche + 3 mid-range + 2 broad per post) consistently outperforms random hashtag selection. Use the Hashtag Manager to build curated collections." />
      <ConnectBanner message="Connect your social accounts to measure your actual search discoverability score, hashtag reach coverage, and content indexability." />
    </div>
  );
};

/* ─── Main Component ────────────────────────────────── */

export default function DashboardInsights({ activeBrand }) {
  const [activeSubTab, setActiveSubTab] = useState("executive");
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    if (!activeBrand?.id) {
      setLoadingAudit(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Fetch audit list for this brand
        const listRes = await apiRequest("/api/customer/intelligence/audits");
        const audits = listRes?.data || [];

        if (audits.length === 0) {
          if (!cancelled) setLoadingAudit(false);
          return;
        }

        // Fetch full data for the most recent audit
        const latest = audits[0];
        const fullRes = await apiRequest(`/api/customer/intelligence/audits/${latest.id}`);
        if (!cancelled) {
          setAuditData({
            ...fullRes,
            score_breakdown: fullRes.score_breakdown || {},
            strategic_analysis: fullRes.strategic_analysis || [],
            next_steps: fullRes.next_steps || [],
            goals: fullRes.goals || [],
            platforms: fullRes.platforms || [],
          });
        }
      } catch {
        // Silently fail — empty state shown
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeBrand?.id]);

  const hasAudit = !!auditData;

  const panels = {
    executive:   <ExecutivePanel   audit={auditData} activeBrand={activeBrand} />,
    competitive: <CompetitivePanel audit={auditData} />,
    audience:    <AudiencePanel    audit={auditData} />,
    growth:      <GrowthPanel      audit={auditData} />,
    content:     <ContentPanel     audit={auditData} />,
    seo:         <SEOPanel         audit={auditData} />,
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 8 }}>
          Strategic Intelligence Center
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Brand Insights</h1>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 580, lineHeight: 1.6 }}>
              {hasAudit
                ? <>Audit-driven intelligence for <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong>. Score: <strong style={{ color: auditData.overall_score >= 70 ? "#16a34a" : auditData.overall_score >= 50 ? "#d97706" : "#dc2626" }}>{auditData.overall_score}/100</strong>.</>
                : <>Strategic guidance for <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong>. Run your Brand Audit to personalise all panels below.</>
              }
            </p>
          </div>
          {!hasAudit && !loadingAudit && (
            <a href="/brand-audit" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
              borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none", flexShrink: 0,
            }}>
              <i className="fas fa-chart-line" /> Run Brand Audit
            </a>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loadingAudit && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ fontSize: 13, marginTop: 10 }}>Loading intelligence...</div>
        </div>
      )}

      {/* Empty state — no audit at all */}
      {!loadingAudit && !hasAudit && (
        <AuditEmptyState activeBrand={activeBrand} />
      )}

      {/* Content — with or without audit data */}
      {!loadingAudit && (
        <div>
          {/* Tabs — only show when there's content to display */}
          {hasAudit && (
            <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #e5e9f0", paddingBottom: 0, overflowX: "auto" }}>
              {SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                    background: "none", border: "none",
                    borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                    color: isActive ? "#2563EB" : "#64748b",
                    fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
                    whiteSpace: "nowrap", marginBottom: -1, transition: "color 0.2s, border-color 0.2s",
                  }}>
                    <i className={tab.icon} style={{ fontSize: 11 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Panel content */}
          {hasAudit && panels[activeSubTab]}
        </div>
      )}
    </div>
  );
}
