import React, { useState, useEffect } from "react";
import { apiRequest } from "../lib/api/client";

// ── Content Ideas (20 frameworks, never shown as "frameworks") ────────────────

const CONTENT_IDEAS = [
  {
    id: 1, name: "Myth vs Reality",
    use_case: "Build authority by dismantling the biggest lie in your industry.",
    platforms: ["LinkedIn", "X", "Instagram"],
    preview: 'Myth: "[common belief in your industry]"\n\nReality: [the truth most people miss]\n\nHere\'s why this changes everything...',
    previewTheme: "post-contrast",
    previewBg: "#0f172a",
    postLabel: "MYTH VS REALITY",
    topLabel: "MYTH", topText: '"The cheapest quote saves money."', topBg: "rgba(255,255,255,0.06)", topColor: "#94a3b8",
    botLabel: "REALITY", botText: "The cheapest is often the most expensive mistake.", botBg: "rgba(245,158,11,0.12)", botColor: "#fbbf24",
    accent: "#f59e0b",
  },
  {
    id: 2, name: "Behind The Scenes",
    use_case: "Humanise your brand by showing what clients never see.",
    platforms: ["Instagram", "TikTok", "Facebook"],
    preview: "What [your process] actually looks like:\n\n→ Step 1: [real step]\n→ Step 2: [real step]\n→ The part nobody shows: [insight]\n\nMost people only see the result.",
    previewTheme: "post-steps",
    accent: "#38bdf8",
    previewBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    previewBadge: "BTS",
    previewHeadline: "What nobody shows you",
    previewSteps: ["→ Research: 45 min", "→ Drafting: 20 min", "→ The part nobody talks about"],
  },
  {
    id: 3, name: "Mistakes To Avoid",
    use_case: "Position yourself as the expert by saving your audience from costly errors.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    preview: "The most expensive mistake I see [audience] make:\n\n[describe the mistake]\n\nHere's what to do instead:\n1. [fix 1]\n2. [fix 2]\n3. [fix 3]",
    previewTheme: "post-list",
    accent: "#dc2626",
    previewBg: "#fff1f2",
    previewTitle: "3 Mistakes to Avoid",
    previewItems: ["✗ Hiring before validating", "✗ Optimising too early", "✗ Skipping the boring bits"],
  },
  {
    id: 4, name: "Before & After",
    use_case: "Let the transformation speak — before and after with real numbers.",
    platforms: ["Instagram", "Facebook", "TikTok"],
    preview: "Before:\n✗ [pain point 1]\n✗ [pain point 2]\n\nAfter 90 days:\n✓ [result 1]\n✓ [result 2]\n\n[brief story of the transformation]",
    previewTheme: "post-contrast",
    previewBg: "#0f172a",
    postLabel: "BEFORE → AFTER",
    topLabel: "BEFORE", topText: "✗ 3h per post\n✗ Low reach", topBg: "rgba(220,38,38,0.15)", topColor: "#fca5a5",
    botLabel: "AFTER", botText: "✓ 20 posts/week\n✓ 3× reach", botBg: "rgba(5,150,105,0.15)", botColor: "#6ee7b7",
    accent: "#059669",
  },
  {
    id: 5, name: "Customer Story",
    use_case: "Turn a client win into social proof that builds instant trust.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    preview: "When [customer] came to us, they were struggling with [problem].\n\nHere's what changed:\n[story in 3-4 punchy lines]\n\nResult: [specific outcome]",
    previewTheme: "post-quote",
    accent: "#7c3aed",
    previewBg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    previewQuote: '"Moving in 16 hours. Zero stress. Exactly what we needed."',
    previewAttr: "— Sarah M., Client",
  },
  {
    id: 6, name: "FAQ",
    use_case: "Reduce buying friction by answering the question everyone's afraid to ask.",
    platforms: ["Instagram", "LinkedIn", "YouTube"],
    preview: "The question I get asked every week:\n\n\"[exact question]\"\n\nThe honest answer: [direct, specific response]\n\nHere's the full breakdown...",
    previewTheme: "post-qa",
    accent: "#2563eb",
    previewBg: "#eff6ff",
    previewSetup: "The question I get every week:",
    previewQ: "How long does onboarding take?",
    previewA: "48 hours. Not weeks. Here's exactly what happens on Day 1.",
  },
  {
    id: 7, name: "Industry Prediction",
    use_case: "Stake your authority with a bold call on where the industry is heading.",
    platforms: ["LinkedIn", "X", "YouTube"],
    preview: "My prediction for [industry] in the next 12 months:\n\n[bold prediction]\n\nHere's what I'm seeing:\n→ [signal 1]\n→ [signal 2]\n\nWhat this means for you...",
    previewTheme: "post-statement",
    accent: "#d97706",
    previewBg: "linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)",
    previewLabel: "PREDICTION",
    previewStatement: "AI will kill the mid-market SaaS by Q4.",
    previewSub: "Here's what I'm seeing across 50+ companies →",
  },
  {
    id: 8, name: "Unpopular Opinion",
    use_case: "Spark debate and stand out by saying what most people won't.",
    platforms: ["LinkedIn", "X", "Instagram"],
    preview: "Unpopular opinion: [bold, specific claim]\n\nEveryone says [conventional view].\n\nBut here's what I've actually seen:\n[your real experience]\n\n[defend your position]",
    previewTheme: "post-statement",
    accent: "#ef4444",
    previewBg: "linear-gradient(135deg, #1e0a0a 0%, #450a0a 100%)",
    previewLabel: "UNPOPULAR OPINION",
    previewStatement: "Hustle culture is killing your business.",
    previewSub: "Slow strategy beats fast burnout. Every. Time.",
  },
  {
    id: 9, name: "Problem / Solution",
    use_case: "Connect your offer to a real pain — problem named, solution delivered.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    preview: "The problem: [specific pain point]\n\nWhy most approaches fail: [common mistake]\n\nWhat actually works: [your solution]\n\nThe result: [measurable outcome]",
    previewTheme: "post-contrast",
    previewBg: "#0f172a",
    postLabel: "PROBLEM → SOLUTION",
    topLabel: "PROBLEM", topText: "Creating content no one reads.", topBg: "rgba(220,38,38,0.15)", topColor: "#fca5a5",
    botLabel: "SOLUTION", botText: "Write for one person. Publish for thousands.", botBg: "rgba(5,150,105,0.15)", botColor: "#6ee7b7",
    accent: "#059669",
  },
  {
    id: 10, name: "Founder Insight",
    use_case: "Share the hard-won lesson that changed how you run the business.",
    platforms: ["LinkedIn", "Instagram", "TikTok"],
    preview: "3 years ago I made a decision that changed how we operate.\n\n[brief story setup]\n\nWhat I learned: [specific insight]\n\nHow we applied it: [what changed]\n\nResult: [outcome]",
    previewTheme: "post-quote",
    accent: "#0891b2",
    previewBg: "linear-gradient(135deg, #0c1a2e 0%, #0f2744 100%)",
    previewQuote: '"The decision that tripled revenue was saying no more than yes."',
    previewAttr: "— Founder, 3 years in",
  },
  {
    id: 11, name: "Top Tips",
    use_case: "Drive saves and shares with a list your audience will bookmark.",
    platforms: ["Instagram", "LinkedIn", "Pinterest"],
    preview: "5 things I wish someone told me about [topic]:\n\n1. [specific tip]\n2. [specific tip]\n3. [specific tip]\n4. [specific tip]\n5. [specific tip]\n\nSave this for later.",
    previewTheme: "post-list",
    accent: "#059669",
    previewBg: "#f0fdf4",
    previewTitle: "5 Things Nobody Tells You",
    previewItems: ["1. Never anchor low", "2. Your rate is a signal", "3. Silence after quoting"],
  },
  {
    id: 12, name: "Checklist",
    use_case: "Give them a checklist they screenshot, save, and share.",
    platforms: ["Instagram", "Pinterest", "LinkedIn"],
    preview: "The [topic] checklist:\n\n☐ [step 1]\n☐ [step 2]\n☐ [step 3]\n☐ [step 4]\n☐ [step 5]\n\nBookmark this. You'll need it.",
    previewTheme: "post-list",
    accent: "#4f46e5",
    previewBg: "#f5f3ff",
    previewTitle: "Pre-Launch Checklist",
    previewItems: ["☐ Email sequence live", "☐ Landing page tested", "☐ Waitlist automated"],
  },
  {
    id: 13, name: "Lessons Learned",
    use_case: "Teach what took you years to learn — in under 60 seconds.",
    platforms: ["LinkedIn", "Instagram", "TikTok"],
    preview: "If I could go back 3 years, I'd tell myself:\n\n[Lesson 1] — because [why]\n[Lesson 2] — because [why]\n[Lesson 3] — because [why]\n\nSave yourself the detour.",
    previewTheme: "post-quote",
    accent: "#6d28d9",
    previewBg: "linear-gradient(135deg, #1a0533 0%, #2e1065 100%)",
    previewQuote: '"Don\'t optimise what you haven\'t validated yet."',
    previewAttr: "— What I wish I knew 2 years ago",
  },
  {
    id: 14, name: "Common Questions",
    use_case: "Eliminate sales friction by answering the top 3 questions before they're asked.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    preview: "The 3 questions I get from every new client:\n\nQ1: [question]\nA: [honest answer]\n\nQ2: [question]\nA: [honest answer]\n\nQ3: [question]\nA: [honest answer]",
    previewTheme: "post-qa",
    accent: "#0891b2",
    previewBg: "#ecfeff",
    previewSetup: "The 3 questions every new client asks:",
    previewQ: "Is this right for me?",
    previewA: "Yes — built for exactly where you are right now.",
  },
  {
    id: 15, name: "Industry Reaction",
    use_case: "React fast to industry news with a sharp, specific point of view.",
    platforms: ["LinkedIn", "X", "YouTube"],
    preview: "[Industry news or trend] just happened.\n\nHere's what it actually means for [your audience]:\n\n→ [implication 1]\n→ [implication 2]\n\nMy take: [your specific opinion]",
    previewTheme: "post-statement",
    accent: "#d97706",
    previewBg: "linear-gradient(135deg, #1c1400 0%, #292100 100%)",
    previewLabel: "BREAKING",
    previewStatement: "Google just changed how content ranks.",
    previewSub: "Here's what it means for your brand →",
  },
  {
    id: 16, name: "Case Study",
    use_case: "Lead with the numbers — client challenge, process, and result.",
    platforms: ["LinkedIn", "Facebook", "YouTube"],
    preview: "Client: [industry/type]\nChallenge: [specific problem]\nApproach: [what we did in 3 steps]\nResult: [numbers + outcome]\n\nThe part most people skip: [real insight]",
    previewTheme: "post-metrics",
    accent: "#2563eb",
    previewBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    previewHeadline: "From 0 to 47 qualified leads",
    previewMetrics: [{ label: "Leads", val: "47" }, { label: "Weeks", val: "6" }, { label: "ROI", val: "3.2×" }],
    previewCaption: "B2B SaaS · Content-led growth",
  },
  {
    id: 17, name: "Trend Analysis",
    use_case: "Break down the trend everyone's talking about — and what it actually means.",
    platforms: ["LinkedIn", "YouTube", "X"],
    preview: "The trend everyone in [industry] is talking about:\n\n[Name the trend]\n\nWhy it's actually happening: [real reason]\n\nWhat it means for you:\n→ [implication 1]\n→ [implication 2]",
    previewTheme: "post-statement",
    accent: "#6366f1",
    previewBg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    previewLabel: "TREND ANALYSIS",
    previewStatement: "Distribution > Creation. Here's why.",
    previewSub: "The shift nobody in marketing is talking about →",
  },
  {
    id: 18, name: "Community Question",
    use_case: "Spark a comment section by asking the question your audience is thinking.",
    platforms: ["Instagram", "Facebook", "LinkedIn"],
    preview: "I'm curious: [specific question that reveals something about your audience]\n\nFor us, [share your own take to spark discussion].\n\nWhat about you?",
    previewTheme: "post-qa",
    accent: "#059669",
    previewBg: "#f0fdf4",
    previewSetup: "I'm curious...",
    previewQ: "What moved the needle most for you this year?",
    previewA: "Drop your answer below — I'll compile the top responses.",
  },
  {
    id: 19, name: "Success Story",
    use_case: "Celebrate the milestone and tell the messy, honest story behind it.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    preview: "[The milestone] just happened.\n\nBut the real story is how we got here:\n\n[start point] → [key decision] → [today]\n\nThe lesson: [what it means]",
    previewTheme: "post-metrics",
    accent: "#16a34a",
    previewBg: "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
    previewHeadline: "We just hit 1,000 customers",
    previewMetrics: [{ label: "Customers", val: "1K" }, { label: "Years", val: "3" }, { label: "Growth", val: "12×" }],
    previewCaption: "The milestone. The story behind it.",
  },
  {
    id: 20, name: "Quick Win",
    use_case: "Give them one thing they can implement today and see a result from.",
    platforms: ["Instagram", "LinkedIn", "TikTok"],
    preview: "One thing you can do today to [desired outcome]:\n\n[The action — specific, simple, doable in under 30 min]\n\nWhy it works: [brief explanation]\n\nResult you'll see: [realistic outcome]",
    previewTheme: "post-qa",
    accent: "#f59e0b",
    previewBg: "#fffbeb",
    previewSetup: "One thing you can do today:",
    previewQ: "Rewrite your hero headline.",
    previewA: "Make it outcome-focused. Higher CTR within 48 hours.",
  },
];

