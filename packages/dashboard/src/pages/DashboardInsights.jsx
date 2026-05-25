import React, { useState } from "react";

const SUB_TABS = [
  { id: "executive",   label: "Executive Intelligence",   icon: "fas fa-chess-king" },
  { id: "competitive", label: "Competitive Intelligence", icon: "fas fa-binoculars" },
  { id: "audience",    label: "Audience Intelligence",    icon: "fas fa-users" },
  { id: "growth",      label: "Growth Intelligence",      icon: "fas fa-rocket" },
  { id: "content",     label: "Content Intelligence",     icon: "fas fa-file-alt" },
  { id: "seo",         label: "SEO & Visibility",         icon: "fas fa-search" },
];

/* ─── Shared card atoms ─── */

const NarrativeCard = ({ eyebrow, headline, body, accent = "#2563EB" }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: "28px 32px",
    border: "1px solid #e5e9f0", borderLeft: `5px solid ${accent}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)", marginBottom: 20,
  }}>
    {eyebrow && (
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 8 }}>
        {eyebrow}
      </div>
    )}
    <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{headline}</div>
    <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{body}</div>
  </div>
);

const RiskCard = ({ level, title, detail }) => {
  const colors = {
    high:   { bg: "#fff1f2", border: "#fca5a5", text: "#991b1b", dot: "#ef4444" },
    medium: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dot: "#f59e0b" },
    low:    { bg: "#f0fdf4", border: "#86efac", text: "#166534", dot: "#22c55e" },
  };
  const c = colors[level] || colors.medium;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.text }}>{level} priority</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
};

const OpportunityCard = ({ icon, title, potential, action }) => (
  <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f8faff 100%)", border: "1px solid #bfdbfe", borderRadius: 14, padding: "22px 26px", marginBottom: 14 }}>
    <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 5 }}>{title}</div>
    <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, marginBottom: 8 }}>{potential}</div>
    <div style={{ fontSize: 13, color: "#475569" }}>{action}</div>
  </div>
);

const ConnectBanner = ({ message = "Connect your social accounts to unlock personalized benchmarks and performance data." }) => (
  <div style={{
    background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12,
    padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12,
  }}>
    <span style={{ fontSize: 20, flexShrink: 0 }}>📊</span>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 3 }}>Unlock Personalized Insights</div>
      <div style={{ fontSize: 13, color: "#0c4a6e" }}>{message}</div>
    </div>
  </div>
);

/* ─── Sub-tab panels ─── */

const ExecutivePanel = ({ activeBrand }) => (
  <div>
    <NarrativeCard
      eyebrow="Executive Summary"
      headline={`${activeBrand?.name || "Your Brand"} — Strategic Position Overview`}
      body="Your content operation is in the foundation-building phase. The gap between content production and audience compounding is normal at this stage — closing it requires consistency, platform authority, and a structured content mix. Focus on the high-leverage steps below to accelerate your trajectory."
      accent="#2563EB"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
      <NarrativeCard eyebrow="Brand Momentum" headline="Build Through Consistency" body="Publishing frequency is the highest-leverage improvement available right now. Consistent cadence signals reliability to algorithms and builds audience expectation — both are compounding advantages." accent="#7c3aed" />
      <NarrativeCard eyebrow="Authority Position" headline="Authority Is Earned, Not Announced" body="Authority signals build through niche-specific, value-first content published consistently over time. Three months of focused, category-specific content is typically enough to cross the algorithmic amplification threshold." accent="#0891b2" />
    </div>
    <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Priority Focus Areas</div>
    <RiskCard level="high"   title="Publishing Consistency" detail="Irregular posting resets algorithmic momentum. Algorithms reward predictable cadence — gaps of 3+ days can suppress reach velocity significantly." />
    <RiskCard level="medium" title="Platform Diversification" detail="Over-reliance on a single platform creates vulnerability to algorithm shifts. A 2–3 platform strategy reduces exposure and amplifies reach." />
    <RiskCard level="low"    title="Content Format Mix" detail="Brands with mixed-format strategies (video + long-form + short-form) achieve compounding reach advantages. Diversifying formats is a medium-term priority." />
  </div>
);

const CompetitivePanel = () => (
  <div>
    <NarrativeCard
      eyebrow="Competitive Landscape"
      headline="Position Yourself in a Competitive Market"
      body="Top performers in most verticals publish 4–6× per week with consistent visual identity and strong conversion architecture. Building toward this cadence — even gradually — is the most reliable path to competitive positioning."
      accent="#7c3aed"
    />
    <ConnectBanner message="Connect your social accounts to see how your actual publishing frequency, engagement rate, and cross-platform presence compare to industry benchmarks." />
    <NarrativeCard
      eyebrow="Strategic Framework"
      headline="The 3-Layer Content Authority Stack"
      body="Leading brands use a 3-layer content strategy: Awareness content (broad reach, educates new audiences) → Authority content (deep expertise, earns trust and shares) → Conversion content (direct CTA, captures warm leads). Building all three layers creates a compounding content flywheel that generates results across the entire funnel."
      accent="#dc2626"
    />
    <NarrativeCard
      eyebrow="Competitive Gap"
      headline="Authority positioning is the primary differentiator."
      body="Most emerging brands produce awareness content well but underinvest in authority and conversion layers. Publishing 1–2 in-depth, expert-level pieces per month — case studies, frameworks, data-backed analysis — builds the authority layer that attracts media coverage, collaboration opportunities, and high-intent followers."
      accent="#7c3aed"
    />
  </div>
);

const AudiencePanel = () => (
  <div>
    <NarrativeCard
      eyebrow="Audience Intelligence"
      headline="Build an Audience That Compounds"
      body="Audience growth compounds when content is simultaneously valuable, consistent, and discoverable. Focus on these three dimensions together rather than optimising each in isolation — that's when growth rates accelerate non-linearly."
      accent="#0891b2"
    />
    <ConnectBanner message="Connect your social accounts to see real audience growth rate, trust scores, and engagement depth based on your actual content performance." />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
      <NarrativeCard eyebrow="Building Audience Trust" headline="Trust Is a Compounding Asset" body="Trust is built through consistency, evidence (results, case studies, testimonials), and value-first content. The key trust signal is reliably delivering content that makes the audience better — not selling to them." accent="#0891b2" />
      <NarrativeCard eyebrow="Audience Growth" headline="The Visibility Expansion Loop" body="Organic growth accelerates when content is shared by existing followers. Shareable content (strong opinions, original data, practical frameworks, honest stories) creates a distribution network beyond your existing base." accent="#7c3aed" />
    </div>
    <RiskCard level="medium" title="Referral Activation" detail="If your audience isn't sharing content, the content may be valuable but not shareable. Add a strong angle — a contrarian take, a surprising data point, or a framework — to trigger sharing behavior." />
    <RiskCard level="low"    title="Comment Depth" detail="Conversation-starting formats (polls, direct questions, bold takes) improve algorithm scoring and signal community health to both platforms and future followers." />
    <NarrativeCard eyebrow="30-Day Activation Opportunity" headline="Direct engagement is your fastest audience lever." body="For the next 30 days: ask a direct question in every post. Commit to responding to every comment within 2 hours. Mention specific followers who add value. These actions can double comment rates and signal to algorithms that your content creates community — which triggers broader distribution." accent="#22c55e" />
  </div>
);

const GrowthPanel = () => (
  <div>
    <NarrativeCard
      eyebrow="Growth Intelligence"
      headline="3 High-Leverage Growth Systems to Activate"
      body="Based on your current content footprint, these growth vectors offer the highest ROI opportunities. Each can be activated within your existing workflow with focused effort."
      accent="#22c55e"
    />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
      <OpportunityCard icon="🔁" title="Content Repurposing Engine" potential="Multiply reach without creating more" action="Convert your best-performing posts into 3 additional formats: carousel, short video, and long-form article. One idea, four pieces of content." />
      <OpportunityCard icon="🔗" title="Cross-Platform Amplification" potential="Extend content ROI across channels" action="Publish core content on your primary platform first, then adapt and republish on 2 secondary platforms within 48 hours of the original." />
      <OpportunityCard icon="📧" title="Email Capture Integration" potential="Highest-value conversion funnel" action="Add a value-based lead magnet linked from your top social profiles. Social-to-email is the most durable growth loop because you own the list." />
    </div>
    <NarrativeCard eyebrow="90-Day Growth Roadmap · Phase 1 (Days 1–30)" headline="Consistency Foundation" body="Lock in a non-negotiable publishing schedule: 4 posts per week minimum across 2 platforms. Use a content calendar to eliminate decision fatigue. Consistency is the growth multiplier — everything else amplifies on top of it." accent="#2563EB" />
    <NarrativeCard eyebrow="90-Day Growth Roadmap · Phase 2 (Days 31–60)" headline="Authority Stacking" body="Begin publishing 1 long-form authority post per week — a deep framework, data analysis, or case study. Authority content earns shares, backlinks, and media attention that short-form content alone cannot generate." accent="#7c3aed" />
    <NarrativeCard eyebrow="90-Day Growth Roadmap · Phase 3 (Days 61–90)" headline="Conversion Activation" body="Introduce conversion-layer content: testimonials, behind-the-scenes, direct offers, and proof-based content. The audience built in phases 1–2 is now warm enough to convert at significantly higher rates." accent="#22c55e" />
  </div>
);

const ContentPanel = () => (
  <div>
    <NarrativeCard
      eyebrow="Content Intelligence"
      headline="Build a Complete Content Ecosystem"
      body="Most brands excel in one content dimension while leaving others underserved. A complete content ecosystem spans informational (educates), emotional (connects), and conversion (motivates action) content. Each layer amplifies the others when combined consistently."
      accent="#f59e0b"
    />
    <ConnectBanner message="Connect your social accounts to see your actual content mix breakdown, top-performing formats, and engagement patterns from your published content." />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
      <div>
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Optimal Content Mix Target</div>
        {[
          { type: "Informational / Educational", target: "40%", color: "#2563EB",  note: "Builds trust and authority" },
          { type: "Inspirational / Emotional",   target: "30%", color: "#7c3aed",  note: "Drives sharing and loyalty" },
          { type: "Promotional / Conversion",    target: "20%", color: "#f59e0b",  note: "Generates leads and revenue" },
          { type: "Community / Engagement",      target: "10%", color: "#22c55e",  note: "Deepens relationships" },
        ].map(({ type, target, color, note }) => (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{type}</span>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{target} target</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{note}</div>
            <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99 }}>
              <div style={{ height: "100%", width: target, background: color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>High-Converting Formats</div>
        {[
          "Long-form educational posts",
          "Data-backed frameworks and how-to guides",
          "Case studies and results stories",
          "Behind-the-scenes and founder content",
          "User testimonials and social proof",
        ].map((f, i) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 4 ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", minWidth: 20 }}>#{i + 1}</span>
            <span style={{ fontSize: 13, color: "#334155" }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
    <NarrativeCard eyebrow="The 5-3-2 Rule" headline="A proven content balance framework." body="For every 10 posts: 5 should be curated/educational content that your audience finds valuable, 3 should be original thought-leadership from your brand perspective, and 2 should be promotional. This balance maximises reach while building authority and driving conversion." accent="#22c55e" />
  </div>
);

const SEOPanel = () => (
  <div>
    <NarrativeCard
      eyebrow="SEO & Visibility Intelligence"
      headline="Unlock the Platform Search Layer"
      body="Your social content can work twice as hard by being optimised for platform-internal search. Instagram, LinkedIn, TikTok, and Pinterest each have search algorithms that respond to keyword-rich captions, structured hashtag strategy, and engagement velocity. Optimising for these adds a compounding visibility layer to every post."
      accent="#0891b2"
    />
    <ConnectBanner message="Connect your social accounts to measure your actual search discoverability score, hashtag reach coverage, and content indexability against your industry." />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
      <NarrativeCard eyebrow="Quick Win" headline="Keyword-optimise your bio and first caption line." body="Adding 2–3 primary keywords to your profile bio and the first line of each caption materially improves platform search ranking within 2–4 weeks. Use the language your ideal customer uses to search for solutions." accent="#22c55e" />
      <NarrativeCard eyebrow="Strategic Priority" headline="Build a topic cluster authority structure." body="Choose 3 core topics your brand owns. Publish 80% of content within these clusters. Topic concentration accelerates algorithmic category authority faster than broad-topic posting — the platform learns what your account is about and amplifies it to relevant audiences." accent="#2563EB" />
    </div>
    <RiskCard level="medium" title="Hashtag Strategy" detail="A structured hashtag approach (3 niche + 3 mid-range + 2 broad per post) consistently outperforms random hashtag selection. Use your Hashtag Manager to build and reuse curated collections." />
    <NarrativeCard eyebrow="Visibility Framework" headline="The 3-Layer Hashtag Architecture" body="Niche hashtags (under 200K posts): highest relevance, easiest to rank in, best for converting engaged audiences. Mid-range (200K–2M posts): balance between reach and competition. Broad (2M+ posts): limited organic value but signals content category to the algorithm. Use all three layers consistently." accent="#0891b2" />
  </div>
);

const PANELS = {
  executive:   ExecutivePanel,
  competitive: CompetitivePanel,
  audience:    AudiencePanel,
  growth:      GrowthPanel,
  content:     ContentPanel,
  seo:         SEOPanel,
};

export default function DashboardInsights({ activeBrand }) {
  const [activeSubTab, setActiveSubTab] = useState("executive");
  const Panel = PANELS[activeSubTab] || ExecutivePanel;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 10 }}>
          Strategic Intelligence Center
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Brand Insights</h1>
        <p style={{ fontSize: 15, color: "#64748b", maxWidth: 660, lineHeight: 1.6 }}>
          Strategic advisory intelligence for{" "}
          <strong style={{ color: "#0f172a" }}>{activeBrand?.name || "your brand"}</strong>.
          Connect your platforms to unlock personalized benchmarks and real performance data.
        </p>
      </div>

      <div style={{
        display: "flex", gap: 4, marginBottom: 28,
        borderBottom: "1px solid #e5e9f0", paddingBottom: 0, overflowX: "auto",
      }}>
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                background: "none", border: "none",
                borderBottom: isActive ? "2px solid #2563EB" : "2px solid transparent",
                color: isActive ? "#2563EB" : "#64748b",
                fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
                whiteSpace: "nowrap", marginBottom: -1, transition: "color 0.2s, border-color 0.2s",
              }}
            >
              <i className={tab.icon} style={{ fontSize: 12 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Panel activeBrand={activeBrand} />
    </div>
  );
}
