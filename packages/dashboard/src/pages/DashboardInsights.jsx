import React, { useState } from "react";

const SUB_TABS = [
  { id: "executive",    label: "Executive Intelligence",    icon: "fas fa-chess-king" },
  { id: "competitive",  label: "Competitive Intelligence",  icon: "fas fa-binoculars" },
  { id: "audience",     label: "Audience Intelligence",     icon: "fas fa-users" },
  { id: "growth",       label: "Growth Intelligence",       icon: "fas fa-rocket" },
  { id: "content",      label: "Content Intelligence",      icon: "fas fa-file-alt" },
  { id: "seo",          label: "SEO & Visibility",          icon: "fas fa-search" },
];

/* ─── Advisory card atoms ─── */
const NarrativeCard = ({ eyebrow, headline, body, accent = "#2563EB" }) => (
  <div style={{
    background: "#fff",
    borderRadius: 16,
    padding: "32px 36px",
    border: "1px solid #e5e9f0",
    borderLeft: `5px solid ${accent}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    marginBottom: 24,
  }}>
    {eyebrow && (
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 8 }}>
        {eyebrow}
      </div>
    )}
    <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{headline}</div>
    <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.7 }}>{body}</div>
  </div>
);

const RiskCard = ({ level, title, detail }) => {
  const colors = { high: { bg: "#fff1f2", border: "#fca5a5", text: "#991b1b", dot: "#ef4444" }, medium: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dot: "#f59e0b" }, low: { bg: "#f0fdf4", border: "#86efac", text: "#166534", dot: "#22c55e" } };
  const c = colors[level] || colors.medium;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.text }}>{level} risk</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
};

const BenchmarkCard = ({ label, yourScore, industryAvg, unit = "" }) => {
  const pct = Math.min(100, Math.round((yourScore / (industryAvg * 1.5)) * 100));
  const ahead = yourScore >= industryAvg;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e9f0", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{label}</div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: ahead ? "#dcfce7" : "#fee2e2", color: ahead ? "#166534" : "#991b1b" }}>
          {ahead ? "▲ Above Avg" : "▼ Below Avg"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{yourScore}{unit}</span>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>vs {industryAvg}{unit} industry avg</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: ahead ? "#22c55e" : "#f59e0b", borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

const OpportunityCard = ({ icon, title, potential, action }) => (
  <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f8faff 100%)", border: "1px solid #bfdbfe", borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
    <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600, marginBottom: 10 }}>Potential: {potential}</div>
    <div style={{ fontSize: 14, color: "#475569" }}>{action}</div>
  </div>
);

/* ─── Sub-tab panels ─── */

const ExecutivePanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Executive Summary"
      headline={`${activeBrand?.name || "Your Brand"} is at a strategic inflection point.`}
      body="Your content operation shows strong intent signals but is currently under-leveraging consistency cadence and platform-authority stacking. The gap between content production and audience compounding is widening — this is the defining window to close it before competitors establish algorithmic dominance in your vertical."
      accent="#2563EB"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
      <NarrativeCard eyebrow="Brand Momentum" headline="Moderate — Improving" body="Your publishing frequency is within acceptable range but falls short of top-quartile cadence for your industry. Consistency is the highest-leverage improvement available." accent="#7c3aed" />
      <NarrativeCard eyebrow="Authority Position" headline="Developing" body="Authority signals are building but have not yet crossed the threshold for algorithmic amplification. Three more months of consistent, niche-specific content can change this trajectory." accent="#0891b2" />
    </div>
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Risk Indicators</div>
    <RiskCard level="high" title="Publishing Inconsistency" detail="Irregular posting windows are suppressing reach velocity. Algorithms reward predictable cadence — gaps of 3+ days reset momentum." />
    <RiskCard level="medium" title="Single-Platform Dependency" detail="Over-concentration on one platform increases vulnerability to algorithm shifts. Diversifying to 2–3 channels reduces exposure significantly." />
    <RiskCard level="low" title="Content Format Diversity" detail="Current format mix is limited. Brands with mixed-format strategies (video + long-form + short-form) see 40% higher compound reach." />
  </div>
);

const CompetitivePanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Competitive Landscape"
      headline="You are competing in a market where 3 brands have established clear authority."
      body="Top performers in your vertical are publishing 4–6× per week with consistent visual identity and strong conversion architecture. Your current output positions you in the second tier — capable of closing the gap with 60 days of strategic effort."
      accent="#7c3aed"
    />
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginTop: 28 }}>Benchmark Comparison</div>
    <BenchmarkCard label="Publishing Frequency (posts/week)" yourScore={3} industryAvg={5} />
    <BenchmarkCard label="Content Engagement Rate" yourScore={2.4} industryAvg={3.1} unit="%" />
    <BenchmarkCard label="Profile Conversion Rate" yourScore={1.8} industryAvg={1.2} unit="%" />
    <BenchmarkCard label="Cross-Platform Presence" yourScore={2} industryAvg={3} unit=" platforms" />
    <NarrativeCard
      eyebrow="Strategic Gap Analysis"
      headline="Authority positioning is the primary competitive gap."
      body="Leading competitors use a predictable 3-layer content strategy: Awareness content (broad reach) → Authority content (deep expertise) → Conversion content (direct CTA). Your current mix is predominantly awareness-layer, leaving the authority and conversion layers underserved."
      accent="#dc2626"
    />
  </div>
);

const AudiencePanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Audience Intelligence"
      headline="Your audience is engaged but not yet compounding."
      body="Engagement data suggests a core of highly loyal followers who interact regularly, but growth rate indicates the content is not being distributed beyond the existing base. This signals a visibility problem, not a quality problem — the content is resonating but not spreading."
      accent="#0891b2"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
      <NarrativeCard eyebrow="Audience Trust Level" headline="Building — Score: 6.4/10" body="Trust is built through consistency, evidence (case studies, results), and value-first content. Current trust signals are developing but have not reached the threshold for organic referral behavior." accent="#0891b2" />
      <NarrativeCard eyebrow="Audience Growth Velocity" headline="Slow — 1.2%/month" body="Industry leaders in your vertical average 3.8%/month organic growth. Closing this gap requires visibility expansion through SEO-driven content and platform amplification tactics." accent="#7c3aed" />
    </div>
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Audience Signals</div>
    <RiskCard level="medium" title="Limited Referral Behavior" detail="Audience is not actively sharing content. Shareable content (strong opinions, data, frameworks, stories) would activate this latent distribution network." />
    <RiskCard level="low" title="Comment Engagement Gap" detail="Posts are receiving views but limited comment depth. Conversation-starting formats (polls, questions, controversial takes) improve algorithm scoring." />
    <NarrativeCard eyebrow="Opportunity" headline="Your audience is primed for deeper community activation." body="The data suggests followers are interested but waiting for more direct engagement prompts. Implementing a 30-day community activation strategy — direct questions, response commitments, exclusive insights — could double comment rates within 6 weeks." accent="#22c55e" />
  </div>
);

const GrowthPanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Growth Intelligence"
      headline="3 high-leverage growth systems are currently unactivated."
      body="Based on your brand profile and current content footprint, the following growth vectors represent the highest ROI opportunities available to you right now. Each can be activated within your existing workflow with minor adjustments."
      accent="#22c55e"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
      <OpportunityCard icon="🔁" title="Content Repurposing Engine" potential="+180% reach from existing content" action="Convert your best-performing posts into 3 additional formats: carousel, short video, and long-form article." />
      <OpportunityCard icon="🔗" title="Cross-Platform Amplification" potential="+65% content ROI" action="Publish core content on primary platform first, then adapt and republish on 2 secondary platforms within 48 hours." />
      <OpportunityCard icon="📧" title="Email Capture Integration" potential="+12% lead conversion" action="Add a value-based lead magnet linked from your top 3 social profiles. Social to email conversion is your highest-value growth funnel." />
    </div>
    <NarrativeCard eyebrow="Growth Roadmap — 90 Days" headline="Phase 1 (Days 1–30): Consistency Foundation" body="Lock in a non-negotiable publishing schedule. 4 posts per week minimum across 2 platforms. Use a content calendar to eliminate decision fatigue. Consistency is the growth multiplier — everything else amplifies on top of it." accent="#2563EB" />
    <NarrativeCard eyebrow="Growth Roadmap — 90 Days" headline="Phase 2 (Days 31–60): Authority Stacking" body="Begin publishing 1 long-form authority post per week — a deep framework, data analysis, or case study. Authority content earns shares, backlinks, and media attention that short-form alone cannot generate." accent="#7c3aed" />
    <NarrativeCard eyebrow="Growth Roadmap — 90 Days" headline="Phase 3 (Days 61–90): Conversion Activation" body="Introduce conversion-layer content: testimonials, behind-the-scenes, direct offers, and proof-based content. The audience built in phases 1–2 is now warm enough to convert at significantly higher rates." accent="#22c55e" />
  </div>
);

const ContentPanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Content Intelligence"
      headline="Your content genome is strong in one dimension — it needs expansion."
      body="Analysis of your content patterns shows a clear strength in informational content. However, the content mix is missing two critical layers: emotional resonance content (stories, behind-the-scenes) and conversion-architecture content (proof, testimonials, direct CTAs). Adding these layers will activate the full conversion funnel."
      accent="#f59e0b"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
      <div>
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Content Mix Analysis</div>
        {[
          { type: "Informational", pct: 68, color: "#2563EB", verdict: "Overweighted" },
          { type: "Inspirational", pct: 22, color: "#7c3aed", verdict: "Underweighted" },
          { type: "Promotional", pct: 10, color: "#f59e0b", verdict: "Critical Gap" },
        ].map(({ type, pct, color, verdict }) => (
          <div key={type} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{type}</span>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{pct}% — {verdict}</span>
            </div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Top Performing Formats</div>
        {["Long-form educational posts", "How-to frameworks", "Industry observations", "Product highlights", "Team stories"].map((f, i) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#2563EB", minWidth: 20 }}>#{i + 1}</span>
            <span style={{ fontSize: 14, color: "#334155" }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
    <NarrativeCard eyebrow="Content Opportunity" headline="The '5-3-2 Rule' could transform your mix." body="For every 10 posts: 5 should be curated/educational content from others in your space, 3 should be original thought-leadership from your brand, and 2 should be promotional. This balance maximises reach while building authority and driving conversion." accent="#22c55e" />
  </div>
);

const SEOPanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="SEO & Visibility Intelligence"
      headline="Your brand has significant untapped search visibility potential."
      body="Your current social content is not being optimised for discoverability within platform search. Instagram, LinkedIn, and TikTok each have internal search algorithms that respond to keyword-rich captions, hashtag strategy, and engagement velocity. Optimising for these adds a compounding visibility layer to every post you publish."
      accent="#0891b2"
    />
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginTop: 28 }}>Visibility Benchmarks</div>
    <BenchmarkCard label="Profile Search Discoverability" yourScore={42} industryAvg={61} unit="/100" />
    <BenchmarkCard label="Hashtag Reach Coverage" yourScore={38} industryAvg={55} unit="%" />
    <BenchmarkCard label="Content Indexability Score" yourScore={71} industryAvg={65} unit="/100" />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
      <NarrativeCard eyebrow="Quick Win" headline="Keyword-optimise your bio and captions." body="Adding 2–3 primary keywords to your profile bio and the first line of each caption materially improves platform search ranking within 2–4 weeks." accent="#22c55e" />
      <NarrativeCard eyebrow="Strategic Priority" headline="Build a topic cluster authority structure." body="Identify 3 core topics your brand owns. Publish 80% of content within these clusters. Topic concentration accelerates algorithmic category authority faster than broad-topic posting." accent="#2563EB" />
    </div>
    <RiskCard level="medium" title="Hashtag Strategy Fragmentation" detail="Current hashtag usage is inconsistent across posts. A structured hashtag strategy (3 niche + 3 mid + 2 broad per post) consistently outperforms random hashtag selection." />
  </div>
);

const PANELS = {
  executive: ExecutivePanel,
  competitive: CompetitivePanel,
  audience: AudiencePanel,
  growth: GrowthPanel,
  content: ContentPanel,
  seo: SEOPanel,
};

/* ─── Main component ─── */
export default function DashboardInsights({ activeBrand }) {
  const [activeSubTab, setActiveSubTab] = useState("executive");
  const Panel = PANELS[activeSubTab] || ExecutivePanel;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 10 }}>
          Strategic Intelligence Center
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
          Brand Insights
        </h1>
        <p style={{ fontSize: 16, color: "#64748b", maxWidth: 680, lineHeight: 1.6 }}>
          Advisory intelligence for{" "}
          <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong>.
          Narrative-first analysis across six dimensions — no vanity metrics, only actionable strategy.
        </p>
      </div>

      {/* Sub-tab navigation */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 32,
        borderBottom: "1px solid #e5e9f0",
        paddingBottom: 0,
        overflowX: "auto",
      }}>
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`insights-tab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                color: isActive ? "#2563EB" : "#64748b",
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom: -1,
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              <i className={tab.icon} style={{ fontSize: 13 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <Panel activeBrand={activeBrand} />
    </div>
  );
}