// ── Content Packs ─────────────────────────────────────────────────────────────

const CONTENT_PACKS = [
  {
    id: "product-launch",
    name: "Product Launch",
    desc: "A complete content pack to announce and amplify your next product or service launch.",
    includes: ["Launch Announcement", "Behind-the-Scenes Build-up", "Social Proof Posts", "Countdown Content", "Post-Launch Recap"],
    platforms: ["Instagram", "LinkedIn", "Facebook"],
    accent: "#7c3aed",
    icon: "fas fa-rocket",
  },
  {
    id: "brand-awareness",
    name: "Brand Awareness",
    desc: "Build reach and recognition with content designed to introduce your brand to new audiences.",
    includes: ["Brand Story Posts", "Value Proposition Content", "Thought Leadership", "Reach-Optimised Hooks", "Platform-Specific Angles"],
    platforms: ["Instagram", "TikTok", "LinkedIn"],
    accent: "#2563eb",
    icon: "fas fa-bullseye",
  },
  {
    id: "lead-generation",
    name: "Lead Generation",
    desc: "Convert attention into qualified enquiries with high-converting content angles and CTAs.",
    includes: ["Lead Magnet Posts", "Problem-Solution Content", "CTA Sequences", "FAQ Content", "Offer-Framing Posts"],
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    accent: "#059669",
    icon: "fas fa-funnel-dollar",
  },
  {
    id: "authority-building",
    name: "Authority Building",
    desc: "Position your brand as the definitive expert and trusted voice in your category.",
    includes: ["Industry Predictions", "Unpopular Opinions", "Case Study Posts", "Trend Analysis", "Expert Reactions"],
    platforms: ["LinkedIn", "YouTube", "X"],
    accent: "#d97706",
    icon: "fas fa-crown",
  },
  {
    id: "customer-stories",
    name: "Customer Stories",
    desc: "Turn real client results into trust-building content that does the selling for you.",
    includes: ["Before & After Posts", "Client Quote Cards", "Case Study Breakdowns", "Result Announcements", "Testimonial Sequences"],
    platforms: ["LinkedIn", "Instagram", "Facebook"],
    accent: "#dc2626",
    icon: "fas fa-star",
  },
];

