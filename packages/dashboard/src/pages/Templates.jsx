import React, { useState } from "react";

const TEMPLATES = [
  {
    id: "tpl-01",
    category: "engagement",
    trigger: "Low Engagement",
    name: "Engagement Recovery Template",
    description: "Re-ignite audience interaction after a drop in engagement rate. Structured hooks, questions, and response prompts.",
    format: "Carousel + Poll",
    platforms: ["LinkedIn", "Instagram"],
    effort: "Medium",
    timeline: "3–5 days",
    expectedImpact: "20–40% engagement lift within 2 weeks",
    framework: [
      "Open with a bold statement or contrarian opinion your audience cares about",
      "Back it with one data point or real observation",
      "Ask a direct question — force a yes/no or binary choice",
      "Reply to every comment within the first hour of posting",
      "Follow up 3 days later with a summary of what your audience said",
    ],
    exampleHook: "Most [industry] teams get this backwards. Here's what we see instead...",
  },
  {
    id: "tpl-02",
    category: "authority",
    trigger: "Weak Authority Score",
    name: "Thought Leadership Template",
    description: "Establish category authority through structured opinion posts, data storytelling, and expert positioning.",
    format: "Long-form post + Thread",
    platforms: ["LinkedIn", "X"],
    effort: "High",
    timeline: "1–2 weeks",
    expectedImpact: "Profile visits up 30–60%; follower growth acceleration",
    framework: [
      "Pick one narrow topic you can speak on with genuine depth",
      "Share a non-obvious insight — not what everyone says, but what you've observed",
      "Add your reasoning: why this is true, what data or experience supports it",
      "Name the implication for your reader: what should they do differently?",
      "End with a prediction or challenge to the conventional view",
    ],
    exampleHook: "Here's the [industry] truth nobody talks about:",
  },
  {
    id: "tpl-03",
    category: "conversion",
    trigger: "Low Conversions",
    name: "Lead Generation Template",
    description: "Convert audience attention into qualified leads using value-first offers, proof points, and low-friction CTAs.",
    format: "Single image + Story",
    platforms: ["Instagram", "Facebook", "LinkedIn"],
    effort: "Medium",
    timeline: "5–7 days",
    expectedImpact: "2–5x increase in DM or link-click conversions",
    framework: [
      "Lead with the outcome, not the product (what they get, not what you sell)",
      "Show proof: a result, a number, a transformation in one sentence",
      "Remove the risk: what do they lose by not acting?",
      "Give a single, specific CTA — no multiple asks",
      "Add urgency that's real, not manufactured",
    ],
    exampleHook: "How [client type] went from [problem] to [result] in [timeframe]:",
  },
  {
    id: "tpl-04",
    category: "reach",
    trigger: "Audience Growth Slowing",
    name: "Reach Expansion Template",
    description: "Break out of your existing audience bubble by targeting discovery-phase content formats and share-worthy structures.",
    format: "Educational carousel + Reel",
    platforms: ["Instagram", "LinkedIn", "YouTube"],
    effort: "Medium",
    timeline: "1–2 weeks",
    expectedImpact: "30–80% reach increase; 15–25% new follower growth",
    framework: [
      "Pick a topic your target audience Googles or searches on social",
      "Structure it as '5 things most people get wrong about [topic]'",
      "Make it saveable — dense value in slide format",
      "Tag 2–3 relevant accounts or collaborators",
      "Post at your audience's peak activity window (check analytics)",
    ],
    exampleHook: "5 things I wish I knew before [common situation your audience faces]:",
  },
  {
    id: "tpl-05",
    category: "consistency",
    trigger: "Publishing Inconsistency",
    name: "Publishing System Template",
    description: "Build a sustainable content cadence with batch creation, content pillars, and a repeatable weekly structure.",
    format: "System framework",
    platforms: ["All platforms"],
    effort: "High",
    timeline: "2–3 weeks setup",
    expectedImpact: "Consistent publishing leads to 3–5x algorithmic reach over 30 days",
    framework: [
      "Define 3 content pillars (authority, engagement, conversion)",
      "Batch-create 2 weeks of content in one sitting",
      "Assign one post type per day of the week — don't decide day-of",
      "Use a single scheduling tool (myPilotPost) — no manual posting",
      "Review performance weekly and rotate the weakest pillar",
    ],
    exampleHook: "We publish 5× per week with 2 hours of total effort. Here's our exact system:",
  },
  {
    id: "tpl-06",
    category: "engagement",
    trigger: "Low Comments or Replies",
    name: "Community Activation Template",
    description: "Turn passive followers into active community participants through structured conversation-starting formats.",
    format: "Question post + Poll",
    platforms: ["LinkedIn", "Facebook", "Instagram"],
    effort: "Low",
    timeline: "Immediate",
    expectedImpact: "3–8x comment rate on posts that use this structure",
    framework: [
      "Ask one question with two specific options — avoid open-ended 'what do you think?'",
      "Share your own answer first to model the behavior",
      "Tag 2–3 people whose opinion you genuinely want",
      "Reply to every response within 2 hours",
      "Summarize the results 48 hours later as a follow-up post",
    ],
    exampleHook: "Quick poll: [Option A] or [Option B]? I'll share what we found...",
  },
  {
    id: "tpl-07",
    category: "authority",
    trigger: "Low Trust Signals",
    name: "Social Proof Template",
    description: "Build credibility through structured case studies, testimonials, and results-first storytelling.",
    format: "Before/after carousel + Video testimonial",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    effort: "Medium",
    timeline: "3–5 days",
    expectedImpact: "Improved DM conversion rate; reduced buying friction",
    framework: [
      "Open with the result — not the story (lead with the transformation)",
      "Name the starting problem as specifically as possible",
      "Describe the exact intervention or approach used",
      "Show the measurable outcome (number, timeframe, comparison)",
      "End with: 'This is what we help [target customer] do'",
    ],
    exampleHook: "[Client] went from [specific problem] to [specific result] in [timeframe]. Here's how:",
  },
  {
    id: "tpl-08",
    category: "reach",
    trigger: "Low Impressions",
    name: "Platform Optimization Template",
    description: "Adapt existing content to the native format of each platform to maximize algorithmic distribution.",
    format: "Multi-format adaptation",
    platforms: ["All platforms"],
    effort: "Low",
    timeline: "1 week",
    expectedImpact: "40–70% impression increase without creating new content",
    framework: [
      "Start with your best-performing post from the last 30 days",
      "LinkedIn: convert to a 5-slide document carousel",
      "Instagram: convert to a Reel with on-screen text (no talking required)",
      "X: break into a 5-tweet thread with one key insight per tweet",
      "Measure which format drove the most new-audience reach",
    ],
    exampleHook: "[Repurpose your top post — the framework is the same, the format changes everything]",
  },
  {
    id: "tpl-09",
    category: "conversion",
    trigger: "High Reach, Low Conversions",
    name: "CTA Optimization Template",
    description: "Fix the gap between content reach and action-taking by restructuring calls-to-action and offer framing.",
    format: "Post + Story sequence",
    platforms: ["Instagram", "LinkedIn", "Facebook"],
    effort: "Low",
    timeline: "Immediate",
    expectedImpact: "2–4x link click or DM rate improvement",
    framework: [
      "Never end a post with 'Let me know in the comments' — it's a dead end",
      "Give one CTA per post maximum — no options, no choices",
      "Make the next step obvious and low-friction ('DM me [word]', 'Link in bio > [page]')",
      "Test two CTA phrasings over 2 weeks — track which drives more action",
      "Match the CTA to where the reader is in the funnel (awareness ≠ purchase)",
    ],
    exampleHook: "If you want [specific outcome], DM me '[keyword]' and I'll send you [specific thing]:",
  },
  {
    id: "tpl-10",
    category: "authority",
    trigger: "No Content Strategy",
    name: "Content Pillar Template",
    description: "Build a repeatable content strategy based on three pillars that map to your business goals.",
    format: "Strategy framework",
    platforms: ["All platforms"],
    effort: "High",
    timeline: "2 weeks to build",
    expectedImpact: "Foundation for sustained growth — most accounts see 2× output with 50% less effort",
    framework: [
      "Pillar 1 (Awareness): educational content your audience searches for",
      "Pillar 2 (Trust): proof content — results, behind-the-scenes, process",
      "Pillar 3 (Conversion): offer-driven content with clear next steps",
      "Rotate: Mon=Awareness, Wed=Trust, Fri=Conversion — stick to it for 30 days",
      "After 30 days, review which pillar drove the most profile visits and leads",
    ],
    exampleHook: "[Use your content pillar framework as the meta-structure, not a single post hook]",
  },
  {
    id: "tpl-11",
    category: "engagement",
    trigger: "Declining Reach on Existing Platform",
    name: "Algorithm Recovery Template",
    description: "Recover from a reach drop caused by inconsistency, low engagement velocity, or format fatigue.",
    format: "High-velocity engagement sprint",
    platforms: ["LinkedIn", "Instagram"],
    effort: "High",
    timeline: "7–14 days",
    expectedImpact: "Reach recovery to pre-drop baseline within 2 weeks for most accounts",
    framework: [
      "Post daily for 14 consecutive days — no gaps",
      "First 3 days: pure engagement posts (questions, polls, opinions) — no selling",
      "Day 4–7: add one educational piece that showcases expertise",
      "Day 8–14: reintroduce conversion content at a 1:3 ratio",
      "Respond to every comment within 60 minutes for the first 7 days",
    ],
    exampleHook: "We dropped 60% reach in one week. Here's the exact recovery plan that brought it back:",
  },
  {
    id: "tpl-12",
    category: "conversion",
    trigger: "Long Sales Cycle",
    name: "Nurture Sequence Template",
    description: "Move warm leads from interest to decision through a structured multi-touch content sequence.",
    format: "Email + Social series",
    platforms: ["LinkedIn", "Email"],
    effort: "High",
    timeline: "3–4 weeks",
    expectedImpact: "30–50% faster conversion for nurtured leads vs. cold outreach",
    framework: [
      "Touch 1: educational content that names their problem precisely",
      "Touch 2: proof content — show someone like them getting results",
      "Touch 3: address the most common objection directly and honestly",
      "Touch 4: low-risk entry offer (audit, consultation, free resource)",
      "Touch 5: direct ask — clear, specific, no ambiguity",
    ],
    exampleHook: "[This is a sequence, not a single post — run it over 2–3 weeks]",
  },
];

