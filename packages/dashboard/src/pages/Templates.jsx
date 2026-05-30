import React, { useState } from "react";
import { apiRequest } from "../lib/api/client";

// ── Static Data ───────────────────────────────────────────────────────────────

const QUICK_POST_IDEAS = [
  { id: 1,  name: "Myth vs Reality",               desc: "Challenge a common misconception in your industry.",                           use_case: "Building authority and sparking debate",              platforms: ["LinkedIn", "X", "Instagram"] },
  { id: 2,  name: "Behind The Scenes",              desc: "Show what your process actually looks like.",                                  use_case: "Building trust and humanising your brand",            platforms: ["Instagram", "TikTok", "Facebook"] },
  { id: 3,  name: "Biggest Mistake Customers Make", desc: "Educate your audience on a costly error to avoid.",                           use_case: "Positioning as an expert guide",                      platforms: ["LinkedIn", "Instagram", "Facebook"] },
  { id: 4,  name: "Before & After",                 desc: "Show the transformation your product or service delivers.",                    use_case: "Social proof and conversion content",                 platforms: ["Instagram", "Facebook", "TikTok"] },
  { id: 5,  name: "Customer Story",                 desc: "Share a real result from a customer in narrative form.",                       use_case: "Building trust and driving conversions",              platforms: ["LinkedIn", "Instagram", "Facebook"] },
  { id: 6,  name: "FAQ",                            desc: "Answer the most common question you get asked.",                               use_case: "Reducing friction and educating prospects",           platforms: ["Instagram", "LinkedIn", "YouTube"] },
  { id: 7,  name: "Industry Prediction",            desc: "Share where you see the industry heading in the next 12 months.",             use_case: "Thought leadership and authority building",           platforms: ["LinkedIn", "X", "YouTube"] },
  { id: 8,  name: "Unpopular Opinion",              desc: "Share a contrarian view that challenges conventional wisdom.",                  use_case: "Sparking engagement and showing conviction",          platforms: ["LinkedIn", "X", "Instagram"] },
  { id: 9,  name: "Problem / Solution",             desc: "Name a real problem and walk through how you solve it.",                       use_case: "Lead generation and offer positioning",               platforms: ["LinkedIn", "Instagram", "Facebook"] },
  { id: 10, name: "Founder Insight",                desc: "Share a personal lesson you learned building your business.",                  use_case: "Brand storytelling and connection",                   platforms: ["LinkedIn", "Instagram", "TikTok"] },
  { id: 11, name: "Top 5 Tips",                     desc: "Give five specific, actionable tips on a topic your audience cares about.",    use_case: "High reach and saves — shareable content",            platforms: ["Instagram", "LinkedIn", "Pinterest"] },
  { id: 12, name: "Checklist",                      desc: "Give your audience a step-by-step checklist they can save and use.",           use_case: "High-save content that builds authority",             platforms: ["Instagram", "Pinterest", "LinkedIn"] },
  { id: 13, name: "Lessons Learned",                desc: "Share what you wish you knew earlier in your journey.",                        use_case: "Relatability and audience connection",                platforms: ["LinkedIn", "Instagram", "TikTok"] },
  { id: 14, name: "Common Questions",               desc: "Answer the top 3 questions you get from customers.",                           use_case: "Reducing sales friction",                             platforms: ["LinkedIn", "Instagram", "Facebook"] },
  { id: 15, name: "Industry News Reaction",         desc: "React to a recent development in your industry with your take.",               use_case: "Timeliness and establishing a point of view",         platforms: ["LinkedIn", "X", "YouTube"] },
  { id: 16, name: "Case Study",                     desc: "Walk through a specific result you achieved for a client.",                    use_case: "Conversion content and proof",                        platforms: ["LinkedIn", "Facebook", "YouTube"] },
  { id: 17, name: "Trend Analysis",                 desc: "Break down a trend happening in your industry right now.",                     use_case: "Authority and discoverability",                       platforms: ["LinkedIn", "YouTube", "X"] },
  { id: 18, name: "Community Question",             desc: "Ask your audience a specific question to drive discussion.",                   use_case: "Engagement and community building",                   platforms: ["Instagram", "Facebook", "LinkedIn"] },
  { id: 19, name: "Success Story",                  desc: "Celebrate a milestone — yours or a customer's — with the story behind it.",   use_case: "Inspiration and social proof",                        platforms: ["LinkedIn", "Instagram", "Facebook"] },
  { id: 20, name: "Quick Win",                      desc: "Give your audience one thing they can implement today to get a result.",       use_case: "High value, high trust content",                      platforms: ["Instagram", "LinkedIn", "TikTok"] },
];