// ── Canva Design Types ────────────────────────────────────────────────────────

const DESIGN_TYPES = [
  { label: "Instagram Post",      url: "https://www.canva.com/create/instagram-posts/",    icon: "fab fa-instagram" },
  { label: "Instagram Carousel",  url: "https://www.canva.com/create/instagram-carousel/", icon: "fas fa-images" },
  { label: "Instagram Story",     url: "https://www.canva.com/create/instagram-stories/",  icon: "fas fa-mobile-alt" },
  { label: "LinkedIn Post",       url: "https://www.canva.com/create/linkedin-posts/",     icon: "fab fa-linkedin" },
  { label: "Facebook Post",       url: "https://www.canva.com/create/facebook-posts/",     icon: "fab fa-facebook" },
  { label: "Presentation",        url: "https://www.canva.com/create/presentations/",      icon: "fas fa-desktop" },
];

// ── Library Helpers ───────────────────────────────────────────────────────────

const libKey = (brandId) => `mpp_library_${brandId}`;

function getLibrary(brandId) {
  try { return JSON.parse(localStorage.getItem(libKey(brandId)) || "[]"); }
  catch { return []; }
}

function saveToLibrary(brandId, item) {
  try {
    const existing = getLibrary(brandId);
    const next = [item, ...existing].slice(0, 100);
    localStorage.setItem(libKey(brandId), JSON.stringify(next));
  } catch {}
}