const CATEGORY_COLORS = {
  engagement:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  authority:   { bg: "#faf5ff", border: "#e9d5ff", text: "#6d28d9", dot: "#8b5cf6" },
  conversion:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  reach:       { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  consistency: { bg: "#fdf4ff", border: "#f5d0fe", text: "#a21caf", dot: "#d946ef" },
};

const EFFORT_COLORS = {
  Low:    { bg: "#f0fdf4", text: "#15803d" },
  Medium: { bg: "#fff7ed", text: "#c2410c" },
  High:   { bg: "#fdf2f8", text: "#be185d" },
};

const SITUATION_MAP = {
  "Low Engagement":            "tpl-01",
  "Weak Authority Score":      "tpl-02",
  "Low Conversions":           "tpl-03",
  "Audience Growth Slowing":   "tpl-04",
  "Publishing Inconsistency":  "tpl-05",
  "Low Comments or Replies":   "tpl-06",
  "Low Trust Signals":         "tpl-07",
  "Low Impressions":           "tpl-08",
  "High Reach, Low Conversions": "tpl-09",
  "No Content Strategy":       "tpl-10",
  "Declining Reach":           "tpl-11",
  "Long Sales Cycle":          "tpl-12",
};

function TemplateCard({ tpl, expanded, onToggle }) {
  const cat = CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS.engagement;
  const eff = EFFORT_COLORS[tpl.effort] || EFFORT_COLORS.Medium;

  return (
    <div
      style={{
        border: `1px solid ${expanded ? cat.border : "#e5e7eb"}`,
        borderRadius: 16,
        background: expanded ? cat.bg : "#fff",
        marginBottom: 12,
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: expanded ? `0 0 0 2px ${cat.border}` : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "18px 20px",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: cat.dot, flexShrink: 0, marginTop: 2,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{tpl.name}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: cat.bg, color: cat.text, border: `1px solid ${cat.border}`,
            }}>{tpl.trigger}</span>
          </div>
          <span style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{tpl.description}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
            background: eff.bg, color: eff.text,
          }}>{tpl.effort} effort</span>
          <span style={{ color: "#9ca3af", fontSize: 18, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${cat.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "16px 0" }}>
            {[
              { label: "Format", value: tpl.format },
              { label: "Timeline", value: tpl.timeline },
              { label: "Expected Impact", value: tpl.expectedImpact },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Execution Framework
            </div>
            <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
              {tpl.framework.map((step, i) => (
                <li key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 6 }}>{step}</li>
              ))}
            </ol>
          </div>

          {tpl.exampleHook && (
            <div style={{
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "12px 16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Example Hook
              </div>
              <div style={{ fontSize: 14, color: "#1e293b", fontStyle: "italic", lineHeight: 1.6 }}>
                "{tpl.exampleHook}"
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tpl.platforms.map(p => (
              <span key={p} style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 99,
                background: "#f1f5f9", color: "#475569", fontWeight: 500,
              }}>{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Templates({ activeBrand }) {
  const [view, setView] = useState("recommended");
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const recommended = TEMPLATES.filter(t =>
    Object.values(SITUATION_MAP).includes(t.id)
      ? TEMPLATES.slice(0, 5).map(tt => tt.id).includes(t.id)
      : false
  );

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.trigger.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || t.category === filterCat;
    return matchSearch && matchCat;
  });

  const displayList = view === "recommended" ? TEMPLATES.slice(0, 5) : filtered;

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>
              Content Templates
            </h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
              Proven frameworks for every growth situation. Pick your scenario, follow the steps.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 20, background: "#f3f4f6", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {[
            { id: "recommended", label: "Recommended" },
            { id: "all", label: "Browse All (12)" },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setView(tab.id); setExpanded(null); }}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                background: view === tab.id ? "#fff" : "transparent",
                color: view === tab.id ? "#111827" : "#6b7280",
                boxShadow: view === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended view */}
      {view === "recommended" && (
        <div>
          <div style={{
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            border: "1px solid #bae6fd", borderRadius: 14, padding: "14px 18px",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0369a1" }}>
                Top 5 high-impact templates
              </div>
              <div style={{ fontSize: 13, color: "#0284c7" }}>
                Selected based on the most common growth scenarios. Connect platforms for personalized recommendations based on your actual data.
              </div>
            </div>
          </div>

          {TEMPLATES.slice(0, 5).map(tpl => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              expanded={expanded === tpl.id}
              onToggle={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
            />
          ))}
        </div>
      )}

      {/* Browse All view */}
      {view === "all" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              style={{
                padding: "8px 14px", border: "1px solid #e5e7eb", borderRadius: 8,
                fontSize: 13, outline: "none", minWidth: 200, flex: 1, maxWidth: 280,
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All" },
                { id: "engagement", label: "Engagement" },
                { id: "authority", label: "Authority" },
                { id: "conversion", label: "Conversion" },
                { id: "reach", label: "Reach" },
                { id: "consistency", label: "Consistency" },
              ].map(cat => {
                const colors = cat.id !== "all" ? CATEGORY_COLORS[cat.id] : null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setFilterCat(cat.id); setExpanded(null); }}
                    style={{
                      padding: "6px 14px", borderRadius: 99, border: "1px solid",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      borderColor: filterCat === cat.id ? (colors?.border || "#6b7280") : "#e5e7eb",
                      background: filterCat === cat.id ? (colors?.bg || "#f3f4f6") : "#fff",
                      color: filterCat === cat.id ? (colors?.text || "#374151") : "#6b7280",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15 }}>No templates match your search</div>
            </div>
          ) : (
            filtered.map(tpl => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                expanded={expanded === tpl.id}
                onToggle={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Situation finder */}
      <div style={{
        marginTop: 32, border: "1px solid #e5e7eb", borderRadius: 16,
        padding: "20px 24px", background: "#fafafa",
      }}>
        <h4 style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>
          Find a template by situation
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(SITUATION_MAP).map(([situation, tplId]) => (
            <button
              key={situation}
              type="button"
              onClick={() => {
                setView("all");
                setFilterCat("all");
                setSearch("");
                setExpanded(tplId);
              }}
              style={{
                padding: "6px 14px", borderRadius: 99, border: "1px solid #e5e7eb",
                background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer",
                fontWeight: 500, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#4f46e5"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
            >
              {situation}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