const GROWTH_GOALS = [
  { id: "increase_brand_awareness", name: "Increase Brand Awareness",  desc: "Get your brand in front of more of the right people.",                        outcome: "Wider reach, more profile visits, new followers",          effort: "Medium" },
  { id: "increase_engagement",      name: "Increase Engagement",        desc: "Build a more active, responsive audience.",                                    outcome: "Higher comment rates, shares, and saves",                  effort: "Low"    },
  { id: "generate_leads",           name: "Generate Leads",             desc: "Convert social attention into qualified enquiries.",                           outcome: "More DMs, form fills, and lead magnet downloads",          effort: "Medium" },
  { id: "increase_sales",           name: "Increase Sales",             desc: "Drive purchases, sign-ups, or bookings directly from social.",                 outcome: "More clicks to offer pages and higher conversions",        effort: "High"   },
  { id: "build_authority",          name: "Build Authority",            desc: "Become the go-to voice in your category.",                                     outcome: "More inbound opportunities, media mentions, referrals",    effort: "High"   },
  { id: "grow_audience",            name: "Grow Audience",              desc: "Accelerate follower growth across connected platforms.",                        outcome: "Consistent new follower growth month over month",          effort: "Medium" },
  { id: "improve_customer_trust",   name: "Improve Customer Trust",     desc: "Strengthen confidence in your brand through proof and transparency.",          outcome: "Reduced buying friction and higher conversion rates",      effort: "Medium" },
  { id: "launch_something",         name: "Launch Something",           desc: "Build momentum for a new product, service, or offer.",                         outcome: "Awareness spike, waitlist signups, day-one customers",     effort: "High"   },
  { id: "retain_customers",         name: "Retain Customers",           desc: "Keep existing customers engaged and loyal through content.",                   outcome: "Repeat business, referrals, community growth",             effort: "Low"    },
  { id: "recover_performance",      name: "Recover Performance",        desc: "Rebuild reach, engagement, or conversions after a decline.",                   outcome: "Return to previous performance baseline within 30 days",   effort: "High"   },
];

