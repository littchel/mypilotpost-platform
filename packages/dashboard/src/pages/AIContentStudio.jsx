import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api/client";
import PlatformIcon from "../components/shared/PlatformIcon";
import { fetchMediaSuggestions, trackImageImported } from "../services/mediaSuggestions";
import IndustryAutoSuggest from "../components/shared/IndustryAutoSuggest";

const CSS = `
@keyframes cs-spin    { to { transform:rotate(360deg) } }
@keyframes cs-in      { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
@keyframes cs-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.cs-shimmer {
  background:linear-gradient(90deg,var(--hover-bg) 25%,var(--border-subtle) 50%,var(--hover-bg) 75%);
  background-size:200% 100%;
  animation:cs-shimmer 1.4s infinite;
}
.cs-card { animation:cs-in 0.3s ease both; }
.cs-card:hover { transform:translateY(-2px)!important; box-shadow:0 12px 32px rgba(15,23,42,0.12)!important; }
`;

// ── Calendar events ───────────────────────────────────────────────────────────
const ANNUAL_EVENTS = [
  { name:"Valentine's Day",          month:1,  day:14,  icon:"❤️",  accent:"#e11d48", suggested:"Offer Campaign" },
  { name:"International Women's Day",month:2,  day:8,   icon:"💜",  accent:"#7c3aed", suggested:"Brand Story" },
  { name:"Earth Day",                 month:3,  day:22,  icon:"🌍",  accent:"#059669", suggested:"Brand Values" },
  { name:"Mother's Day",              month:4,  day:11,  icon:"🌸",  accent:"#db2777", suggested:"Offer Campaign" },
  { name:"Father's Day",              month:5,  day:15,  icon:"👔",  accent:"#2563eb", suggested:"Offer Campaign" },
  { name:"Black Friday",              month:10, day:28,  icon:"🛍️",  accent:"#111827", suggested:"Sales Campaign" },
  { name:"Cyber Monday",              month:11, day:1,   icon:"💻",  accent:"#4f46e5", suggested:"Promotion" },
  { name:"Christmas",                 month:11, day:25,  icon:"🎄",  accent:"#dc2626", suggested:"Brand Story" },
  { name:"New Year's Eve",            month:11, day:31,  icon:"🎆",  accent:"#f59e0b", suggested:"Year Recap" },
];

function getUpcomingEvents() {
  const today = new Date();
  const MS = 86400000;
  const results = [];
  for (let yr = 0; yr <= 1; yr++) {
    const year = today.getFullYear() + yr;
    for (const ev of ANNUAL_EVENTS) {
      const d = new Date(year, ev.month, ev.day);
      const daysAway = Math.ceil((d - today) / MS);
      if (daysAway > 0 && daysAway <= 60) results.push({ ...ev, daysAway, date: d });
    }
  }
  return results.sort((a,b) => a.daysAway - b.daysAway).slice(0, 4);
}

// ── Content Confidence Score ──────────────────────────────────────────────────
function calcCCS(activeBrand, connectedPlatforms) {
  let score = 0;
  const missing = [];
  if (activeBrand?.name)     score += 5;
  if (activeBrand?.industry) score += 10;
  if (activeBrand?.website)  score += 8; else missing.push("Website URL");
  const hasDNA = activeBrand?.dna || activeBrand?.brand_voice || activeBrand?.target_audience;
  if (hasDNA) score += 35;
  else {
    if (!activeBrand?.brand_voice)     missing.push("Brand voice (Brand DNA)");
    if (!activeBrand?.target_audience) missing.push("Target audience (Brand DNA)");
    if (!activeBrand?.content_pillars) missing.push("Content pillars (Brand DNA)");
  }
  const pCount = connectedPlatforms?.length || 0;
  if (pCount >= 3)      score += 27;
  else if (pCount >= 1) score += 12;
  else missing.push("Connect at least one social account");
  score += 15;
  const s = Math.min(score, 100);
  return { score: s, missing, level: s < 50 ? "weak" : s < 75 ? "good" : "high" };
}

// ── Pexels pool — 15 CDN URLs, no auth required ───────────────────────────────
const PEXELS_POOL = [
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3182781/pexels-photo-3182781.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181248/pexels-photo-1181248.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184302/pexels-photo-3184302.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
];

function preloadImg(src) {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload  = () => res(src);
    img.onerror = rej;
    img.src = src;
  });
}

