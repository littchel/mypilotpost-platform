import React, { useState, useEffect } from "react";
import { apiRequest } from "../lib/api/client";

// ── Frameworks ─────────────────────────────────────────────────────────────────

const FRAMEWORKS = [
  { id: 1,  name: "Myth vs Reality",    desc: "Challenge a common misconception in your industry with evidence and authority.",        use_case: "Building authority and sparking debate",         platforms: ["LinkedIn", "X", "Instagram"],          preview: 'Myth: "[common belief in your industry]"\n\nReality: [the truth most people miss]\n\nHere\'s why this changes everything...' },
  { id: 2,  name: "Behind The Scenes",  desc: "Show your real process — the decisions, the tradeoffs, the actual work.",               use_case: "Building trust and humanising your brand",       platforms: ["Instagram", "TikTok", "Facebook"],      preview: "What [your process] actually looks like:\n\n→ Step 1: [real step]\n→ Step 2: [real step]\n→ The part nobody shows: [insight]\n\nMost people only see the result." },
  { id: 3,  name: "Mistakes To Avoid",  desc: "Educate your audience on a costly error and position yourself as the guide.",           use_case: "Positioning as an expert guide",                 platforms: ["LinkedIn", "Instagram", "Facebook"],    preview: "The most expensive mistake I see [audience] make:\n\n[describe the mistake]\n\nHere's what to do instead:\n1. [fix 1]\n2. [fix 2]\n3. [fix 3]" },
  { id: 4,  name: "Before & After",     desc: "Show the transformation your product or service delivers with real specifics.",         use_case: "Social proof and conversion content",            platforms: ["Instagram", "Facebook", "TikTok"],      preview: "Before:\n✗ [pain point 1]\n✗ [pain point 2]\n\nAfter 90 days:\n✓ [result 1]\n✓ [result 2]\n\n[brief story of the transformation]" },
  { id: 5,  name: "Customer Story",     desc: "Share a real result from a customer in narrative form — specific, not vague.",          use_case: "Building trust and driving conversions",          platforms: ["LinkedIn", "Instagram", "Facebook"],    preview: "When [customer] came to us, they were struggling with [problem].\n\nHere's what changed:\n[story in 3-4 punchy lines]\n\nResult: [specific outcome]" },
  { id: 6,  name: "FAQ",               desc: "Answer the question you get asked most — with real depth, not a surface answer.",        use_case: "Reducing friction and educating prospects",       platforms: ["Instagram", "LinkedIn", "YouTube"],     preview: "The question I get asked every week:\n\n\"[exact question]\"\n\nThe honest answer: [direct, specific response]\n\nHere's the full breakdown..." },
  { id: 7,  name: "Industry Prediction", desc: "Share where you see the industry heading and why it matters for your audience.",       use_case: "Thought leadership and authority building",       platforms: ["LinkedIn", "X", "YouTube"],             preview: "My prediction for [industry] in the next 12 months:\n\n[bold prediction]\n\nHere's what I'm seeing:\n→ [signal 1]\n→ [signal 2]\n\nWhat this means for you..." },
  { id: 8,  name: "Unpopular Opinion",  desc: "Share a contrarian view that challenges conventional wisdom in your space.",            use_case: "Sparking engagement and showing conviction",      platforms: ["LinkedIn", "X", "Instagram"],          preview: "Unpopular opinion: [bold, specific claim]\n\nEveryone says [conventional view].\n\nBut here's what I've actually seen:\n[your real experience]\n\n[defend your position]" },
  { id: 9,  name: "Problem / Solution", desc: "Name a real problem your audience faces and walk through exactly how you solve it.",    use_case: "Lead generation and offer positioning",           platforms: ["LinkedIn", "Instagram", "Facebook"],    preview: "The problem: [specific pain point]\n\nWhy most approaches fail: [common mistake]\n\nWhat actually works: [your solution]\n\nThe result: [measurable outcome]" },
  { id: 10, name: "Founder Insight",    desc: "Share a personal lesson you learned building your business — earned, not recycled.",    use_case: "Brand storytelling and audience connection",      platforms: ["LinkedIn", "Instagram", "TikTok"],     preview: "3 years ago I made a decision that changed how we operate.\n\n[brief story setup]\n\nWhat I learned: [specific insight]\n\nHow we applied it: [what changed]\n\nResult: [outcome]" },
  { id: 11, name: "Top Tips",           desc: "Give 3–5 specific, actionable tips your audience can use today — nothing obvious.",    use_case: "High reach and saves — shareable content",        platforms: ["Instagram", "LinkedIn", "Pinterest"],   preview: "5 things I wish someone told me about [topic]:\n\n1. [specific tip]\n2. [specific tip]\n3. [specific tip]\n4. [specific tip]\n5. [specific tip]\n\nSave this for later." },
  { id: 12, name: "Checklist",          desc: "Give your audience a step-by-step checklist they can bookmark and return to.",         use_case: "High-save content that builds authority",         platforms: ["Instagram", "Pinterest", "LinkedIn"],   preview: "The [topic] checklist:\n\n☐ [step 1]\n☐ [step 2]\n☐ [step 3]\n☐ [step 4]\n☐ [step 5]\n\nBookmark this. You'll need it." },
  { id: 13, name: "Lessons Learned",    desc: "Share what you wish you knew earlier — earned wisdom, not borrowed quotes.",           use_case: "Relatability and audience connection",            platforms: ["LinkedIn", "Instagram", "TikTok"],     preview: "If I could go back 3 years, I'd tell myself:\n\n[Lesson 1] — because [why]\n[Lesson 2] — because [why]\n[Lesson 3] — because [why]\n\nSave yourself the detour." },
  { id: 14, name: "Common Questions",   desc: "Answer the top 3 questions you get from customers — the ones that reveal real gaps.",   use_case: "Reducing sales friction",                         platforms: ["LinkedIn", "Instagram", "Facebook"],    preview: "The 3 questions I get from every new client:\n\nQ1: [question]\nA: [honest answer]\n\nQ2: [question]\nA: [honest answer]\n\nQ3: [question]\nA: [honest answer]" },
  { id: 15, name: "Industry Reaction",  desc: "React to a recent development in your industry with a specific, considered point of view.", use_case: "Timeliness and establishing a point of view", platforms: ["LinkedIn", "X", "YouTube"],            preview: "[Industry news or trend] just happened.\n\nHere's what it actually means for [your audience]:\n\n→ [implication 1]\n→ [implication 2]\n\nMy take: [your specific opinion]" },
  { id: 16, name: "Case Study",         desc: "Walk through a specific result you achieved — numbers, process, and the honest story.", use_case: "Conversion content and proof",                    platforms: ["LinkedIn", "Facebook", "YouTube"],     preview: "Client: [industry/type]\nChallenge: [specific problem]\nApproach: [what we did in 3 steps]\nResult: [numbers + outcome]\n\nThe part most people skip: [real insight]" },
  { id: 17, name: "Trend Analysis",     desc: "Break down a trend happening in your industry right now — what it really means.",      use_case: "Authority and discoverability",                   platforms: ["LinkedIn", "YouTube", "X"],            preview: "The trend everyone in [industry] is talking about:\n\n[Name the trend]\n\nWhy it's actually happening: [real reason]\n\nWhat it means for you:\n→ [implication 1]\n→ [implication 2]" },
  { id: 18, name: "Community Question", desc: "Ask your audience a specific, thought-provoking question that reveals something real.", use_case: "Engagement and community building",               platforms: ["Instagram", "Facebook", "LinkedIn"],   preview: "I'm curious: [specific question that reveals something about your audience]\n\nFor us, [share your own take to spark discussion].\n\nWhat about you?" },
  { id: 19, name: "Success Story",      desc: "Celebrate a milestone — yours or a customer's — and tell the real story behind it.",   use_case: "Inspiration and social proof",                    platforms: ["LinkedIn", "Instagram", "Facebook"],   preview: "[The milestone] just happened.\n\nBut the real story is how we got here:\n\n[start point] → [key decision] → [today]\n\nThe lesson: [what it means]" },
  { id: 20, name: "Quick Win",          desc: "Give your audience one thing they can implement today and see a real result from.",     use_case: "High value, high trust content",                  platforms: ["Instagram", "LinkedIn", "TikTok"],     preview: "One thing you can do today to [desired outcome]:\n\n[The action — specific, simple, doable in under 30 min]\n\nWhy it works: [brief explanation]\n\nResult you'll see: [realistic outcome]" },
];