const EFFORT_COLORS = {
  Low:    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Medium: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  High:   { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
};

const CATEGORY_GOAL_MAP = {
  "Platform Health":         { name: "Recover Performance",        id: "recover_performance" },
  "Content Intelligence":    { name: "Build Authority",            id: "build_authority" },
  "Audience Intelligence":   { name: "Grow Audience",              id: "grow_audience" },
  "Competitive Moat Map":    { name: "Build Authority",            id: "build_authority" },
  "SEO Intelligence":        { name: "Increase Brand Awareness",   id: "increase_brand_awareness" },
  "Conversion Intelligence": { name: "Generate Leads",             id: "generate_leads" },
  "Campaign Intelligence":   { name: "Launch Something",           id: "launch_something" },
  "Growth Engine":           { name: "Increase Engagement",        id: "increase_engagement" },
};

const CONFIDENCE_LABELS = {
  high: "Strong Signal", medium: "Moderate Signal", low: "Emerging Pattern", observed: "Observed",
};

// ── Daily Post Limit ──────────────────────────────────────────────────────────

const POST_DAILY_LIMIT = 3;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getPostCount(brandId) {
  try { return parseInt(localStorage.getItem(`mpp_post_gen_${brandId}_${todayStr()}`) || "0", 10); }
  catch { return 0; }
}

function incPostCount(brandId) {
  try { localStorage.setItem(`mpp_post_gen_${brandId}_${todayStr()}`, String(getPostCount(brandId) + 1)); }
  catch {}
}

// ── Campaign Modal ────────────────────────────────────────────────────────────

function CampaignModal({ goalName, onClose, onSuccess }) {
  const [step, setStep]   = useState("idle"); // idle | generating | success | error
  const [plan, setPlan]   = useState(null);
  const [errMsg, setErr]  = useState("");

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const result = await apiRequest("/api/customer/templates/generate-campaign", {
        method: "POST",
        body: JSON.stringify({ goal: goalName }),
      });
      setPlan(result);
      setStep("success");
      onSuccess(result);
    } catch (err) {
      setErr(err.message || "Failed to generate. Please try again.");
      setStep("error");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Campaign Generator</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{goalName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {step === "idle" && (
            <>
              <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.75, marginBottom: 24 }}>
                Brand Intelligence will generate a complete strategic campaign plan tailored to your brand, industry, and connected platforms — including a content series, CTA strategy, publishing schedule, and success metrics.
              </p>
              <button type="button" onClick={generate} style={{
                width: "100%", padding: "14px 0", borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Generate Campaign Plan
              </button>
            </>
          )}

          {step === "generating" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <style>{`@keyframes mpp-spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ width: 40, height: 40, border: "3px solid #e0e7ff", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Generating your campaign plan...</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Analysing your brand intelligence and building a custom plan.</div>
            </div>
          )}

          {step === "error" && (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>
                {errMsg}
              </div>
              <button type="button" onClick={() => setStep("idle")} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}>
                Try Again
              </button>
            </>
          )}

          {step === "success" && plan && (
            <>
              <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
                padding: "10px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center",
              }}>
                <span style={{ color: "#16a34a", fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>Campaign saved to My Campaigns</span>
              </div>
              <PlanView plan={plan} />
              <button type="button" onClick={onClose} style={{
                marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 10,
                background: "#f3f4f6", color: "#374151", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
              }}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanView({ plan }) {
  const fields = [
    { label: "Campaign Name",      value: plan.campaign_name },
    { label: "Objective",          value: plan.campaign_objective },
    { label: "Why This Campaign",  value: plan.why_this_campaign },
    { label: "Expected Outcome",   value: plan.expected_outcome },
    { label: "Duration",           value: plan.duration },
    { label: "Effort",             value: plan.estimated_effort },
    { label: "CTA Strategy",       value: plan.cta_strategy },
    { label: "Publishing Schedule", value: plan.publishing_schedule },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {fields.map(({ label, value }) => value ? (
        <div key={label}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.65 }}>{value}</div>
        </div>
      ) : null)}

      {plan.content_themes?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Content Themes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {plan.content_themes.map((t, i) => (
              <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, border: "1px solid #bfdbfe" }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {plan.success_metrics?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Success Metrics</div>
          <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
            {plan.success_metrics.map((m, i) => (
              <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, marginBottom: 4 }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.canva_assets?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Canva Assets</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {plan.canva_assets.map((a, i) => (
              <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff", fontWeight: 600 }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {plan.comment_trigger?.trigger_word && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Comment Trigger Strategy</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#78350f", marginBottom: 6 }}>
            Comment "<span style={{ fontFamily: "monospace" }}>{plan.comment_trigger.trigger_word}</span>" to trigger
          </div>
          <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>{plan.comment_trigger.why_it_works}</div>
          {plan.comment_trigger.expected_result && (
            <div style={{ fontSize: 13, color: "#92400e", marginTop: 4 }}>Expected: {plan.comment_trigger.expected_result}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Post Modal ────────────────────────────────────────────────────────────────

function PostModal({ framework, brandId, onClose }) {
  const count    = getPostCount(brandId);
  const atLimit  = count >= POST_DAILY_LIMIT;
  const [step, setStep]       = useState(atLimit ? "limit_reached" : "idle");
  const [postIdea, setIdea]   = useState(null);
  const [errMsg,   setErr]    = useState("");

  async function generate() {
    setStep("generating");
    setErr("");
    try {
      const result = await apiRequest("/api/customer/templates/generate-post", {
        method: "POST",
        body: JSON.stringify({ framework: framework.name }),
      });
      incPostCount(brandId);
      setIdea(result);
      setStep("success");
    } catch (err) {
      if (err.status === 429) { setStep("limit_reached"); }
      else { setErr(err.message || "Failed to generate. Please try again."); setStep("error"); }
    }
  }

  const remaining = Math.max(0, POST_DAILY_LIMIT - count);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Post Framework</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{framework.name}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          {step === "idle" && (
            <>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Best For</div>
                <div style={{ fontSize: 14, color: "#374151" }}>{framework.use_case}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {framework.platforms.map(p => (
                  <span key={p} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
                {remaining} of {POST_DAILY_LIMIT} generations remaining today
              </div>
              <button type="button" onClick={generate} style={{
                width: "100%", padding: "14px 0", borderRadius: 10,
                background: "linear-gradient(135deg, #059669, #047857)",
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Generate Post Guidance
              </button>
            </>
          )}

          {step === "generating" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <style>{`@keyframes mpp-spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ width: 40, height: 40, border: "3px solid #d1fae5", borderTopColor: "#059669", borderRadius: "50%", margin: "0 auto 20px", animation: "mpp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Building your post structure...</div>
            </div>
          )}

          {step === "error" && (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>
                {errMsg}
              </div>
              <button type="button" onClick={() => setStep("idle")} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}>
                Try Again
              </button>
            </>
          )}

          {step === "limit_reached" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Daily limit reached</div>
              <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.75 }}>
                You have reached today's custom generation limit.<br />More generations become available tomorrow.
              </div>
            </div>
          )}

          {step === "success" && postIdea && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Post Angle",     value: postIdea.post_angle },
                  { label: "Suggested Hook", value: postIdea.suggested_hook },
                  { label: "Suggested CTA",  value: postIdea.suggested_cta },
                  { label: "Visual Type",    value: postIdea.visual_type },
                  { label: "Canva Asset",    value: postIdea.canva_asset },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.65 }}>{value}</div>
                  </div>
                ) : null)}

                {postIdea.post_structure?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Post Structure</div>
                    <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
                      {postIdea.post_structure.map((s, i) => (
                        <li key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 6 }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              <button type="button" onClick={onClose} style={{
                marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 10,
                background: "#f3f4f6", color: "#374151", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
              }}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Templates({ activeBrand, intelligenceFeed = [], campaignsList = [], switchTab }) {
  const brandId = activeBrand?.id;

  const [localCampaigns,  setLocalCampaigns]  = useState([]);
  const [campaignModal,   setCampaignModal]    = useState(null); // { goalName }
  const [postModal,       setPostModal]        = useState(null); // framework object

  // Deduplicate campaigns (local newly generated + fetched list)
  const seenIds = new Set();
  const allCampaigns = [...localCampaigns, ...(campaignsList || [])].filter(c => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  // Build recommended goals from intelligence feed
  const recommended = [];
  const seenGoalIds = new Set();
  for (const item of intelligenceFeed) {
    const mapped = CATEGORY_GOAL_MAP[item.category];
    if (mapped && !seenGoalIds.has(mapped.id)) {
      seenGoalIds.add(mapped.id);
      recommended.push({
        goalName:   mapped.name,
        goalId:     mapped.id,
        reason:     item.finding,
        confidence: item.confidence || "medium",
        impact:     item.expected_impact,
      });
    }
    if (recommended.length >= 3) break;
  }
  // Fallbacks when no intelligence data
  if (recommended.length === 0) {
    [
      { goalName: "Increase Brand Awareness", goalId: "increase_brand_awareness", reason: "Connect your platforms to receive personalised recommendations based on your data.", confidence: null, impact: null },
      { goalName: "Increase Engagement",      goalId: "increase_engagement",      reason: "Build an active, responsive community around your brand.",                         confidence: null, impact: null },
      { goalName: "Generate Leads",           goalId: "generate_leads",           reason: "Convert your social audience into qualified enquiries.",                           confidence: null, impact: null },
    ].forEach(r => recommended.push(r));
  }

  function openCampaignModal(goalName) { setCampaignModal({ goalName }); }

  function handleCampaignSuccess(result) {
    setLocalCampaigns(prev => [{
      id:             result.id,
      name:           result.campaign_name,
      objective_type: campaignModal?.goalName?.toLowerCase().replace(/\s+/g, "_") || "campaign",
      status:         "active",
      created_at:     new Date().toISOString(),
    }, ...prev]);
  }

  // Shared section title style
  const ST = { fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 };
  const SS = { fontSize: 13, color: "#6b7280", marginTop: 3 };

  return (
    <div style={{ padding: "24px 0" }}>

      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Templates</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
          Brand Intelligence → Growth Opportunity → Execution → Publishing
        </p>
      </div>

      {/* ── Section 1: Recommended ─────────────────────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={ST}>Recommended For Your Brand</h3>
          <p style={SS}>
            {intelligenceFeed.length > 0
              ? "Powered by Brand Intelligence. Based on your current opportunities and risks."
              : "Connect your platforms to unlock personalised recommendations."}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {recommended.map((rec, i) => (
            <div key={i} style={{
              border: "1px solid #e0e7ff", borderRadius: 14, padding: "18px 20px",
              background: "#fafaff", display: "flex", flexDirection: "column", gap: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Recommended Goal</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 8, lineHeight: 1.3 }}>{rec.goalName}</div>
              {rec.reason && (
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 10, flex: 1 }}>{rec.reason}</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {rec.confidence && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    {CONFIDENCE_LABELS[rec.confidence.toLowerCase()] || rec.confidence}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => openCampaignModal(rec.goalName)} style={{
                padding: "10px 0", borderRadius: 8, background: "#4f46e5",
                color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
              }}>
                Generate Campaign →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Quick Post Ideas ────────────────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={ST}>Quick Post Ideas</h3>
          <p style={SS}>20 proven post frameworks. Browse freely — AI runs only when you click Generate.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {QUICK_POST_IDEAS.map(idea => (
            <div key={idea.id} style={{
              border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px",
              background: "#fff", display: "flex", flexDirection: "column", gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{idea.name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, flex: 1 }}>{idea.desc}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, color: "#6b7280" }}>Best for: </span>{idea.use_case}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {idea.platforms.map(p => (
                  <span key={p} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{p}</span>
                ))}
              </div>
              <button type="button" onClick={() => setPostModal(idea)} style={{
                padding: "8px 0", borderRadius: 7, border: "1px solid #d1fae5",
                background: "#f0fdf4", color: "#059669", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
                Generate Post →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: My Campaigns ────────────────────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h3 style={ST}>My Campaigns</h3>
            <p style={SS}>Your saved campaigns. Pick up where you left off.</p>
          </div>
          {allCampaigns.length > 0 && switchTab && (
            <button type="button" onClick={() => switchTab("campaign")} style={{
              fontSize: 13, fontWeight: 600, color: "#4f46e5", background: "none",
              border: "none", cursor: "pointer",
            }}>
              View All →
            </button>
          )}
        </div>
        {allCampaigns.length === 0 ? (
          <div style={{
            border: "1px dashed #e5e7eb", borderRadius: 14, padding: "40px 24px",
            textAlign: "center", background: "#fafafa",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Generate your first campaign using the recommended goals or growth goals below.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {allCampaigns.slice(0, 6).map(c => {
              const goalLabel = GROWTH_GOALS.find(g => g.id === c.objective_type)?.name
                || c.objective_type?.replace(/_/g, " ") || "Campaign";
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
              return (
                <div key={c.id} style={{
                  border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px",
                  background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{c.name || c.campaign_name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {goalLabel}
                    {dateStr && ` · ${dateStr}`}
                  </div>
                  <span style={{
                    alignSelf: "flex-start", fontSize: 11, fontWeight: 600, padding: "2px 8px",
                    borderRadius: 99, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
                  }}>
                    {c.status || "active"}
                  </span>
                  {switchTab && (
                    <button type="button" onClick={() => switchTab("campaign")} style={{
                      marginTop: 4, padding: "8px 0", borderRadius: 7, border: "1px solid #e5e7eb",
                      background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer",
                    }}>
                      Open Campaign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 4: Growth Goals ────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={ST}>Growth Goals</h3>
          <p style={SS}>Choose a goal to generate a complete campaign plan tailored to your brand.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {GROWTH_GOALS.map(goal => {
            const eff = EFFORT_COLORS[goal.effort] || EFFORT_COLORS.Medium;
            return (
              <div key={goal.id} style={{
                border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px",
                background: "#fff", display: "flex", flexDirection: "column", gap: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.3, flex: 1 }}>{goal.name}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                    background: eff.bg, color: eff.text, border: `1px solid ${eff.border}`,
                  }}>{goal.effort}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, flex: 1 }}>{goal.desc}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, color: "#6b7280" }}>Typical outcome: </span>{goal.outcome}
                </div>
                <button type="button" onClick={() => openCampaignModal(goal.name)} style={{
                  marginTop: 4, padding: "10px 0", borderRadius: 8, border: "none",
                  background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>
                  Generate Campaign
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {campaignModal && (
        <CampaignModal
          goalName={campaignModal.goalName}
          onClose={() => setCampaignModal(null)}
          onSuccess={handleCampaignSuccess}
        />
      )}
      {postModal && (
        <PostModal
          framework={postModal}
          brandId={brandId}
          onClose={() => setPostModal(null)}
        />
      )}
    </div>
  );
}