// ── Discovery Card — Posts Discovery Card v1 ─────────────────────────────────
// onSave optional — if provided renders Save button
function DiscoveryCard({ opp, imageUrl, imgReady, onPreview, onUseIdea, onSave, saved }) {
  const title     = opp.idea || opp.title || opp.framework || "Content Opportunity";
  const format    = (opp.media_type || opp.format || opp.type || "Post").replace(/_/g, " ");
  const effort    = opp.effort || "15 min";
  const platforms = Array.isArray(opp.platforms) ? opp.platforms.slice(0, 3) : [];

  return (
    <div className="cs-card" style={{
      border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)",
      background: "var(--surface-primary)", boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
      overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 520, transition: "all 0.22s",
    }}>
      {/* IMAGE 80% */}
      <div style={{ position: "relative", width: "100%", height: 408, flexShrink: 0, overflow: "hidden", background: "var(--hover-bg)" }}>
        {imgReady && imageUrl && (
          <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>{format}</span>
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>{effort}</span>
        </div>
        {platforms.length > 0 && (
          <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 4 }}>
            {platforms.map(p => (
              <div key={p} style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "3px 8px 3px 5px", display: "flex", alignItems: "center", gap: 4 }}>
                <PlatformIcon platform={p} size={11} />
                <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{p}</span>
              </div>
            ))}
          </div>
        )}
        {opp.calendar_event && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "3px 8px" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>{opp.days_away ? `${opp.days_away}d` : "soon"}</span>
          </div>
        )}
      </div>

      {/* BOTTOM 20% */}
      <div style={{ padding: "12px 14px 14px", flex: 1 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
          Suggested for your audience
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => onPreview(opp, imageUrl)}
            style={{ flex: 1, border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)", color: "var(--text-main)", borderRadius: "var(--radius-md)", padding: "8px 0", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            Preview
          </button>
          <button type="button" onClick={() => onUseIdea(opp)}
            style={{ flex: 1, border: "none", background: "var(--pilot-blue)", color: "#fff", borderRadius: "var(--radius-md)", padding: "8px 0", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Use Idea
          </button>
          {onSave && (
            <button type="button" onClick={() => onSave(opp, imageUrl)} disabled={saved}
              style={{ flex: 1, border: `1px solid ${saved ? "var(--status-success)" : "var(--border-subtle)"}`, background: saved ? "var(--surface-primary)" : "var(--surface-secondary)", color: saved ? "var(--status-success)" : "var(--text-main)", borderRadius: "var(--radius-md)", padding: "8px 0", fontSize: "0.85rem", fontWeight: saved ? 700 : 600, cursor: saved ? "default" : "pointer" }}>
              {saved ? "✓ Saved" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Accordion row ─────────────────────────────────────────────────────────────
function AccordionRow({ label, body, open, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button type="button" onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>{label}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: 10, color: "var(--slate-400)", flexShrink: 0 }} />
      </button>
      {open && <div style={{ paddingBottom: 12, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{body}</div>}
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ opp, imageUrl, activeBrand, onClose, onUseIdea }) {
  const [openRow, setOpenRow] = useState(0);
  const brandName = activeBrand?.name || "Your Brand";
  const initials  = brandName.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  // Use actual generated caption if available, otherwise fall back to hook/idea
  const caption   = opp._caption || opp.caption || opp.hook || opp.idea || opp.title || "Open in Create Social Post to write your full post.";

  const rows = [
    {
      label: "Why suggested",
      body: opp.objective || opp.suggested_because || opp.reason
        || "Based on your brand DNA and recent engagement patterns. This format is performing above average in your niche.",
    },
    {
      label: "Brand signals",
      body: `${opp.framework ? `Your brand responds well to ${opp.framework} content. ` : ""}This format matches your top-performing content type based on connected platform data.`,
    },
    {
      label: "Campaign alignment",
      body: opp.calendar_event
        ? `Aligned with upcoming ${opp.calendar_event} — ${opp.days_away || "soon"} days away. Ideal timing.`
        : opp.campaign_name
          ? `Generated for campaign: ${opp.campaign_name}. Assign to campaign in the editor to track attribution.`
          : "No active campaign currently linked. Assign a campaign after opening in the editor.",
    },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 3000, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(820px, 94vw)", maxHeight: "88vh", background: "var(--surface-primary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", zIndex: 3001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Content Preview</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--slate-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT */}
          <div style={{ width: "46%", borderRight: "1px solid var(--border-subtle)", padding: "20px 16px", overflowY: "auto", background: "var(--surface-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", alignSelf: "flex-start" }}>Post Preview</div>
            <div style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", maxWidth: 340, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--pilot-blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{brandName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Suggested</div>
                </div>
                <div style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>•••</div>
              </div>
              <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "var(--hover-bg)" }}>
                {imageUrl && <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
              <div style={{ padding: "8px 12px 4px", display: "flex", gap: 14, fontSize: 20, color: "var(--text-main)" }}>
                <i className="far fa-heart" /><i className="far fa-comment" /><i className="far fa-paper-plane" />
                <i className="far fa-bookmark" style={{ marginLeft: "auto" }} />
              </div>
              <div style={{ padding: "4px 12px 14px", fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.6, maxHeight: 180, overflowY: "auto" }}>
                <strong>{brandName.toLowerCase().replace(/\s+/g, "")}</strong>{" "}{caption}
              </div>
            </div>
          </div>
          {/* RIGHT */}
          <div style={{ flex: 1, padding: "20px 20px", overflowY: "auto", background: "var(--surface-primary)" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Intelligence</div>
            {rows.map((row, i) => (
              <AccordionRow key={i} label={row.label} body={row.body} open={openRow === i} onToggle={() => setOpenRow(openRow === i ? null : i)} />
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-secondary)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-primary)", color: "var(--text-main)", borderRadius: "var(--radius-md)", padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            Close
          </button>
          <button type="button" onClick={() => onUseIdea(opp)}
            style={{ border: "none", background: "var(--pilot-blue)", color: "#fff", borderRadius: "var(--radius-md)", padding: "8px 20px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Use Idea
          </button>
        </div>
      </div>
    </>
  );
}

// ── Route Modal — enriched prefill including image ────────────────────────────
function RouteModal({ opp, imageUrl, switchTab, onClose }) {
  function route(tab) {
    try {
      if (imageUrl) trackImageImported({ url: imageUrl, provider: 'pexels' });
      sessionStorage.setItem("studio_idea_prefill", JSON.stringify({
        idea_id:             opp.id || opp.title,
        title:               opp.idea || opp.title || opp.framework || "",
        caption:             opp._caption || opp.caption || "",
        hook:                opp.hook || "",
        cta:                 opp._cta || opp.cta || "",
        hashtags:            opp._hashtags || opp.hashtags || [],
        platforms:           opp.platforms || [],
        contentType:         opp.content_type || "social",
        image:               imageUrl || "",
        imageSource:         "pexels",
        suggested_structure: opp.structure || opp.framework || "",
        campaign_id:         opp.campaign_id || null,
        campaign_name:       opp.campaign_name || null,
        calendar_context:    opp.calendar_event || null,
        brand_context:       opp.objective || opp.suggested_because || "",
        generationMeta:      { source: opp.source || "studio", playbook_type: opp.playbook_type || null },
        source:              "studio",
      }));
    } catch {}
    onClose();
    switchTab(tab);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 4000, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(400px, 94vw)", background: "var(--surface-primary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", zIndex: 4001, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Open in editor</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--slate-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
            The editor receives context, caption, and image from Studio.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button type="button" onClick={() => route("social")}
              style={{ border: "1px solid var(--pilot-blue)", background: "var(--pilot-blue-light)", color: "var(--pilot-blue)", borderRadius: "var(--radius-md)", padding: "13px 16px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-edit" style={{ fontSize: 14, flexShrink: 0 }} />
              <div>
                <div>Create Social Post</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, opacity: 0.8, marginTop: 1 }}>Instagram, LinkedIn, Facebook, X and more</div>
              </div>
            </button>
            <button type="button" onClick={() => route("blog")}
              style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)", color: "var(--text-main)", borderRadius: "var(--radius-md)", padding: "13px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-file-alt" style={{ fontSize: 14, flexShrink: 0 }} />
              <div>
                <div>Create Article</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 1 }}>Blog post, long-form, thought leadership</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Save card to vault ────────────────────────────────────────────────────────
async function saveCardToVault(card, imageUrl) {
  const payload = {
    content_type: card.content_type || "social",
    title:        card.title || card.idea || "Studio Draft",
    body:         card._caption || card.caption || card.hook || "",
    hook:         card.hook || "",
    cta:          card._cta || card.cta || "",
    hashtags:     JSON.stringify(card._hashtags || card.hashtags || []),
    platforms:    JSON.stringify(card.platforms || []),
    lifecycle_status: "draft",
    source:       "studio",
    metadata: JSON.stringify({
      image: imageUrl || "",
      image_source: "pexels",
      platform_targets: card.platforms || [],
      generation_context: {
        source:         card.source || "studio",
        playbook_type:  card.playbook_type || null,
        campaign_name:  card.campaign_name || null,
        framework:      card.framework || null,
      },
      editor_payload: {
        caption:    card._caption || card.caption || "",
        hook:       card.hook || "",
        cta:        card._cta || card.cta || "",
        hashtags:   card._hashtags || card.hashtags || [],
        format:     card.format || "single_image",
        timing:     card.timing || "",
      },
    }),
  };
  return apiRequest("/api/customer/vault", { method: "POST", body: JSON.stringify(payload) });
}

// ── CCS Bar ───────────────────────────────────────────────────────────────────
function CCSBar({ ccs }) {
  const { score, level, missing } = ccs;
  const color = level === "high" ? "var(--status-success)" : level === "good" ? "var(--status-warning)" : "var(--status-danger)";
  const label = level === "high" ? "High Confidence" : level === "good" ? "Good Context" : "Weak Context";
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 100, height: 6, background: "var(--hover-bg)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{score} — {label}</span>
      </div>
      {missing.length > 0 && (
        <button type="button" onClick={() => setOpen(o => !o)} style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
          {open ? "Hide" : `${missing.length} signal${missing.length > 1 ? "s" : ""} missing`}
        </button>
      )}
      {open && (
        <div style={{ width: "100%", background: "var(--surface-primary)", border: "1px solid var(--status-danger)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginTop: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--status-danger)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Complete these to improve suggestions:</div>
          {missing.map(m => <div key={m} style={{ fontSize: 12, color: "var(--text-main)", marginBottom: 3 }}>• {m}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Posts Tab ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: "for-you",           label: "For You" },
  { id: "trending",          label: "Trending" },
  { id: "high-conversion",   label: "High Conversion" },
  { id: "thought-leadership",label: "Thought Leadership" },
  { id: "seasonal",          label: "Seasonal" },
  { id: "carousel",          label: "Carousel" },
  { id: "blog-ideas",        label: "Blog Ideas" },
];

function matchFilter(opp, filter) {
  if (filter === "for-you") return true;
  const mt = (opp.media_type || opp.type || opp.format || "").toLowerCase();
  const fw = (opp.framework || opp.category || "").toLowerCase();
  const combined = mt + " " + fw;
  if (filter === "trending")          return !!opp.calendar_event || combined.includes("trend") || combined.includes("moment");
  if (filter === "high-conversion")   return combined.includes("convert") || combined.includes("lead") || combined.includes("offer") || combined.includes("sale") || fw.includes("generation");
  if (filter === "thought-leadership") return fw.includes("authority") || fw.includes("thought") || fw.includes("predict") || fw.includes("opinion") || fw.includes("insight") || fw.includes("leadership");
  if (filter === "seasonal")          return !!opp.calendar_event || combined.includes("seasonal") || combined.includes("holiday");
  if (filter === "carousel")          return mt.includes("carousel");
  if (filter === "blog-ideas")        return combined.includes("blog") || combined.includes("article") || combined.includes("long");
  return true;
}

function PostsTab({ activeBrand, connectedPlatforms, switchTab }) {
  const [opps,       setOpps]      = useState([]);
  const [imageMap,   setImageMap]  = useState({});
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [error,      setError]     = useState("");
  const [filter,     setFilter]    = useState("for-you");
  const [preview,    setPreview]   = useState(null);
  const [routing,    setRouting]   = useState(null);
  const ccs = calcCCS(activeBrand, connectedPlatforms);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/customer/studio/opportunities");
      const list = (data.opportunities || []).map((o, i) => ({ ...o, _index: i }));
      setOpps(list);
      // Fetch live images from media engine based on opportunity context
      fetchMediaSuggestions({
        platform:    (connectedPlatforms?.[0]?.platform) || activeBrand?.primary_platform || 'instagram',
        contentType: 'social',
        text:        list.slice(0, 3).map(o => o.title || o.idea || '').join(' '),
        brand:       activeBrand?.name || '',
        industry:    activeBrand?.industry || '',
      })
        .then(buckets => {
          const pool = [...(buckets.agencyPicks || []), ...(buckets.trending || [])];
          list.forEach((_, i) => {
            const img = pool[i % Math.max(pool.length, 1)];
            const url = img?.preview || img?.url || PEXELS_POOL[i % PEXELS_POOL.length];
            preloadImg(url)
              .then(u => setImageMap(m => ({ ...m, [i]: { url: u, ready: true } })))
              .catch(() => setImageMap(m => ({ ...m, [i]: { url, ready: true } })));
          });
        })
        .catch(() => {
          // fallback to static pool
          list.forEach((_, i) => {
            const url = PEXELS_POOL[i % PEXELS_POOL.length];
            preloadImg(url)
              .then(u => setImageMap(m => ({ ...m, [i]: { url: u, ready: true } })))
              .catch(() => setImageMap(m => ({ ...m, [i]: { url, ready: true } })));
          });
        });
    } catch (e) { setError(e.message || "Failed to load opportunities."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = opps.filter(o => matchFilter(o, filter)).slice(0, 20);

  return (
    <div>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <CCSBar ccs={ccs} />
        <button type="button" onClick={() => load(true)} disabled={refreshing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "var(--surface-primary)", color: "var(--text-main)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          {refreshing ? <><div style={{ width: 12, height: 12, border: "2px solid var(--border-subtle)", borderTopColor: "var(--pilot-blue)", borderRadius: "50%", animation: "cs-spin 1s linear infinite" }} /> Refreshing...</> : <><i className="fas fa-sync-alt" style={{ fontSize: 10 }} /> Refresh Feed</>}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 99, border: "1px solid", borderColor: filter === f.id ? "var(--pilot-blue)" : "var(--border-subtle)", background: filter === f.id ? "var(--pilot-blue)" : "var(--surface-primary)", color: filter === f.id ? "#fff" : "var(--text-main)", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div className="cs-shimmer" style={{ height: 408 }} />
              <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="cs-shimmer" style={{ height: 14, borderRadius: 4, width: "75%" }} />
                <div className="cs-shimmer" style={{ height: 10, borderRadius: 4, width: "50%" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <div className="cs-shimmer" style={{ flex: 1, height: 34, borderRadius: "var(--radius-md)" }} />
                  <div className="cs-shimmer" style={{ flex: 1, height: 34, borderRadius: "var(--radius-md)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>Failed to load opportunities</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{error}</div>
          <button type="button" onClick={() => load()} style={{ padding: "10px 24px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", background: "var(--pilot-blue)", color: "#fff", fontWeight: 700, fontSize: 14 }}>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--surface-secondary)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>No opportunities in this category</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Try a different filter or refresh the feed.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {visible.map((opp, i) => {
                const imgData = imageMap[opp._index] || {};
                return (
                  <DiscoveryCard key={opp.id || i} opp={opp} imageUrl={imgData.url || null} imgReady={!!imgData.ready}
                    onPreview={(o, u) => setPreview({ opp: o, imageUrl: u })}
                    onUseIdea={o => setRouting({ opp: o, imageUrl: imgData.url || null })} />
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
            {visible.length} of {opps.length} ideas · Studio never publishes
          </div>
        </>
      )}

      {preview && (
        <PreviewModal opp={preview.opp} imageUrl={preview.imageUrl} activeBrand={activeBrand}
          onClose={() => setPreview(null)}
          onUseIdea={o => { setPreview(null); setRouting({ opp: o, imageUrl: preview.imageUrl }); }} />
      )}
      {routing && (
        <RouteModal opp={routing.opp} imageUrl={routing.imageUrl} switchTab={switchTab} onClose={() => setRouting(null)} />
      )}
    </div>
  );
}

// ── Asset Card Grid (Playbook + Campaign outputs) ─────────────────────────────
function AssetCardGrid({ cards, activeBrand, switchTab, source }) {
  const [imageMap,  setImageMap]  = useState({});
  const [savedSet,  setSavedSet]  = useState(new Set());
  const [preview,   setPreview]   = useState(null);
  const [routing,   setRouting]   = useState(null);
  const [saveErr,   setSaveErr]   = useState("");

  useEffect(() => {
    if (!cards.length) return;
    const text = cards.slice(0, 5).map(c => c.title || c.idea || '').join(' ');
    const platform = (cards[0]?.platforms || [])[0] || 'instagram';
    fetchMediaSuggestions({
      platform,
      contentType: 'social',
      text,
      brand: activeBrand?.name || '',
      industry: activeBrand?.industry || '',
    })
      .then(buckets => {
        const pool = [...(buckets.agencyPicks || []), ...(buckets.trending || [])];
        if (!pool.length) throw new Error('empty');
        cards.forEach((_, i) => {
          const img = pool[i % pool.length];
          const url = img?.preview_url || img?.url || PEXELS_POOL[i % PEXELS_POOL.length];
          preloadImg(url)
            .then(u => setImageMap(m => ({ ...m, [i]: { url: u, ready: true } })))
            .catch(() => setImageMap(m => ({ ...m, [i]: { url: PEXELS_POOL[i % PEXELS_POOL.length], ready: true } })));
        });
      })
      .catch(() => {
        cards.forEach((_, i) => {
          const url = PEXELS_POOL[i % PEXELS_POOL.length];
          preloadImg(url)
            .then(u => setImageMap(m => ({ ...m, [i]: { url: u, ready: true } })))
            .catch(() => setImageMap(m => ({ ...m, [i]: { url: PEXELS_POOL[0], ready: true } })));
        });
      });
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(card, imageUrl) {
    try {
      await saveCardToVault(card, imageUrl);
      setSavedSet(s => new Set([...s, card.id]));
    } catch { setSaveErr("Save failed. Try again."); }
  }

  if (!cards.length) return null;

  return (
    <div>
      {saveErr && (
        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--status-danger)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--status-danger)" }}>{saveErr}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {cards.map((card, i) => {
          // Map card → opp shape for DiscoveryCard
          const opp = {
            ...card,
            idea:        card.title,
            media_type:  card.format || "single_image",
            effort:      card.timing || "15 min",
            platforms:   card.platforms || (card.platform ? [card.platform] : []),
            hook:        card.hook,
            _caption:    card.caption,
            _cta:        card.cta,
            _hashtags:   card.hashtags,
          };
          const imgData = imageMap[i] || {};
          return (
            <DiscoveryCard key={card.id || i} opp={opp} imageUrl={imgData.url || null} imgReady={!!imgData.ready}
              onPreview={(o, u) => setPreview({ opp: o, imageUrl: u })}
              onUseIdea={o => setRouting({ opp: o, imageUrl: imgData.url || null })}
              onSave={(o, u) => handleSave(o, u)}
              saved={savedSet.has(card.id)} />
          );
        })}
      </div>

      {preview && (
        <PreviewModal opp={preview.opp} imageUrl={preview.imageUrl} activeBrand={activeBrand}
          onClose={() => setPreview(null)}
          onUseIdea={o => { setPreview(null); setRouting({ opp: o, imageUrl: preview.imageUrl }); }} />
      )}
      {routing && (
        <RouteModal opp={routing.opp} imageUrl={routing.imageUrl} switchTab={switchTab} onClose={() => setRouting(null)} />
      )}
    </div>
  );
}

// ── Playbooks Tab ─────────────────────────────────────────────────────────────
const PLAYBOOK_TYPES = [
  { id:"authority-building",   name:"Authority Building",   icon:"fas fa-crown",         accent:"#d97706", desc:"Position as the definitive expert in your category." },
  { id:"product-launch",       name:"Product Launch",       icon:"fas fa-rocket",        accent:"#7c3aed", desc:"Announce and amplify your next product or service." },
  { id:"lead-generation",      name:"Lead Generation",      icon:"fas fa-funnel-dollar", accent:"#059669", desc:"Convert attention into qualified leads and enquiries." },
  { id:"community-engagement", name:"Community Engagement", icon:"fas fa-users",         accent:"#2563eb", desc:"Build conversations and deepen audience loyalty." },
  { id:"brand-story",          name:"Brand Story",          icon:"fas fa-heart",         accent:"#dc2626", desc:"Share the origin, values, and human side of your brand." },
  { id:"thought-leadership",   name:"Thought Leadership",   icon:"fas fa-lightbulb",     accent:"#0891b2", desc:"Stake territory with bold industry perspectives." },
  { id:"seasonal-campaign",    name:"Seasonal Campaign",    icon:"fas fa-calendar-alt",  accent:"#6366f1", desc:"Align content with events, seasons, and cultural moments." },
];

function PlaybooksTab({ activeBrand, switchTab }) {
  const [search, setSearch] = useState("");
  const [wizard, setWizard] = useState(null);
  const filtered = PLAYBOOK_TYPES.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()));
  if (wizard) return <PlaybookWizard playbook={wizard} activeBrand={activeBrand} switchTab={switchTab} onClose={() => setWizard(null)} />;

  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:32, padding:"0 20px" }}>
        <div style={{ fontSize:22, fontWeight:800, color:"var(--text-main)", marginBottom:8 }}>What are you trying to achieve?</div>
        <div style={{ fontSize:14, color:"var(--text-muted)", marginBottom:20 }}>Select a playbook to generate a full content strategy.</div>
        <div style={{ maxWidth:480, margin:"0 auto", position:"relative" }}>
          <i className="fas fa-search" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--slate-400)", fontSize:13 }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Describe your goal..."
            style={{ width:"100%", padding:"12px 14px 12px 38px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", fontSize:14, color:"var(--text-main)", boxSizing:"border-box", outline:"none", background:"var(--surface-primary)" }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--pilot-blue)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = ""; }} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => setWizard(p)}
            style={{ border:"2px solid var(--border-subtle)", borderRadius:"var(--radius-lg)", padding:"20px 20px 16px", background:"var(--surface-primary)", cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.boxShadow = `0 8px 24px ${p.accent}20`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`${p.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className={p.icon} style={{ fontSize:18, color:p.accent }} />
              </div>
              <div style={{ fontSize:14, fontWeight:800, color:"var(--text-main)", lineHeight:1.2 }}>{p.name}</div>
            </div>
            <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:14 }}>{p.desc}</div>
            <div style={{ padding:"9px 0", borderRadius:"var(--radius-md)", textAlign:"center", background:`${p.accent}12`, color:p.accent, fontWeight:700, fontSize:13 }}>
              Start Playbook →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Playbook Wizard ───────────────────────────────────────────────────────────
function PlaybookWizard({ playbook, activeBrand, switchTab, onClose }) {
  const [step,          setStep]         = useState(1);
  const [industry,      setIndustry]     = useState(activeBrand?.industry || "");
  const [srcType,       setSrcType]      = useState("brand-dna");
  const [inputData,     setInputData]    = useState("");
  const [websiteUrl,    setWebsiteUrl]   = useState("");
  const [websiteCtx,    setWebsiteCtx]   = useState(null);
  const [websiteLoading,setWebsiteLoading]= useState(false);
  const [websiteErr,    setWebsiteErr]   = useState("");
  const [intensity,     setIntensity]    = useState("medium");
  const [channels,      setChannels]     = useState([]);
  const [result,        setResult]       = useState(null);
  const [loading,       setLoading]      = useState(false);
  const [err,           setErr]          = useState("");
  const CHANNELS = ["LinkedIn","Instagram","Facebook","TikTok","Twitter/X","YouTube","Blog"];

  useEffect(() => {
    if (!activeBrand?.id) return;
    apiRequest('/api/customer/brand-dna')
      .then(res => {
        if (res.profile?.website_url) {
          setWebsiteUrl(res.profile.website_url);
        }
      })
      .catch(() => {});
  }, [activeBrand?.id]);

  async function handleWebsiteImport() {
    if (!websiteUrl.trim()) return;
    setWebsiteLoading(true); setWebsiteErr("");
    try {
      const data = await apiRequest("/api/customer/studio/scrape-website", {
        method: "POST",
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });
      if (data.success && data.brandContext) {
        setWebsiteCtx(data.brandContext);
      } else {
        setWebsiteErr(data.error || "Could not extract content. Try manual input.");
      }
    } catch (e) {
      setWebsiteErr(e.message || "Website import failed.");
    } finally {
      setWebsiteLoading(false);
    }
  }

  async function generate() {
    setStep(5); setLoading(true); setErr("");
    try {
      const data = await apiRequest("/api/customer/studio/playbook", {
        method: "POST",
        body: JSON.stringify({
          playbook_type: playbook.id, industry, input_data: inputData,
          intensity, channels,
          website_context: websiteCtx || undefined,
        }),
      });
      setResult(data); setStep(6);
    } catch (e) { setErr(e.message || "Generation failed. Try again."); setStep(4); }
    finally { setLoading(false); }
  }

  const STEPS = ["Industry","Source","Review","Configure"];

  return (
    <div>
      <button type="button" onClick={onClose} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontWeight:600, fontSize:13, padding:"0 0 20px 0" }}>
        <i className="fas fa-arrow-left" style={{ fontSize:11 }} /> All Playbooks
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div style={{ width:40, height:40, borderRadius:11, background:`${playbook.accent}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className={playbook.icon} style={{ fontSize:18, color:playbook.accent }} />
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:playbook.accent, letterSpacing:1, textTransform:"uppercase" }}>Playbook Wizard</div>
          <div style={{ fontSize:18, fontWeight:800, color:"var(--text-main)" }}>{playbook.name}</div>
        </div>
      </div>

      {step < 5 && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:28 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: i+1 < step ? playbook.accent : i+1 === step ? playbook.accent : "var(--hover-bg)", color: i+1 <= step ? "#fff" : "var(--slate-400)", fontSize:10, fontWeight:700 }}>
                  {i+1 < step ? "✓" : i+1}
                </div>
                <span style={{ fontSize:10, color: i+1 <= step ? playbook.accent : "var(--slate-400)", fontWeight:600 }}>{s}</span>
              </div>
              {i < 3 && <div style={{ flex:1, height:1, background: i+1 < step ? `${playbook.accent}50` : "var(--border-subtle)" }} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ maxWidth:560 }}>

        {/* ── STEP 1: Industry selector ── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>What industry are you in?</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>We'll tailor the playbook to your specific market context.</div>
            <IndustryAutoSuggest
              value={industry}
              onChange={val => setIndustry(val)}
              placeholder="Search or select industry..."
              style={{ width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", fontSize:14, color: "var(--text-main)", boxSizing:"border-box", outline:"none", background:"var(--surface-primary)" }}
              required={true}
            />
            <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
              <button type="button" onClick={() => setStep(2)} disabled={!industry.trim()}
                style={{ padding:"10px 24px", borderRadius:"var(--radius-md)", border:"none", background: industry.trim() ? playbook.accent : "var(--border-subtle)", color: industry.trim() ? "#fff" : "var(--text-muted)", fontWeight:700, fontSize:14, cursor: industry.trim() ? "pointer" : "default" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Source data ── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>Where should we get source data?</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>Richer context produces better content.</div>
            {[
              { id:"brand-dna",      label:"Brand DNA",                 desc:"Use your stored brand profile.", icon:"🧬" },
              { id:"website",        label:"Website Import",             desc:"Crawl your website — products, services, copy, pricing.", icon:"🌐" },
              { id:"manual",         label:"Manual Input",               desc:"Provide specific context for this run.", icon:"✍️" },
              { id:"repurpose",      label:"Repurpose Existing Content", desc:"Paste content to transform into fresh posts.", icon:"🔄" },
            ].map(opt => (
              <div key={opt.id} onClick={() => setSrcType(opt.id)}
                style={{ border:`2px solid ${srcType === opt.id ? playbook.accent : "var(--border-subtle)"}`, borderRadius:"var(--radius-md)", padding:"13px 16px", marginBottom:10, cursor:"pointer", background: srcType === opt.id ? `${playbook.accent}08` : "var(--surface-primary)", transition:"all 0.15s" }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"var(--text-main)" }}>{opt.label}</div>
                    <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{opt.desc}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Website URL input */}
            {srcType === "website" && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    style={{ flex:1, padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", fontSize:13, color:"var(--text-main)", boxSizing:"border-box", outline:"none" }}
                    onKeyDown={e => { if (e.key === "Enter" && websiteUrl.trim()) handleWebsiteImport(); }}
                  />
                  <button type="button" onClick={handleWebsiteImport} disabled={!websiteUrl.trim() || websiteLoading}
                    style={{ padding:"10px 16px", borderRadius:"var(--radius-md)", border:"none", background:"var(--pilot-blue)", color:"#fff", fontWeight:700, fontSize:13, cursor: websiteUrl.trim() && !websiteLoading ? "pointer" : "default", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
                    {websiteLoading ? <><div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"cs-spin 1s linear infinite" }} /> Scanning…</> : "Import"}
                  </button>
                </div>
                {websiteErr && <div style={{ marginTop:8, fontSize:12, color:"var(--status-danger)" }}>{websiteErr}</div>}
                {websiteCtx && (
                  <div style={{ marginTop:10, background:"var(--surface-secondary)", border:"1px solid var(--status-success)", borderRadius:"var(--radius-md)", padding:"10px 14px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--status-success)", marginBottom:6 }}>
                      <i className="fas fa-check-circle me-1" /> Website imported successfully
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>
                      {websiteCtx.business_name && <span style={{ marginRight:12 }}>Business: <strong>{websiteCtx.business_name}</strong></span>}
                      {websiteCtx.services?.length > 0 && <span>{websiteCtx.services.length} services found</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(srcType === "manual" || srcType === "repurpose") && (
              <textarea value={inputData} onChange={e => setInputData(e.target.value)}
                placeholder={srcType === "manual" ? "Key messages, angles, specific details..." : "Paste existing content to repurpose..."}
                style={{ width:"100%", padding:"11px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", fontSize:13, color:"var(--text-main)", resize:"vertical", minHeight:90, boxSizing:"border-box", lineHeight:1.6, outline:"none", marginTop:6 }} />
            )}

            <div style={{ marginTop:16, display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding:"9px 18px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={() => setStep(3)}
                disabled={srcType === "website" && !websiteCtx && !websiteLoading && websiteUrl.trim() === ""}
                style={{ padding:"9px 22px", borderRadius:"var(--radius-md)", border:"none", cursor:"pointer", background:playbook.accent, color:"#fff", fontWeight:700, fontSize:13 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>Review your inputs</div>
            <div style={{ border:"1px solid var(--border-subtle)", borderRadius:"var(--radius-lg)", overflow:"hidden", marginBottom:20 }}>
              {[
                { label:"Brand",    value: activeBrand?.name || "Your Brand" },
                { label:"Industry", value: industry },
                { label:"Playbook", value: playbook.name },
                { label:"Source",   value: srcType === "brand-dna" ? "Brand DNA" : srcType === "website" ? `Website: ${websiteUrl}` : srcType === "manual" ? "Manual input" : "Repurpose existing" },
                websiteCtx?.business_name ? { label:"Website", value: `Imported ${websiteCtx.services?.length || 0} services, ${websiteCtx.products?.length || 0} products` } : null,
                inputData ? { label:"Context", value: inputData.slice(0,200) + (inputData.length > 200 ? "…" : "") } : null,
              ].filter(Boolean).map((row, i, arr) => (
                <div key={i} style={{ display:"flex", gap:16, padding:"11px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--hover-bg)" : "none", background: i%2===0 ? "var(--surface-primary)" : "var(--surface-secondary)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--slate-400)", textTransform:"uppercase", letterSpacing:0.5, width:90, flexShrink:0 }}>{row.label}</div>
                  <div style={{ fontSize:13, color:"var(--text-main)" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(2)} style={{ padding:"9px 18px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={() => setStep(4)} style={{ padding:"9px 22px", borderRadius:"var(--radius-md)", border:"none", cursor:"pointer", background:playbook.accent, color:"#fff", fontWeight:700, fontSize:13 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Configure ── */}
        {step === 4 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>Configure execution</div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text-main)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Content Volume</div>
              <div style={{ display:"flex", gap:8 }}>
                {[{id:"low",label:"Low",sub:"6 cards"},{id:"medium",label:"Medium",sub:"8 cards"},{id:"high",label:"High",sub:"12 cards"}].map(opt => (
                  <div key={opt.id} onClick={() => setIntensity(opt.id)}
                    style={{ flex:1, border:`2px solid ${intensity===opt.id ? playbook.accent : "var(--border-subtle)"}`, borderRadius:"var(--radius-md)", padding:"12px 8px", textAlign:"center", cursor:"pointer", background: intensity===opt.id ? `${playbook.accent}08` : "var(--surface-primary)", transition:"all 0.15s" }}>
                    <div style={{ fontSize:14, fontWeight:700, color: intensity===opt.id ? playbook.accent : "var(--text-main)" }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>{opt.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text-main)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Channels</div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {CHANNELS.map(ch => (
                  <button key={ch} type="button" onClick={() => setChannels(p => p.includes(ch) ? p.filter(c=>c!==ch) : [...p,ch])}
                    style={{ padding:"6px 13px", borderRadius:99, border:"1px solid", borderColor: channels.includes(ch) ? playbook.accent : "var(--border-subtle)", background: channels.includes(ch) ? playbook.accent : "var(--surface-primary)", color: channels.includes(ch) ? "#fff" : "var(--text-main)", fontWeight:600, fontSize:12, cursor:"pointer", transition:"all 0.15s" }}>{ch}
                  </button>
                ))}
              </div>
            </div>
            {err && <div style={{ background:"var(--surface-primary)", border:"1px solid var(--status-danger)", borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:14, fontSize:13, color:"var(--status-danger)" }}>{err}</div>}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(3)} style={{ padding:"9px 18px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={generate} style={{ padding:"9px 22px", borderRadius:"var(--radius-md)", border:"none", cursor:"pointer", background:playbook.accent, color:"#fff", fontWeight:700, fontSize:13 }}>Generate Playbook</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Generating ── */}
        {step === 5 && loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <style>{CSS}</style>
            <div style={{ width:48, height:48, border:`4px solid ${playbook.accent}30`, borderTopColor:playbook.accent, borderRadius:"50%", margin:"0 auto 20px", animation:"cs-spin 1s linear infinite" }} />
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>Building your playbook...</div>
            <div style={{ fontSize:13, color:"var(--text-muted)" }}>Generating content cards. This may take a moment.</div>
          </div>
        )}

        {/* ── STEP 6: Results — asset cards ── */}
        {step === 6 && result && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--surface-primary)", border:"1px solid var(--status-success)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:"var(--status-success)", fontSize:14 }}>✓</span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)" }}>{result.cards?.length || 0} content cards generated</div>
                </div>
                {result.summary && <div style={{ fontSize:13, color:"var(--text-muted)", marginLeft:38 }}>{result.summary}</div>}
              </div>
              <button type="button" onClick={() => setStep(4)} style={{ padding:"7px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                ← Regenerate
              </button>
            </div>
            <AssetCardGrid cards={result.cards || []} activeBrand={activeBrand} switchTab={switchTab} source="playbook" />
            {result.schedule_suggestion && (
              <div style={{ marginTop:16, background:"var(--pilot-blue-light)", border:"1px solid var(--pilot-blue)", borderRadius:"var(--radius-md)", padding:"10px 14px", fontSize:12, color:"var(--pilot-blue)" }}>
                <i className="fas fa-calendar-alt me-2" />{result.schedule_suggestion}
              </div>
            )}
            <div style={{ marginTop:16, display:"flex", gap:10 }}>
              <button type="button" onClick={onClose} style={{ padding:"11px 20px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-secondary)", color:"var(--text-main)", fontWeight:600, fontSize:13, cursor:"pointer" }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaign Content Tab ──────────────────────────────────────────────────────
function CampaignContentTab({ activeBrand, switchTab }) {
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result,     setResult]     = useState(null);
  const [err,        setErr]        = useState("");

  useEffect(() => {
    apiRequest("/api/customer/campaigns")
      .then(data => setCampaigns(data.data || data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!selected) return;
    setGenerating(true); setErr(""); setResult(null);
    try {
      const data = await apiRequest("/api/customer/studio/campaign", {
        method:"POST",
        body: JSON.stringify({
          campaign_name: selected.name,
          offer: selected.description || selected.goal || selected.name,
          goal: selected.objective || selected.goal || "",
          channels: selected.channels || [],
          campaign_id: selected.id || selected.campaign_id,
        }),
      });
      setResult(data);
    } catch (e) { setErr(e.message || "Generation failed. Try again."); }
    finally { setGenerating(false); }
  }

  if (loading) return (
    <div><style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3].map(i => <div key={i} className="cs-shimmer" style={{ height:72, borderRadius:"var(--radius-md)" }} />)}
      </div>
    </div>
  );

  if (result) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)" }}>
            {result.cards?.length || 0} campaign cards — {selected?.name}
          </div>
          {result.campaign_summary && <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>{result.campaign_summary}</div>}
        </div>
        <button type="button" onClick={() => { setResult(null); }} style={{ padding:"8px 16px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:12, cursor:"pointer" }}>← Back</button>
      </div>

      <AssetCardGrid cards={result.cards || []} activeBrand={activeBrand} switchTab={switchTab} source="campaign" />

      {result.article && (
        <div style={{ marginTop:20, border:"1px solid var(--border-subtle)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:"var(--surface-secondary)", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--pilot-blue)" }}>Article / Blog</div>
            <button type="button" onClick={() => switchTab("blog")} style={{ padding:"4px 10px", borderRadius:"var(--radius-md)", border:"1px solid var(--pilot-blue)", background:"var(--pilot-blue-light)", color:"var(--pilot-blue)", fontWeight:700, fontSize:11, cursor:"pointer" }}>Open in Create Article</button>
          </div>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--text-main)", marginBottom:8 }}>{result.article.title}</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.65 }}>{result.article.intro}</div>
            {result.article.cta && <div style={{ marginTop:8, fontSize:12, fontWeight:600, color:"var(--pilot-blue)" }}>CTA: {result.article.cta}</div>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)" }}>Generate Campaign Content</div>
        <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>Select an existing campaign — we'll generate a full visual asset set.</div>
      </div>
      {campaigns.length === 0 ? (
        <div style={{ border:"1px dashed var(--border-subtle)", borderRadius:"var(--radius-lg)", padding:"56px 24px", textAlign:"center", background:"var(--surface-secondary)" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>No campaigns found</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>Create a campaign first — Studio uses your campaign as the content source.</div>
          <button type="button" onClick={() => switchTab("campaign")} style={{ padding:"10px 24px", borderRadius:"var(--radius-md)", border:"none", cursor:"pointer", background:"var(--pilot-blue)", color:"#fff", fontWeight:700, fontSize:14 }}>Go to Campaigns</button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {campaigns.slice(0,10).map(c => (
              <div key={c.id || c.campaign_id} onClick={() => setSelected(c)}
                style={{ border:`2px solid ${selected?.id === c.id ? "var(--pilot-blue)" : "var(--border-subtle)"}`, borderRadius:"var(--radius-lg)", padding:"14px 18px", cursor:"pointer", background: selected?.id === c.id ? "var(--pilot-blue-light)" : "var(--surface-primary)", transition:"all 0.15s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"var(--text-main)" }}>{c.name}</div>
                    {(c.description || c.goal || c.objective) && <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{c.description || c.goal || c.objective}</div>}
                  </div>
                  {selected?.id === c.id && <span style={{ fontSize:18, color:"var(--pilot-blue)" }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
          {err && <div style={{ background:"var(--surface-primary)", border:"1px solid var(--status-danger)", borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:14, fontSize:13, color:"var(--status-danger)" }}>{err}</div>}
          <button type="button" onClick={generate} disabled={!selected || generating}
            style={{ padding:"13px 32px", borderRadius:"var(--radius-md)", border:"none", cursor: selected ? "pointer" : "default", background: selected ? "var(--pilot-blue)" : "var(--border-subtle)", color: selected ? "#fff" : "var(--text-muted)", fontWeight:700, fontSize:15, display:"flex", alignItems:"center", gap:10 }}>
            {generating && <div style={{ width:17, height:17, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"cs-spin 1s linear infinite" }} />}
            <style>{CSS}</style>
            {generating ? "Generating cards..." : "Generate Campaign Cards"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Content Vault Tab ─────────────────────────────────────────────────────────
const VAULT_SUB_TABS = [
  { id:"posts",            label:"Posts" },
  { id:"carousels",        label:"Carousels" },
  { id:"articles",         label:"Articles" },
  { id:"playbook-outputs", label:"Playbook Outputs" },
  { id:"campaign-outputs", label:"Campaign Outputs" },
];

function StudioVaultTab({ activeBrand, switchTab }) {
  const [subTab,  setSubTab]  = useState("posts");
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const data = await apiRequest("/api/customer/studio/vault");
      setItems(data.data || data.items || []);
    } catch (e) { setErr(e.message || "Failed to load vault."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function deleteItem(id) {
    try { await apiRequest(`/api/customer/vault/${id}`, { method:"DELETE" }); setItems(prev => prev.filter(i => (i.content_id || i.id) !== id)); }
    catch { setErr("Delete failed."); }
  }

  async function shareForApproval(item) {
    try { await apiRequest(`/api/customer/vault/${item.content_id || item.id}`, { method:"PATCH", body: JSON.stringify({ lifecycle_status:"approval_requested" }) }); load(); }
    catch { setErr("Share failed."); }
  }

  function filterBySubTab(item) {
    const type = (item.content_type || item.type || "").toLowerCase();
    const title = (item.title || "").toLowerCase();
    if (subTab === "posts")            return type === "social" && !title.includes("carousel");
    if (subTab === "carousels")        return title.includes("carousel") || type === "carousel";
    if (subTab === "articles")         return type === "article" || type === "blog";
    if (subTab === "playbook-outputs") return title.includes("playbook") || (item.source === "studio" && type === "social" && title.includes("output"));
    if (subTab === "campaign-outputs") return title.includes("campaign") || title.includes(" — social") || title.includes(" — article") || title.includes(" — cta");
    return true;
  }

  // Parse metadata for image display
  function getItemImage(item) {
    try {
      const meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
      return meta?.image || null;
    } catch { return null; }
  }

  const visible = items.filter(filterBySubTab);
  const thS = { padding:"9px 14px", fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1, textAlign:"left", whiteSpace:"nowrap", borderBottom:"1px solid var(--border-subtle)", background:"var(--surface-secondary)" };
  const tdS = { padding:"12px 14px", fontSize:13, color:"var(--text-main)", borderBottom:"1px solid var(--hover-bg)", verticalAlign:"top" };

  return (
    <div>
      <style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)" }}>Content Vault</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>Studio-generated drafts. Open in editor to refine before publishing.</div>
        </div>
        <button type="button" onClick={load} style={{ padding:"7px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
          <i className="fas fa-sync-alt" style={{ fontSize:10 }} /> Refresh
        </button>
      </div>

      <div style={{ display:"flex", gap:0, background:"var(--hover-bg)", borderRadius:"var(--radius-lg)", padding:3, marginBottom:20, overflow:"hidden" }}>
        {VAULT_SUB_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSubTab(t.id)} style={{ flex:1, padding:"7px 0", border:"none", borderRadius:"var(--radius-md)", cursor:"pointer", fontSize:12, fontWeight: subTab === t.id ? 700 : 500, background: subTab === t.id ? "var(--surface-primary)" : "transparent", color: subTab === t.id ? "var(--text-main)" : "var(--text-muted)", boxShadow: subTab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition:"all 0.15s", whiteSpace:"nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background:"var(--pilot-blue-light)", border:"1px solid var(--pilot-blue)", borderRadius:"var(--radius-md)", padding:"10px 16px", marginBottom:16, fontSize:12, color:"var(--pilot-blue)" }}>
        Studio-generated drafts. Open in editor → refine → send for approval → schedule. Studio never publishes.
      </div>

      {loading && <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{[1,2,3].map(i => <div key={i} className="cs-shimmer" style={{ height:64, borderRadius:"var(--radius-md)" }} />)}</div>}
      {!loading && err && <div style={{ background:"var(--surface-primary)", border:"1px solid var(--status-danger)", borderRadius:"var(--radius-md)", padding:"10px 14px", fontSize:13, color:"var(--status-danger)", marginBottom:12 }}>{err}</div>}
      {!loading && !err && visible.length === 0 && (
        <div style={{ border:"1px dashed var(--border-subtle)", borderRadius:"var(--radius-lg)", padding:"56px 24px", textAlign:"center", background:"var(--surface-secondary)" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>🗂️</div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--text-main)", marginBottom:6 }}>No drafts in this category</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Generate content in Posts, Playbooks, or Campaign Content — it lands here.</div>
        </div>
      )}

      {!loading && !err && visible.length > 0 && (
        <div style={{ border:"1px solid var(--border-subtle)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thS, width:48 }}>Image</th>
                <th style={thS}>Title</th>
                <th style={{ ...thS, width:100 }}>Status</th>
                <th style={{ ...thS, width:120 }}>Created</th>
                <th style={{ ...thS, width:220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(item => {
                const id = item.content_id || item.id;
                const status = item.lifecycle_status || "draft";
                const statusColor = status === "approval_requested" ? { bg:"var(--surface-secondary)", color:"var(--status-warning)" } : { bg:"var(--hover-bg)", color:"var(--text-muted)" };
                const imgUrl = getItemImage(item);
                return (
                  <tr key={id}>
                    <td style={{ ...tdS, padding:"8px 10px" }}>
                      {imgUrl ? (
                        <div style={{ width:36, height:36, borderRadius:"var(--radius-md)", overflow:"hidden", flexShrink:0 }}>
                          <img src={imgUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        </div>
                      ) : (
                        <div style={{ width:36, height:36, borderRadius:"var(--radius-md)", background:"var(--hover-bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <i className="fas fa-image" style={{ fontSize:12, color:"var(--slate-400)" }} />
                        </div>
                      )}
                    </td>
                    <td style={tdS}>
                      <div style={{ fontWeight:600, color:"var(--text-main)", marginBottom:2 }}>{item.title || "Untitled Draft"}</div>
                      {item.body && <div style={{ fontSize:11, color:"var(--text-muted)", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{item.body}</div>}
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:statusColor.bg, color:statusColor.color, textTransform:"uppercase", letterSpacing:0.5 }}>{status.replace(/_/g," ")}</span>
                    </td>
                    <td style={{ ...tdS, fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"}
                    </td>
                    <td style={tdS}>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <button type="button" onClick={() => switchTab("social")} style={{ padding:"4px 9px", borderRadius:"var(--radius-md)", border:"1px solid var(--pilot-blue)", background:"var(--pilot-blue-light)", color:"var(--pilot-blue)", fontWeight:700, fontSize:11, cursor:"pointer" }}>Open Editor</button>
                        {status !== "approval_requested" && (
                          <button type="button" onClick={() => shareForApproval(item)} style={{ padding:"4px 9px", borderRadius:"var(--radius-md)", border:"1px solid var(--status-success)", background:"var(--surface-primary)", color:"var(--status-success)", fontWeight:700, fontSize:11, cursor:"pointer" }}>Share</button>
                        )}
                        <button type="button" onClick={() => switchTab("schedule")} style={{ padding:"4px 9px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-subtle)", background:"var(--surface-primary)", color:"var(--text-main)", fontWeight:600, fontSize:11, cursor:"pointer" }}>Schedule</button>
                        <button type="button" onClick={() => deleteItem(id)} style={{ padding:"4px 7px", borderRadius:"var(--radius-md)", border:"1px solid var(--status-danger)", background:"var(--surface-primary)", color:"var(--status-danger)", fontWeight:700, fontSize:11, cursor:"pointer" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AIContentStudio({ activeBrand, intelligenceFeed = [], connectedPlatforms = [], switchTab }) {
  const [activeTab, setActiveTab] = useState("posts");

  const TABS = [
    { id:"posts",            label:"Posts" },
    { id:"playbooks",        label:"Playbooks" },
    { id:"campaign-content", label:"Campaign Content" },
    { id:"vault",            label:"Content Vault" },
  ];

  return (
    <div style={{ padding:"24px 0" }}>
      <style>{CSS}</style>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"var(--pilot-blue)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <i className="fas fa-magic" style={{ fontSize:16, color:"#fff" }} />
          </div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"var(--text-main)", margin:0, lineHeight:1.2 }}>AI Content Studio</h2>
            <div style={{ fontSize:12, color:"var(--pilot-blue)", fontWeight:600, marginTop:1, letterSpacing:0.2 }}>
              Discover → Generate → Refine → Approve → Schedule
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:0, background:"var(--hover-bg)", borderRadius:"var(--radius-lg)", padding:4, maxWidth:520, marginBottom:28 }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{ flex:1, padding:"8px 0", border:"none", borderRadius:"var(--radius-md)", cursor:"pointer", fontSize:13, fontWeight: activeTab === t.id ? 700 : 500, background: activeTab === t.id ? "var(--surface-primary)" : "transparent", color: activeTab === t.id ? "var(--text-main)" : "var(--text-muted)", boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none", transition:"all 0.15s" }}>{t.label}</button>
        ))}
      </div>
      {activeTab === "posts"            && <PostsTab            activeBrand={activeBrand} connectedPlatforms={connectedPlatforms} switchTab={switchTab} />}
      {activeTab === "playbooks"        && <PlaybooksTab        activeBrand={activeBrand} switchTab={switchTab} />}
      {activeTab === "campaign-content" && <CampaignContentTab  activeBrand={activeBrand} switchTab={switchTab} />}
      {activeTab === "vault"            && <StudioVaultTab      activeBrand={activeBrand} switchTab={switchTab} />}
    </div>
  );
}