function deleteFromLibrary(brandId, itemId) {
  try {
    const next = getLibrary(brandId).filter(i => i.id !== itemId);
    localStorage.setItem(libKey(brandId), JSON.stringify(next));
  } catch {}
}

// ── Daily Post Limit ──────────────────────────────────────────────────────────

const POST_DAILY_LIMIT = 3;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getPostCount(brandId) {
  try { return parseInt(localStorage.getItem(`mpp_post_gen_${brandId}_${todayStr()}`) || "0", 10); }
  catch { return 0; }
}

function incPostCount(brandId) {
  try { localStorage.setItem(`mpp_post_gen_${brandId}_${todayStr()}`, String(getPostCount(brandId) + 1)); }
  catch {}
}

function genId() {
  return crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ── Shared Styles ─────────────────────────────────────────────────────────────

const SPIN_CSS = `
@keyframes mpp-spin { to { transform: rotate(360deg) } }
@keyframes mpp-card-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
`;

const MODAL_OVERLAY = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};

const MODAL_BOX = {
  background: "#fff", borderRadius: 20, width: "100%", maxWidth: 600,
  maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
};

// ── Tab Pills ─────────────────────────────────────────────────────────────────

function TabPills({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer",
          fontSize: 13, fontWeight: active === t.id ? 700 : 500,
          background: active === t.id ? "#fff" : "transparent",
          color: active === t.id ? "#111827" : "#6b7280",
          boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
          transition: "all 0.15s",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Post Visual Preview ───────────────────────────────────────────────────────

function PostPreview({ fw }) {
  const h = 240;

  if (fw.previewTheme === "post-contrast") {
    return (
      <div style={{ height: h, background: fw.previewBg || "#0f172a", display: "flex", flexDirection: "column", padding: 14, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: fw.accent, background: "rgba(255,255,255,0.08)", borderRadius: 99, padding: "3px 10px", letterSpacing: 2, textTransform: "uppercase" }}>
            {fw.postLabel}
          </span>
        </div>
        <div style={{ flex: 1, background: fw.topBg, borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: fw.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{fw.topLabel}</div>
          <div style={{ fontSize: 12, color: fw.topColor, lineHeight: 1.4, whiteSpace: "pre-line" }}>{fw.topText}</div>
        </div>
        <div style={{ flex: 1, background: fw.botBg, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: fw.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{fw.botLabel}</div>
          <div style={{ fontSize: 12, color: fw.botColor, lineHeight: 1.4, whiteSpace: "pre-line" }}>{fw.botText}</div>
        </div>
        <div style={{ textAlign: "right", marginTop: 6, fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>@yourbrand</div>
      </div>
    );
  }

  if (fw.previewTheme === "post-steps") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 16px", gap: 8, position: "relative" }}>
        <span style={{ position: "absolute", top: 12, right: 14, fontSize: 9, fontWeight: 900, color: fw.accent, background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 7px", letterSpacing: 1.5, textTransform: "uppercase" }}>
          {fw.previewBadge}
        </span>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", lineHeight: 1.25, marginBottom: 4 }}>{fw.previewHeadline}</div>
        <div style={{ width: 28, height: 2, background: fw.accent, borderRadius: 2, marginBottom: 4 }} />
        {fw.previewSteps.map((s, i) => (
          <div key={i} style={{ fontSize: 12, color: fw.accent, fontWeight: 600, lineHeight: 1.4 }}>{s}</div>
        ))}
        <div style={{ position: "absolute", bottom: 10, right: 14, fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>@yourbrand</div>
      </div>
    );
  }

  if (fw.previewTheme === "post-quote") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 16px", position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 80, color: "rgba(255,255,255,0.07)", fontFamily: "Georgia,serif", lineHeight: 0.8, position: "absolute", top: 4, left: 10, userSelect: "none" }}>"</div>
        <div style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.6, fontStyle: "italic", position: "relative", zIndex: 1, marginBottom: 14 }}>
          {fw.previewQuote}
        </div>
        <div style={{ width: 32, height: 2, background: fw.accent, borderRadius: 2, marginBottom: 8 }} />
        <div style={{ fontSize: 11, color: fw.accent, fontWeight: 700, letterSpacing: 0.3 }}>{fw.previewAttr}</div>
        <div style={{ position: "absolute", bottom: 10, right: 14, fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>@yourbrand</div>
      </div>
    );
  }

  if (fw.previewTheme === "post-statement") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 16px", gap: 10, position: "relative" }}>
        <span style={{ fontSize: 8, fontWeight: 900, color: fw.accent, letterSpacing: 3, textTransform: "uppercase" }}>{fw.previewLabel}</span>
        <div style={{ width: 28, height: 2, background: fw.accent, borderRadius: 2 }} />
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f8fafc", lineHeight: 1.25 }}>{fw.previewStatement}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>{fw.previewSub}</div>
        <div style={{ position: "absolute", bottom: 10, right: 14, fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>@yourbrand</div>
      </div>
    );
  }

  if (fw.previewTheme === "post-list") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 8 }}>{fw.previewTitle}</div>
        <div style={{ width: "100%", height: 2, background: fw.accent, borderRadius: 2, marginBottom: 10, opacity: 0.7 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          {fw.previewItems.map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: "#374151", fontWeight: 600, lineHeight: 1.35 }}>{item}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: fw.accent, fontWeight: 700 }}>Save this →</span>
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>@yourbrand</span>
        </div>
      </div>
    );
  }

  if (fw.previewTheme === "post-qa") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", padding: 14, gap: 8 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 2 }}>{fw.previewSetup}</div>
        <div style={{ background: "#fff", borderRadius: 8, padding: "9px 11px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flex: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: fw.accent, textTransform: "uppercase", letterSpacing: 1 }}>Q</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.4, marginTop: 2 }}>{fw.previewQ}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 11px", flex: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>A</span>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.45, marginTop: 2 }}>{fw.previewA}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>@yourbrand</div>
      </div>
    );
  }

  if (fw.previewTheme === "post-metrics") {
    return (
      <div style={{ height: h, background: fw.previewBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: 16, gap: 12, position: "relative" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", lineHeight: 1.35 }}>{fw.previewHeadline}</div>
        <div style={{ width: 28, height: 2, background: fw.accent, borderRadius: 2 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {fw.previewMetrics.map((m, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: fw.accent, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 3, letterSpacing: 0.5 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{fw.previewCaption}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>@yourbrand</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: h, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 24, color: fw.accent }}><i className="fas fa-file-alt" /></span>
    </div>
  );
}

// ── Create Design Modal ───────────────────────────────────────────────────────

function CreateDesignModal({ onClose }) {
  return (
    <div style={MODAL_OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 440 }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Create Design</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>Choose your design type</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px", lineHeight: 1.6 }}>
            Opens in Canva so you can design, customise, and publish directly.
          </p>
          {DESIGN_TYPES.map(dt => (
            <a
              key={dt.label}
              href={dt.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10,
                border: "1px solid #e5e7eb", background: "#faf5ff",
                color: "#7c3aed", fontWeight: 600, fontSize: 14,
                textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f3e8ff"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#faf5ff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >
              <i className={dt.icon} style={{ fontSize: 16, width: 20, textAlign: "center" }} />
              {dt.label}
              <i className="fas fa-external-link-alt" style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Post Modal ────────────────────────────────────────────────────────────────

function PostModal({ idea, brandId, onClose, onSaved }) {
  const count   = getPostCount(brandId);
  const atLimit = count >= POST_DAILY_LIMIT;
  const [step, setStep]     = useState(atLimit ? "limit_reached" : "idle");
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState("");
  const [designModal, setDesignModal] = useState(false);

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const data = await apiRequest("/api/customer/templates/generate-post", {
        method: "POST",
        body: JSON.stringify({ framework: idea.name }),
      });
      incPostCount(brandId);
      setResult(data);
      setStep("success");
      onSaved({ type: "post", framework: idea.name, content: data });
    } catch (e) {
      if (e.status === 429) setStep("limit_reached");
      else { setErr(e.message || "Failed. Please try again."); setStep("error"); }
    }
  }

  const remaining = Math.max(0, POST_DAILY_LIMIT - count);

  return (
    <>
      <div style={MODAL_OVERLAY}>
        <div style={{ ...MODAL_BOX, maxWidth: 580 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Content Idea</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#111827" }}>{idea.name}</div>
            </div>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <div style={{ padding: "20px 24px 28px" }}>
            {step === "idle" && (
              <>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>What this creates</div>
                  <div style={{ fontSize: 14, color: "#374151" }}>{idea.use_case}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                  {idea.platforms.map(p => (
                    <span key={p} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
                  {remaining} of {POST_DAILY_LIMIT} generations remaining today
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={generate} style={{
                    flex: 1, padding: "14px 0", borderRadius: 10,
                    background: "linear-gradient(135deg, #059669, #047857)",
                    color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
                  }}>
                    Generate Post
                  </button>
                  <button type="button" onClick={() => setDesignModal(true)} style={{
                    padding: "14px 18px", borderRadius: 10,
                    background: "#faf5ff", border: "1px solid #c4b5fd",
                    color: "#7c3aed", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    Create Design
                  </button>
                </div>
              </>
            )}

            {step === "generating" && (
              <div style={{ textAlign: "center", padding: "52px 0" }}>
                <style>{SPIN_CSS}</style>
                <div style={{ width: 40, height: 40, border: "3px solid #d1fae5", borderTopColor: "#059669", borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Generating your post...</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Using your Brand DNA and intelligence data.</div>
              </div>
            )}

            {step === "error" && (
              <>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>{err}</div>
                <button type="button" onClick={() => setStep("idle")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Try Again</button>
              </>
            )}

            {step === "limit_reached" && (
              <div style={{ textAlign: "center", padding: "44px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>⏰</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Daily limit reached</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7 }}>
                  You've used your {POST_DAILY_LIMIT} daily generations.<br />Come back tomorrow for more.
                </div>
              </div>
            )}

            {step === "success" && result && (
              <>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#16a34a", fontSize: 18 }}>✓</span>
                  <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>Saved to your Library</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {[
                    { label: "Post Angle",  value: result.post_angle },
                    { label: "Hook",        value: result.suggested_hook },
                    { label: "Key Message", value: result.key_message },
                    { label: "CTA",         value: result.suggested_cta },
                    { label: "Visual Type", value: result.visual_type },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.65 }}>{value}</div>
                    </div>
                  ) : null)}
                  {result.post_structure?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Post Structure</div>
                      <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
                        {result.post_structure.map((s, i) => (
                          <li key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 5 }}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setDesignModal(true)} style={{
                    flex: 1, padding: "12px 0", borderRadius: 10,
                    background: "#faf5ff", border: "1px solid #c4b5fd",
                    color: "#7c3aed", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    Create Design
                  </button>
                  <button type="button" onClick={onClose} style={{
                    padding: "12px 20px", borderRadius: 10,
                    background: "#f3f4f6", color: "#374151", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
                  }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {designModal && <CreateDesignModal onClose={() => setDesignModal(false)} />}
    </>
  );
}

// ── Pack Modal ────────────────────────────────────────────────────────────────

function PackModal({ pack, brandId, onClose, onSaved }) {
  const [step, setStep] = useState("idle");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const data = await apiRequest("/api/customer/templates/generate-recommendation", {
        method: "POST",
        body: JSON.stringify({ goal: pack.name }),
      });
      setResult(data);
      setStep("success");
      onSaved({ type: "pack", packId: pack.id, packName: pack.name, content: data });
    } catch (e) {
      setErr(e.message || "Failed to generate. Please try again.");
      setStep("error");
    }
  }

  return (
    <div style={MODAL_OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 580 }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: pack.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Content Pack</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#111827" }}>{pack.name}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {step === "idle" && (
            <>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{pack.desc}</div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>What's included</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pack.includes.map(item => (
                    <span key={item} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 99, background: "#f0f4ff", color: "#4338ca", border: "1px solid #c7d2fe", fontWeight: 500 }}>{item}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12, marginBottom: 20 }}>
                {pack.platforms.map(p => (
                  <span key={p} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 20 }}>
                AI will generate post ideas, content angles, hooks, CTAs, and visual recommendations — all tailored to your brand.
              </p>
              <button type="button" onClick={generate} style={{
                width: "100%", padding: "14px 0", borderRadius: 10,
                background: `linear-gradient(135deg, ${pack.accent}, ${pack.accent}cc)`,
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Generate Pack
              </button>
            </>
          )}

          {step === "generating" && (
            <div style={{ textAlign: "center", padding: "52px 0" }}>
              <style>{SPIN_CSS}</style>
              <div style={{ width: 40, height: 40, border: `3px solid ${pack.accent}33`, borderTopColor: pack.accent, borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Building your content pack...</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Using your Brand DNA, audience, and growth objectives.</div>
            </div>
          )}

          {step === "error" && (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>{err}</div>
              <button type="button" onClick={() => setStep("idle")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Try Again</button>
            </>
          )}

          {step === "success" && result && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#16a34a", fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>Content pack saved to your Library</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {result.why_this_goal_now && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Why Now</div>
                    <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.7 }}>{result.why_this_goal_now}</div>
                  </div>
                )}
                {result.recommended_content_mix?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Content Mix</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {result.recommended_content_mix.map((item, i) => (
                        <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.type}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: pack.accent }}>{item.percentage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.content_themes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Content Angles</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.content_themes.map((t, i) => (
                        <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.campaign_concept && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Campaign Concept</div>
                    <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.65 }}>{result.campaign_concept}</div>
                  </div>
                )}
                {result.first_7_days?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>First 7 Days</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {result.first_7_days.map((day, i) => (
                        <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.55, padding: "8px 12px", background: "#fafafa", borderRadius: 7, borderLeft: `3px solid ${pack.accent}` }}>{day}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                <button type="button" onClick={onClose} style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  background: "#111827", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                }}>
                  Done
                </button>
                <button type="button" onClick={onClose} style={{
                  padding: "12px 20px", borderRadius: 10,
                  background: "#f3f4f6", color: "#374151", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
                }}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Content Idea Card ─────────────────────────────────────────────────────────

function ContentIdeaCard({ idea, onGenerate }) {
  const [hovered, setHovered] = useState(false);
  const [designModal, setDesignModal] = useState(false);

  return (
    <>
      <div
        style={{
          border: "1px solid #e5e7eb", borderRadius: 16,
          background: "#fff", display: "flex", flexDirection: "column",
          boxShadow: hovered ? "0 12px 36px rgba(0,0,0,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.22s ease, transform 0.22s ease",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          overflow: "hidden", cursor: "default",
          animation: "mpp-card-in 0.3s ease both",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <style>{SPIN_CSS}</style>

        {/* Post Preview — 60-70% of card */}
        <div style={{ borderRadius: "14px 14px 0 0", overflow: "hidden", flexShrink: 0 }}>
          <PostPreview fw={idea} />
        </div>

        {/* Card Body — 30-40% */}
        <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 5, lineHeight: 1.2 }}>
            {idea.name}
          </div>

          <div style={{
            fontSize: 12, color: "#64748b", lineHeight: 1.55, marginBottom: 10, flex: 1,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {idea.use_case}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {idea.platforms.map(p => (
              <span key={p} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 99,
                background: "#f1f5f9", color: "#475569", fontWeight: 600,
              }}>{p}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 7 }}>
            <button type="button" onClick={() => onGenerate(idea)} style={{
              flex: 1, padding: "10px 0", borderRadius: 9,
              background: "linear-gradient(135deg, #059669, #047857)",
              color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Generate Post
            </button>
            <button type="button" onClick={() => setDesignModal(true)} style={{
              padding: "10px 12px", borderRadius: 9,
              border: "1px solid #c4b5fd",
              background: "#faf5ff",
              color: "#7c3aed",
              fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#c4b5fd"; }}
            >
              Create Design
            </button>
          </div>
        </div>
      </div>
      {designModal && <CreateDesignModal onClose={() => setDesignModal(false)} />}
    </>
  );
}

// ── Pack Card ─────────────────────────────────────────────────────────────────

function PackCard({ pack, onGenerate }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 22px 18px",
        background: "#fff", display: "flex", flexDirection: "column",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.10)" : "0 2px 6px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${pack.accent}15`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={pack.icon} style={{ fontSize: 20, color: pack.accent }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.2, marginBottom: 3 }}>{pack.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{pack.desc}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Includes</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {pack.includes.map(item => (
            <span key={item} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 99,
              background: `${pack.accent}12`, color: pack.accent, fontWeight: 600,
            }}>{item}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
        {pack.platforms.map(p => (
          <span key={p} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
        ))}
      </div>

      <button type="button" onClick={() => onGenerate(pack)} style={{
        padding: "11px 0", borderRadius: 9, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${pack.accent}, ${pack.accent}cc)`,
        color: "#fff", fontWeight: 700, fontSize: 13,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Generate Pack
      </button>
    </div>
  );
}

// ── Library View ──────────────────────────────────────────────────────────────

function LibraryView({ items, onRemove, switchTab }) {
  const [filter, setFilter] = useState("all");

  const filtered = items.filter(item => {
    if (filter === "posts") return item.type === "post";
    if (filter === "packs") return item.type === "pack";
    return true;
  });

  if (items.length === 0) {
    return (
      <div style={{ border: "1px dashed #e5e7eb", borderRadius: 14, padding: "64px 24px", textAlign: "center", background: "#fafafa" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Your vault is empty</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Generated posts and content packs are saved here automatically.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        {[
          { id: "all",   label: "All" },
          { id: "posts", label: "Posts" },
          { id: "packs", label: "Content Packs" },
        ].map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} style={{
            padding: "6px 14px", borderRadius: 99, border: "1px solid",
            borderColor: filter === f.id ? "#6366f1" : "#e5e7eb",
            background: filter === f.id ? "#6366f1" : "#fff",
            color: filter === f.id ? "#fff" : "#6b7280",
            fontWeight: 600, fontSize: 12, cursor: "pointer",
          }}>{f.label}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(item => {
          const isPost = item.type === "post";
          const isPack = item.type === "pack";
          const snippet = isPost
            ? (item.content?.post_angle || item.content?.suggested_hook || "Generated post")
            : (item.content?.campaign_concept || item.content?.why_this_goal_now || "Generated content pack");
          const label = isPost ? item.framework : item.packName;
          const typeColor = isPost ? { bg: "#d1fae5", text: "#065f46" } : { bg: "#e0e7ff", text: "#3730a3" };
          const typeLabel = isPost ? "Post" : "Content Pack";
          const dateLabel = item.saved_at
            ? new Date(item.saved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "";

          return (
            <div key={item.id} style={{
              border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px",
              background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: typeColor.bg, color: typeColor.text,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {typeLabel}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{label}</span>
                </div>
                <button type="button" onClick={() => onRemove(item.id)} style={{
                  background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>×</button>
              </div>

              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>{snippet}</div>
              {dateLabel && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>{dateLabel}</div>}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {isPost && (
                  <button type="button" onClick={() => switchTab("social")} style={{
                    padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                    background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>
                    Create Post
                  </button>
                )}
                {isPack && (
                  <button type="button" onClick={() => switchTab("campaign")} style={{
                    padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                    background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>
                    Use in Campaign
                  </button>
                )}
                <button type="button" onClick={() => {
                  const text = isPost
                    ? `${item.content?.post_angle || ""}\n\nHook: ${item.content?.suggested_hook || ""}\n\nCTA: ${item.content?.suggested_cta || ""}`
                    : `Pack: ${item.packName}\n\n${item.content?.campaign_concept || ""}`;
                  navigator.clipboard?.writeText(text).catch(() => {});
                }} style={{
                  padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                  background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}>
                  Copy
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIContentStudio({ activeBrand, intelligenceFeed = [], connectedPlatforms = [], switchTab }) {
  const brandId = activeBrand?.id;

  const [activeTab,  setActiveTab]  = useState("posts");
  const [library,    setLibrary]    = useState([]);
  const [postModal,  setPostModal]  = useState(null);
  const [packModal,  setPackModal]  = useState(null);

  useEffect(() => {
    if (brandId) setLibrary(getLibrary(brandId));
  }, [brandId]);

  function handleSaved(item) {
    const entry = { ...item, id: genId(), saved_at: new Date().toISOString() };
    saveToLibrary(brandId, entry);
    setLibrary(getLibrary(brandId));
  }

  function handleRemove(itemId) {
    deleteFromLibrary(brandId, itemId);
    setLibrary(getLibrary(brandId));
  }

  const libCount = library.length;

  const TABS = [
    { id: "posts",    label: "Posts" },
    { id: "campaign-content", label: "Campaign Content" },
    { id: "library",  label: libCount > 0 ? `Library (${libCount})` : "Library" },
  ];

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fas fa-magic" style={{ fontSize: 15, color: "#fff" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>AI Content Studio</h2>
        </div>
        <p style={{ color: "#6b7280", fontSize: 14, marginTop: 0 }}>
          Create content your brand can publish. Powered by Brand DNA, Brand Intelligence, and Growth Engine.
        </p>
      </div>

      <div style={{ marginBottom: 28, maxWidth: 460 }}>
        <TabPills tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Posts tab ─────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div>
          <div style={{ marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>20 Content Ideas</h3>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 3, marginBottom: 0 }}>
                Pick an idea. Generate a post built specifically for your brand.
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {CONTENT_IDEAS.map(idea => (
              <ContentIdeaCard
                key={idea.id}
                idea={idea}
                onGenerate={setPostModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Campaign Content tab ───────────────────────────────────────── */}
      {activeTab === "campaign-content" && (
        <div>
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Content Packs</h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Generate a full content pack to support your campaigns. Post ideas, angles, hooks, CTAs — all brand-specific.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {CONTENT_PACKS.map(pack => (
              <PackCard key={pack.id} pack={pack} onGenerate={setPackModal} />
            ))}
          </div>
        </div>
      )}

      {/* ── Library tab ───────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Content Vault</h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              Your generated posts and content packs, ready to use.
            </p>
          </div>
          <LibraryView
            items={library}
            onRemove={handleRemove}
            switchTab={switchTab}
          />
        </div>
      )}

      {/* Modals */}
      {postModal && (
        <PostModal
          idea={postModal}
          brandId={brandId}
          onClose={() => setPostModal(null)}
          onSaved={handleSaved}
        />
      )}
      {packModal && (
        <PackModal
          pack={packModal}
          brandId={brandId}
          onClose={() => setPackModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