// ── Goals ──────────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "increase_brand_awareness", name: "Increase Brand Awareness",  desc: "Get your brand in front of more of the right people.",                   outcome: "Wider reach, more profile visits, new followers",         effort: "Medium", channels: ["Instagram", "TikTok", "YouTube", "LinkedIn"],  content_types: ["Short-form Video", "Carousels", "Thought Leadership"] },
  { id: "increase_engagement",      name: "Increase Engagement",        desc: "Build a more active, responsive audience that reacts and responds.",      outcome: "Higher comment rates, shares, and saves",                 effort: "Low",    channels: ["Instagram", "Facebook", "LinkedIn"],             content_types: ["Questions", "Polls", "Controversial Opinions", "Community Content"] },
  { id: "generate_leads",           name: "Generate Leads",             desc: "Convert social attention into qualified enquiries and bookings.",          outcome: "More DMs, form fills, and lead magnet downloads",         effort: "Medium", channels: ["LinkedIn", "Instagram", "Facebook"],             content_types: ["Lead Magnets", "Case Studies", "Problem/Solution", "CTAs"] },
  { id: "increase_sales",           name: "Increase Sales",             desc: "Drive purchases, sign-ups, or bookings directly from social.",            outcome: "More clicks to offer pages and higher conversions",       effort: "High",   channels: ["Instagram", "Facebook", "Pinterest"],            content_types: ["Product Demos", "Testimonials", "Promotions", "Before/After"] },
  { id: "build_authority",          name: "Build Authority",            desc: "Become the go-to voice in your category.",                                outcome: "More inbound opportunities, media mentions, referrals",   effort: "High",   channels: ["LinkedIn", "YouTube", "Podcast"],                content_types: ["Industry Analysis", "Predictions", "Unpopular Opinions", "Original Research"] },
  { id: "grow_audience",            name: "Grow Audience",              desc: "Accelerate follower growth across connected platforms.",                   outcome: "Consistent new follower growth month over month",         effort: "Medium", channels: ["Instagram", "TikTok", "YouTube"],                content_types: ["Trending Formats", "Collabs", "Value-First Content", "Challenges"] },
  { id: "improve_customer_trust",   name: "Improve Customer Trust",     desc: "Strengthen confidence in your brand through proof and transparency.",     outcome: "Reduced buying friction, higher conversion rates",        effort: "Medium", channels: ["LinkedIn", "Instagram", "Email"],                content_types: ["Behind-the-Scenes", "Customer Stories", "FAQs", "Social Proof"] },
  { id: "launch_something",         name: "Launch Something",           desc: "Build momentum for a new product, service, or offer.",                   outcome: "Awareness spike, waitlist signups, day-one customers",   effort: "High",   channels: ["All platforms"],                                 content_types: ["Countdown", "Behind-the-Scenes", "Early Access", "Launch Announcement"] },
  { id: "retain_customers",         name: "Retain Customers",           desc: "Keep existing customers engaged and loyal through content.",              outcome: "Repeat business, referrals, community growth",           effort: "Low",    channels: ["Email", "LinkedIn", "Facebook Groups"],          content_types: ["Tips & Tricks", "Updates", "Community Posts", "Exclusive Content"] },
  { id: "recover_performance",      name: "Recover Performance",        desc: "Rebuild reach, engagement, or conversions after a decline.",              outcome: "Return to previous performance baseline within 30 days",  effort: "High",   channels: ["Instagram", "LinkedIn", "Facebook"],             content_types: ["Re-engagement Posts", "Fresh Formats", "Value Bombs", "Honest Updates"] },
];

const EFFORT_COLORS = {
  Low:    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Medium: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  High:   { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
};

// ── Library Helpers ────────────────────────────────────────────────────────────

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

const SPIN_CSS = `@keyframes mpp-spin{to{transform:rotate(360deg)}}`;

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

// ── Post Modal ─────────────────────────────────────────────────────────────────

function PostModal({ framework, brandId, onClose, onSaved }) {
  const count   = getPostCount(brandId);
  const atLimit = count >= POST_DAILY_LIMIT;
  const [step, setStep]     = useState(atLimit ? "limit_reached" : "idle");
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState("");

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const data = await apiRequest("/api/customer/templates/generate-post", {
        method: "POST",
        body: JSON.stringify({ framework: framework.name }),
      });
      incPostCount(brandId);
      setResult(data);
      setStep("success");
      onSaved({ type: "post", framework: framework.name, content: data });
    } catch (e) {
      if (e.status === 429) setStep("limit_reached");
      else { setErr(e.message || "Failed. Please try again."); setStep("error"); }
    }
  }

  const remaining = Math.max(0, POST_DAILY_LIMIT - count);

  return (
    <div style={MODAL_OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 580 }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Post Framework</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#111827" }}>{framework.name}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {step === "idle" && (
            <>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Best For</div>
                <div style={{ fontSize: 14, color: "#374151" }}>{framework.use_case}</div>
              </div>
              <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 12, fontFamily: "monospace", fontSize: 11, color: "#64748b", whiteSpace: "pre-line", lineHeight: 1.6 }}>
                {framework.preview}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {framework.platforms.map(p => (
                  <span key={p} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
                {remaining} of {POST_DAILY_LIMIT} generations remaining today
              </div>
              <button type="button" onClick={generate} style={{
                width: "100%", padding: "14px 0", borderRadius: 10,
                background: "linear-gradient(135deg, #059669, #047857)",
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Generate Post Strategy
              </button>
            </>
          )}

          {step === "generating" && (
            <div style={{ textAlign: "center", padding: "52px 0" }}>
              <style>{SPIN_CSS}</style>
              <div style={{ width: 40, height: 40, border: "3px solid #d1fae5", borderTopColor: "#059669", borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Building your post strategy...</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Using your brand DNA and intelligence data.</div>
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
                  { label: "Canva Asset", value: result.canva_asset },
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
              <button type="button" onClick={onClose} style={{ marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 10, background: "#f3f4f6", color: "#374151", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Recommendation View ────────────────────────────────────────────────────────

function RecommendationView({ rec }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {rec.why_this_goal_now && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Why This Goal Now</div>
          <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.7 }}>{rec.why_this_goal_now}</div>
        </div>
      )}
      {rec.recommended_content_mix?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recommended Content Mix</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {rec.recommended_content_mix.map((item, i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>{item.percentage}</span>
                </div>
                {item.reason && <div style={{ fontSize: 12, color: "#6b7280" }}>{item.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {rec.publishing_frequency && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Frequency</div>
            <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{rec.publishing_frequency}</div>
          </div>
        )}
        {rec.recommended_platforms?.length > 0 && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Platforms</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {rec.recommended_platforms.map(p => (
                <span key={p} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#e0e7ff", color: "#4338ca", fontWeight: 600 }}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {rec.content_themes?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Content Themes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {rec.content_themes.map((t, i) => (
              <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      {rec.campaign_concept && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Campaign Concept</div>
          <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.65 }}>{rec.campaign_concept}</div>
        </div>
      )}
      {rec.first_7_days?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>First 7 Days</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rec.first_7_days.map((day, i) => (
              <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.55, padding: "8px 12px", background: "#fafafa", borderRadius: 7, borderLeft: "3px solid #6366f1" }}>{day}</div>
            ))}
          </div>
        </div>
      )}
      {rec.success_signals?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Success Signals</div>
          <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
            {rec.success_signals.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, marginBottom: 4 }}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Recommendation Modal ───────────────────────────────────────────────────────

function RecommendationModal({ goal, onClose, onSaved, onCreateCampaign }) {
  const [step, setStep] = useState("idle");
  const [rec,  setRec]  = useState(null);
  const [err,  setErr]  = useState("");

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const data = await apiRequest("/api/customer/templates/generate-recommendation", {
        method: "POST",
        body: JSON.stringify({ goal: goal.name }),
      });
      setRec(data);
      setStep("success");
      onSaved({ type: "recommendation", goal: goal.name, content: data });
    } catch (e) {
      setErr(e.message || "Failed to generate. Please try again.");
      setStep("error");
    }
  }

  return (
    <div style={MODAL_OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 640 }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Strategic Recommendation</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#111827" }}>{goal.name}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {step === "idle" && (
            <>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{goal.desc}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
                  <strong>Expected outcome:</strong> {goal.outcome}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {goal.content_types?.map(ct => (
                  <span key={ct} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#f0f4ff", color: "#4338ca", border: "1px solid #c7d2fe", fontWeight: 500 }}>{ct}</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 24 }}>
                Brand Intelligence will generate a strategic content recommendation tailored to your brand — content mix, publishing frequency, themes, and a campaign concept you can take into Campaigns when you're ready.
              </p>
              <button type="button" onClick={generate} style={{
                width: "100%", padding: "14px 0", borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Generate Recommendation
              </button>
            </>
          )}

          {step === "generating" && (
            <div style={{ textAlign: "center", padding: "52px 0" }}>
              <style>{SPIN_CSS}</style>
              <div style={{ width: 40, height: 40, border: "3px solid #e0e7ff", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Building your recommendation...</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Analysing your brand intelligence and building a strategic plan.</div>
            </div>
          )}

          {step === "error" && (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>{err}</div>
              <button type="button" onClick={() => setStep("idle")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Try Again</button>
            </>
          )}

          {step === "success" && rec && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#16a34a", fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>Recommendation saved to your Library</span>
              </div>
              <RecommendationView rec={rec} />
              <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                <button type="button" onClick={onCreateCampaign} style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  background: "#111827", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                }}>
                  Create Campaign →
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

// ── Framework Card ─────────────────────────────────────────────────────────────

function FrameworkCard({ fw, onGenerate, canvaConnected, switchTab }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px",
      background: "#fff", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 5 }}>{fw.name}</div>
      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, marginBottom: 10, flex: 1 }}>{fw.desc}</div>

      {/* Format preview */}
      <div style={{
        background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "10px 12px", marginBottom: 10,
        fontFamily: "monospace", fontSize: 11, color: "#64748b",
        whiteSpace: "pre-line", lineHeight: 1.55,
      }}>
        {fw.preview}
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: "#6b7280" }}>Best for: </span>{fw.use_case}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {fw.platforms.map(p => (
          <span key={p} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => onGenerate(fw)} style={{
          flex: 1, padding: "9px 0", borderRadius: 8,
          background: "linear-gradient(135deg, #059669, #047857)",
          color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
        }}>
          Generate Post
        </button>
        <button type="button" onClick={() => switchTab(canvaConnected ? "canva" : "integrations")} style={{
          padding: "9px 11px", borderRadius: 8, border: "1px solid #e5e7eb",
          background: canvaConnected ? "#faf5ff" : "#f9fafb",
          color: canvaConnected ? "#7c3aed" : "#6b7280",
          fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          {canvaConnected ? "Open Canva" : "Create Design"}
        </button>
      </div>
    </div>
  );
}

// ── Goal Card ──────────────────────────────────────────────────────────────────

function GoalCard({ goal, onGenerate }) {
  const eff = EFFORT_COLORS[goal.effort] || EFFORT_COLORS.Medium;
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px",
      background: "#fff", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{goal.name}</div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, flexShrink: 0, background: eff.bg, color: eff.text, border: `1px solid ${eff.border}` }}>
          {goal.effort}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, marginBottom: 8 }}>{goal.desc}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
        <span style={{ fontWeight: 600, color: "#6b7280" }}>Expected outcome: </span>{goal.outcome}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {goal.channels?.map(c => (
          <span key={c} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{c}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {goal.content_types?.map(ct => (
          <span key={ct} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#f0f4ff", color: "#4338ca", border: "1px solid #c7d2fe", fontWeight: 500 }}>{ct}</span>
        ))}
      </div>
      <button type="button" onClick={() => onGenerate(goal)} style={{
        padding: "10px 0", borderRadius: 8, border: "none",
        background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
      }}>
        Generate Recommendation
      </button>
    </div>
  );
}

// ── Library View ───────────────────────────────────────────────────────────────

function LibraryView({ items, onRemove, canvaConnected, switchTab }) {
  const [filter, setFilter] = useState("all");

  const filtered = items.filter(item => {
    if (filter === "posts") return item.type === "post";
    if (filter === "recommendations") return item.type === "recommendation";
    return true;
  });

  if (items.length === 0) {
    return (
      <div style={{ border: "1px dashed #e5e7eb", borderRadius: 14, padding: "64px 24px", textAlign: "center", background: "#fafafa" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Your library is empty</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Generated posts and recommendations are saved here automatically when you click Generate.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        {[
          { id: "all",             label: "All" },
          { id: "posts",           label: "Posts" },
          { id: "recommendations", label: "Recommendations" },
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
          const snippet = isPost
            ? (item.content?.post_angle || item.content?.suggested_hook || "Generated post strategy")
            : (item.content?.campaign_concept || item.content?.why_this_goal_now || "Generated recommendation");
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
                    background: isPost ? "#d1fae5" : "#e0e7ff",
                    color: isPost ? "#065f46" : "#3730a3",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {isPost ? "Post" : "Recommendation"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {item.framework || item.goal}
                  </span>
                </div>
                <button type="button" onClick={() => onRemove(item.id)} style={{
                  background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>×</button>
              </div>

              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>{snippet}</div>
              {dateLabel && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>{dateLabel}</div>}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => switchTab("social")} style={{
                  padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                  background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}>
                  Create Post
                </button>
                {!isPost && (
                  <button type="button" onClick={() => switchTab("campaign")} style={{
                    padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                    background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>
                    Create Campaign
                  </button>
                )}
                <button type="button" onClick={() => switchTab(canvaConnected ? "canva" : "integrations")} style={{
                  padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                  background: canvaConnected ? "#faf5ff" : "#f9fafb",
                  color: canvaConnected ? "#7c3aed" : "#6b7280",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}>
                  {canvaConnected ? "Open In Canva" : "Connect Canva"}
                </button>
                <button type="button" onClick={() => {
                  const text = isPost
                    ? `${item.content?.post_angle || ""}\n\nHook: ${item.content?.suggested_hook || ""}\n\nCTA: ${item.content?.suggested_cta || ""}`
                    : `Goal: ${item.goal}\n\n${item.content?.campaign_concept || ""}`;
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Templates({ activeBrand, intelligenceFeed = [], connectedPlatforms = [], switchTab }) {
  const brandId       = activeBrand?.id;
  const canvaConnected = connectedPlatforms.includes("canva");

  const [activeTab,  setActiveTab]  = useState("posts");
  const [library,    setLibrary]    = useState([]);
  const [postModal,  setPostModal]  = useState(null); // framework object
  const [recModal,   setRecModal]   = useState(null); // goal object

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

  const TABS = [
    { id: "posts",   label: "Posts" },
    { id: "goals",   label: "Goals" },
    { id: "library", label: library.length > 0 ? `Library (${library.length})` : "Library" },
  ];

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Templates</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginTop: 5 }}>
          Create content. Plan goals. Build your library.
        </p>
      </div>

      <div style={{ marginBottom: 28, maxWidth: 380 }}>
        <TabPills tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Posts tab ─────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>20 Proven Content Frameworks</h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              Browse freely — AI only runs when you click <strong>Generate Post</strong>.
              {canvaConnected
                ? <span style={{ color: "#7c3aed" }}> Canva connected.</span>
                : <span> <button type="button" onClick={() => switchTab("integrations")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontWeight: 600, fontSize: 13, padding: 0 }}>Connect Canva</button> to unlock design tools.</span>
              }
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {FRAMEWORKS.map(fw => (
              <FrameworkCard
                key={fw.id}
                fw={fw}
                onGenerate={setPostModal}
                canvaConnected={canvaConnected}
                switchTab={switchTab}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Goals tab ─────────────────────────────────────────────────── */}
      {activeTab === "goals" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Growth Goals</h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              Choose what you want to achieve. AI generates a strategic content recommendation — not a campaign.
              When you're ready, move it to Campaigns.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {GOALS.map(goal => (
              <GoalCard key={goal.id} goal={goal} onGenerate={setRecModal} />
            ))}
          </div>
        </div>
      )}

      {/* ── Library tab ───────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Content Library</h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              Generated posts and recommendations are saved here automatically.
            </p>
          </div>
          <LibraryView
            items={library}
            onRemove={handleRemove}
            canvaConnected={canvaConnected}
            switchTab={switchTab}
          />
        </div>
      )}

      {/* Modals */}
      {postModal && (
        <PostModal
          framework={postModal}
          brandId={brandId}
          onClose={() => setPostModal(null)}
          onSaved={handleSaved}
        />
      )}
      {recModal && (
        <RecommendationModal
          goal={recModal}
          onClose={() => setRecModal(null)}
          onSaved={handleSaved}
          onCreateCampaign={() => { setRecModal(null); switchTab("campaign"); }}
        />
      )}
    </div>
  );
}
