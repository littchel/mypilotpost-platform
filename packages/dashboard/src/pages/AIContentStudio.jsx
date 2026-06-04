import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api/client";

// ── Styles ─────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes cs-spin    { to { transform:rotate(360deg) } }
@keyframes cs-in      { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
@keyframes cs-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.cs-shimmer {
  background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size:200% 100%;
  animation:cs-shimmer 1.4s infinite;
}
.cs-card { animation:cs-in 0.3s ease both; }
.cs-card:hover { transform:translateY(-3px)!important; box-shadow:0 16px 48px rgba(0,0,0,0.12)!important; }
`;

// ── Calendar events ────────────────────────────────────────────────────────────
const ANNUAL_EVENTS = [
  { name:"Valentine's Day",         month:1,  day:14,  icon:"❤️",  accent:"#e11d48", tag:"Seasonal",  suggested:"Offer Campaign" },
  { name:"International Women's Day",month:2,  day:8,   icon:"💜",  accent:"#7c3aed", tag:"Seasonal",  suggested:"Brand Story" },
  { name:"Earth Day",                month:3,  day:22,  icon:"🌍",  accent:"#059669", tag:"Seasonal",  suggested:"Brand Values" },
  { name:"Mother's Day",             month:4,  day:11,  icon:"🌸",  accent:"#db2777", tag:"Seasonal",  suggested:"Offer Campaign" },
  { name:"Father's Day",             month:5,  day:15,  icon:"👔",  accent:"#2563eb", tag:"Seasonal",  suggested:"Offer Campaign" },
  { name:"Black Friday",             month:10, day:28,  icon:"🛍️",  accent:"#111827", tag:"Seasonal",  suggested:"Sales Campaign" },
  { name:"Cyber Monday",             month:11, day:1,   icon:"💻",  accent:"#4f46e5", tag:"Seasonal",  suggested:"Promotion" },
  { name:"Christmas",                month:11, day:25,  icon:"🎄",  accent:"#dc2626", tag:"Seasonal",  suggested:"Brand Story" },
  { name:"New Year's Eve",           month:11, day:31,  icon:"🎆",  accent:"#f59e0b", tag:"Seasonal",  suggested:"Year Recap" },
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

// ── Content Confidence Score ───────────────────────────────────────────────────
function calcCCS(activeBrand, connectedPlatforms) {
  let score = 0;
  const missing = [];

  if (activeBrand?.name)     score += 5;
  if (activeBrand?.industry) score += 10;
  if (activeBrand?.website)  score += 8; else missing.push("Website URL");

  // Brand DNA
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

  score += 15; // calendar intelligence always available

  const s = Math.min(score, 100);
  return {
    score: s,
    missing,
    level: s < 50 ? "weak" : s < 75 ? "good" : "high",
  };
}

// ── Visual preview thumbnails ──────────────────────────────────────────────────
// Represent content FORMAT/TYPE — not generated text.

function PreviewDarkStatement({ accent = "#7c3aed" }) {
  return (
    <div style={{ height:"100%", background:"#0f172a", display:"flex", flexDirection:"column", justifyContent:"center", padding:"20px 22px", position:"relative" }}>
      <div style={{ width:32, height:3, background:accent, borderRadius:2, marginBottom:14 }} />
      <div style={{ fontSize:14, fontWeight:800, color:"#f8fafc", lineHeight:1.45, marginBottom:10 }}>
        The one thing the industry won't tell you about growing faster.
      </div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.22)", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>@yourbrand</div>
      <div style={{ position:"absolute", bottom:14, right:16, width:20, height:20, borderRadius:"50%", background:accent, opacity:0.18 }} />
    </div>
  );
}

function PreviewCarousel({ accent = "#2563eb" }) {
  return (
    <div style={{ height:"100%", background:"#fff", display:"flex", flexDirection:"column", padding:"18px 22px 14px", position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:8, fontWeight:800, color:accent, textTransform:"uppercase", letterSpacing:2 }}>CAROUSEL</span>
        <span style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>1 / 5</span>
      </div>
      <div style={{ fontSize:15, fontWeight:800, color:"#0f172a", lineHeight:1.3, flex:1 }}>5 Things That Changed Our Business Forever</div>
      <div style={{ display:"flex", gap:4, marginTop:12 }}>
        <div style={{ width:22, height:4, borderRadius:2, background:accent }} />
        {[1,2,3,4].map(i => <div key={i} style={{ width:7, height:4, borderRadius:2, background:"#e5e7eb" }} />)}
      </div>
      <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", width:26, height:26, borderRadius:"50%", background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:13, color:"#64748b", marginLeft:1 }}>›</span>
      </div>
    </div>
  );
}

function PreviewQuote({ accent = "#7c3aed" }) {
  return (
    <div style={{ height:"100%", background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)", display:"flex", flexDirection:"column", justifyContent:"center", padding:"18px 22px", position:"relative", overflow:"hidden" }}>
      <div style={{ fontSize:56, color:"rgba(255,255,255,0.07)", fontFamily:"Georgia,serif", lineHeight:0.8, position:"absolute", top:6, left:12, userSelect:"none" }}>"</div>
      <div style={{ fontSize:12, color:"#e2e8f0", lineHeight:1.65, fontStyle:"italic", position:"relative", zIndex:1, marginBottom:12 }}>
        "The decision that changed everything was saying no before we said yes."
      </div>
      <div style={{ width:24, height:2, background:accent, borderRadius:2, marginBottom:6 }} />
      <div style={{ fontSize:9, color:accent, fontWeight:700, letterSpacing:0.5 }}>— Founder Story</div>
    </div>
  );
}

function PreviewSplit() {
  return (
    <div style={{ height:"100%", background:"#0f172a", display:"flex", padding:12, gap:8 }}>
      <div style={{ flex:1, background:"rgba(220,38,38,0.15)", borderRadius:8, padding:"12px 10px" }}>
        <div style={{ fontSize:7, fontWeight:800, color:"#dc2626", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>BEFORE</div>
        <div style={{ fontSize:9, color:"#fca5a5", lineHeight:1.55 }}>❌ Hours wasted<br/>❌ No clear system<br/>❌ Constant guessing</div>
      </div>
      <div style={{ flex:1, background:"rgba(5,150,105,0.15)", borderRadius:8, padding:"12px 10px" }}>
        <div style={{ fontSize:7, fontWeight:800, color:"#059669", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>AFTER</div>
        <div style={{ fontSize:9, color:"#6ee7b7", lineHeight:1.55 }}>✓ Clear process<br/>✓ Consistent results<br/>✓ More time for strategy</div>
      </div>
    </div>
  );
}

function PreviewTips({ accent = "#d97706" }) {
  return (
    <div style={{ height:"100%", background:"#fffbeb", display:"flex", flexDirection:"column", padding:"16px 20px" }}>
      <div style={{ fontSize:12, fontWeight:800, color:"#0f172a", marginBottom:8 }}>5 Mistakes Costing You Clients</div>
      <div style={{ width:"100%", height:2, background:accent, borderRadius:2, marginBottom:10, opacity:0.7 }} />
      {["Targeting too broadly", "No clear value prop", "Missing social proof"].map((t,i) => (
        <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:6 }}>
          <span style={{ fontSize:9, fontWeight:800, color:accent, marginTop:1, flexShrink:0 }}>{i+1}.</span>
          <span style={{ fontSize:10, color:"#374151", lineHeight:1.4 }}>{t}</span>
        </div>
      ))}
      <div style={{ marginTop:"auto", fontSize:8, color:"#9ca3af", fontWeight:600 }}>Save this →</div>
    </div>
  );
}

function PreviewReel({ accent = "#ec4899" }) {
  return (
    <div style={{ height:"100%", background:"linear-gradient(135deg,#0c0a09 0%,#1c1917 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <div style={{ width:0, height:0, borderTop:"8px solid transparent", borderBottom:"8px solid transparent", borderLeft:"14px solid #fff", marginLeft:3 }} />
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:0.5, marginBottom:4 }}>REEL · 60s</div>
      <div style={{ fontSize:8, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>Vertical · 9:16</div>
      <div style={{ position:"absolute", top:12, right:14, fontSize:8, fontWeight:700, color:accent, background:`${accent}22`, padding:"2px 7px", borderRadius:99 }}>TRENDING</div>
    </div>
  );
}

function PreviewStats({ accent = "#2563eb" }) {
  return (
    <div style={{ height:"100%", background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", display:"flex", flexDirection:"column", justifyContent:"center", padding:"16px 22px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:12, letterSpacing:0.5 }}>From the numbers...</div>
      <div style={{ display:"flex", gap:8 }}>
        {[{val:"3.2×",lbl:"ROI"},{val:"47",lbl:"Leads"},{val:"6wk",lbl:"Timeline"}].map((m,i) => (
          <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:8, padding:"10px 4px", textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:900, color:accent, lineHeight:1 }}>{m.val}</div>
            <div style={{ fontSize:7, color:"#64748b", fontWeight:700, marginTop:4, textTransform:"uppercase", letterSpacing:0.5 }}>{m.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSeasonal({ ev }) {
  const accent = ev?.accent || "#f59e0b";
  return (
    <div style={{ height:"100%", background:`linear-gradient(135deg,${accent}20 0%,${accent}0a 100%)`, display:"flex", flexDirection:"column", justifyContent:"center", padding:"18px 22px", position:"relative" }}>
      <div style={{ fontSize:32, marginBottom:10 }}>{ev?.icon || "📅"}</div>
      <div style={{ fontSize:15, fontWeight:800, color:"#111827", marginBottom:6 }}>{ev?.name || "Upcoming Event"}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:13, fontWeight:800, color:accent }}>{ev?.daysAway || "?"} days away</span>
        <span style={{ fontSize:10, color:"#64748b" }}>· {ev?.suggested || "Time it perfectly"}</span>
      </div>
      <div style={{ position:"absolute", top:14, right:16, fontSize:8, fontWeight:700, color:accent, background:`${accent}25`, padding:"2px 8px", borderRadius:99, textTransform:"uppercase", letterSpacing:1 }}>Upcoming</div>
    </div>
  );
}

const THEME_RENDERERS = {
  "dark-statement": (props) => <PreviewDarkStatement {...props} />,
  "carousel":       (props) => <PreviewCarousel {...props} />,
  "quote":          (props) => <PreviewQuote {...props} />,
  "split":          ()      => <PreviewSplit />,
  "tips":           (props) => <PreviewTips {...props} />,
  "reel":           (props) => <PreviewReel {...props} />,
  "stats":          (props) => <PreviewStats {...props} />,
  "seasonal":       (props) => <PreviewSeasonal {...props} />,
};

function resolveTheme(opp) {
  if (opp.calendar_event || opp.framework === "Seasonal") return "seasonal";
  const mt = (opp.media_type || "").toLowerCase();
  if (mt === "carousel")    return "carousel";
  if (mt === "short_video") return "reel";
  if (mt === "quote_card")  return "quote";
  const fw = (opp.framework || "").toLowerCase();
  if (fw.includes("before") || fw.includes("myth"))    return "split";
  if (fw.includes("mistake") || fw.includes("listicle") || fw.includes("faq") || fw.includes("how-to")) return "tips";
  if (fw.includes("stat") || fw.includes("case") || fw.includes("social proof")) return "stats";
  if (fw.includes("customer") || fw.includes("team") || fw.includes("founder")) return "quote";
  if (fw.includes("challenge") || fw.includes("product") || fw.includes("announcement")) return "carousel";
  const cycle = ["dark-statement","carousel","tips","quote","split","reel","stats","dark-statement"];
  return cycle[(opp._index || 0) % cycle.length];
}

function OpportunityPreview({ opp, calendarEvents }) {
  const theme = resolveTheme(opp);
  const calEv  = opp.calendar_event
    ? calendarEvents.find(e => e.name === opp.calendar_event) || calendarEvents[0]
    : null;
  const accent = opp.accent || "#7c3aed";
  const renderer = THEME_RENDERERS[theme] || THEME_RENDERERS["dark-statement"];
  return (
    <div style={{ height:175, overflow:"hidden", borderRadius:"14px 14px 0 0", position:"relative" }}>
      {renderer({ accent, calendarEvent: calEv })}
    </div>
  );
}

// ── Reason chip ───────────────────────────────────────────────────────────────
const REASON_ICONS = {
  engagement:  { icon:"🔥", color:"#dc2626", bg:"#fef2f2" },
  calendar:    { icon:"📅", color:"#d97706", bg:"#fffbeb" },
  campaign:    { icon:"🎯", color:"#7c3aed", bg:"#faf5ff" },
  competition: { icon:"📊", color:"#059669", bg:"#f0fdf4" },
  audience:    { icon:"⚡", color:"#2563eb", bg:"#eff6ff" },
  seasonal:    { icon:"🌟", color:"#d97706", bg:"#fffbeb" },
};

function ReasonChip({ text = "" }) {
  const lower = text.toLowerCase();
  const key = lower.includes("engag") ? "engagement"
    : lower.includes("holiday") || lower.includes("days") || lower.includes("event") ? "calendar"
    : lower.includes("campaign") ? "campaign"
    : lower.includes("competition") || lower.includes("low") ? "competition"
    : lower.includes("audience") || lower.includes("respond") ? "audience"
    : "seasonal";
  const r = REASON_ICONS[key];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, background:r.bg }}>
      <span style={{ fontSize:11 }}>{r.icon}</span>
      <span style={{ fontSize:11, color:r.color, fontWeight:600, lineHeight:1.3 }}>
        Suggested because: {text}
      </span>
    </div>
  );
}

// ── Format pill ───────────────────────────────────────────────────────────────
function FormatPill({ format, effort }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {format && (
        <span style={{ fontSize:10, padding:"3px 9px", borderRadius:99, background:"#f1f5f9", color:"#475569", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>
          {format}
        </span>
      )}
      {effort && (() => {
        const e = (effort || "").toLowerCase();
        return (
          <span style={{
            fontSize:10, padding:"3px 9px", borderRadius:99, fontWeight:700,
            background: e === "low" ? "#f0fdf4" : e === "high" ? "#fef2f2" : "#fffbeb",
            color:      e === "low" ? "#16a34a" : e === "high" ? "#dc2626" : "#d97706",
          }}>
            {effort} effort
          </span>
        );
      })()}
    </div>
  );
}

// ── Opportunity Card ──────────────────────────────────────────────────────────
function OpportunityCard({ opp, calendarEvents, onUse, onSave, onHide }) {
  const [saved,  setSaved]  = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const platforms = Array.isArray(opp.platforms) ? opp.platforms : [];

  function handleSave() {
    setSaved(true);
    onSave(opp);
  }

  return (
    <div className="cs-card" style={{
      border:"1px solid #e5e7eb", borderRadius:14, background:"#fff",
      boxShadow:"0 2px 8px rgba(0,0,0,0.06)", transition:"all 0.22s", display:"flex", flexDirection:"column", overflow:"hidden",
    }}>
      {/* Visual preview */}
      <div style={{ position:"relative", flexShrink:0 }}>
        <OpportunityPreview opp={opp} calendarEvents={calendarEvents} />
        {/* Platform badges — overlay bottom-left */}
        {platforms.length > 0 && (
          <div style={{ position:"absolute", bottom:10, left:12, display:"flex", gap:5 }}>
            {platforms.slice(0,4).map(p => (
              <span key={p} style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:99, background:"rgba(0,0,0,0.55)", color:"#fff", backdropFilter:"blur(4px)", letterSpacing:0.3 }}>{p}</span>
            ))}
          </div>
        )}
        {/* Calendar event badge */}
        {opp.calendar_event && (
          <div style={{ position:"absolute", top:10, right:12, fontSize:9, fontWeight:800, color:"#d97706", background:"rgba(255,255,255,0.92)", padding:"3px 8px", borderRadius:99, boxShadow:"0 1px 4px rgba(0,0,0,0.12)" }}>
            {opp.calendar_event} · {opp.days_away || "soon"}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding:"14px 16px 10px", display:"flex", flexDirection:"column", flex:1, gap:8 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#111827", lineHeight:1.3 }}>
          {opp.idea || opp.title || opp.framework || "Content Opportunity"}
        </div>
        {opp.framework && opp.idea && (
          <span style={{ fontSize:10, fontWeight:700, color:"#7c3aed", textTransform:"uppercase", letterSpacing:1 }}>
            {opp.framework}
          </span>
        )}

        {opp.hook && (
          <div style={{ fontSize:12, color:"#374151", lineHeight:1.55, fontStyle:"italic", borderLeft:"3px solid #e5e7eb", paddingLeft:10 }}>
            "{opp.hook}"
          </div>
        )}

        <FormatPill format={(opp.media_type || opp.format || opp.type || "").replace(/_/g," ")} effort={opp.effort} />

        {(opp.objective || opp.suggested_because || opp.reason) && (
          <ReasonChip text={opp.objective || opp.suggested_because || opp.reason} />
        )}
      </div>

      {/* Actions */}
      <div style={{ padding:"10px 16px 14px", display:"flex", gap:6, borderTop:"1px solid #f1f5f9" }}>
        <button type="button" onClick={() => onUse(opp)} style={{
          flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
          background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", fontWeight:700, fontSize:13,
        }}>
          Use Idea
        </button>
        <button type="button" onClick={handleSave} disabled={saved} style={{
          padding:"9px 12px", borderRadius:8, border:`1px solid ${saved ? "#bbf7d0" : "#e5e7eb"}`,
          background: saved ? "#f0fdf4" : "#fff",
          color: saved ? "#16a34a" : "#6b7280", fontWeight:600, fontSize:12, cursor:saved ? "default" : "pointer",
        }}>
          {saved ? "✓ Saved" : "Save"}
        </button>
        <button type="button" onClick={() => { setHidden(true); onHide(opp); }} style={{
          padding:"9px 12px", borderRadius:8, border:"1px solid #e5e7eb",
          background:"#fff", color:"#9ca3af", fontWeight:600, fontSize:12, cursor:"pointer",
        }} title="Hide this idea">
          Hide
        </button>
      </div>
    </div>
  );
}

// ── CCS Bar ────────────────────────────────────────────────────────────────────
function CCSBar({ ccs }) {
  const { score, level, missing } = ccs;
  const color = level === "high" ? "#059669" : level === "good" ? "#d97706" : "#dc2626";
  const label = level === "high" ? "High Confidence" : level === "good" ? "Good Context" : "Weak Context";
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:100, height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:`${score}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.4s ease" }} />
        </div>
        <span style={{ fontSize:11, fontWeight:800, color }}>
          {score} — {label}
        </span>
      </div>
      {missing.length > 0 && (
        <button type="button" onClick={() => setOpen(o => !o)} style={{ fontSize:11, color:"#6b7280", fontWeight:600, background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>
          {open ? "Hide" : `${missing.length} signal${missing.length > 1 ? "s" : ""} missing`}
        </button>
      )}
      {open && (
        <div style={{ width:"100%", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginTop:2 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>Complete these to improve generation quality:</div>
          {missing.map(m => (
            <div key={m} style={{ fontSize:12, color:"#374151", marginBottom:3 }}>• {m}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generation Modal ───────────────────────────────────────────────────────────
function GenerationModal({ opp, ccs, activeBrand, switchTab, onClose }) {
  const [phase,   setPhase]   = useState(ccs.level === "weak" ? "blocked" : "generating");
  const [result,  setResult]  = useState(null);
  const [err,     setErr]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [routed,  setRouted]  = useState(false);

  useEffect(() => {
    if (phase !== "generating") return;
    apiRequest("/api/customer/studio/generate-post", {
      method:"POST",
      body: JSON.stringify({
        framework: opp.framework || opp.type || opp.idea || "General",
        idea:      opp.idea || opp.title || "",
        hook:      opp.hook || "",
        platforms: Array.isArray(opp.platforms) ? opp.platforms : [],
      }),
    }).then(data => {
      setResult(data);
      setPhase("done");
    }).catch(e => {
      setErr(e.message || "Generation failed.");
      setPhase("error");
    });
  }, []);

  async function saveToVault(status = "draft") {
    setSaving(true);
    try {
      const title = result?.title || opp.title || opp.idea || "Studio Draft";
      const body  = result?.body  || result?.content || result?.post_body || result?.suggested_hook || "";
      const saved = await apiRequest("/api/customer/vault", {
        method:"POST",
        body: JSON.stringify({ content_type:"social", title, body, lifecycle_status: status, source:"studio" }),
      });
      setSavedId(saved?.content_id || true);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleRoute(tab, vaultStatus = "draft") {
    if (!savedId) await saveToVault(vaultStatus);
    setRouted(true);
    onClose();
    switchTab(tab);
  }

  const platforms = Array.isArray(opp.platforms) ? opp.platforms : [];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.25)" }}>
        <style>{CSS}</style>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#7c3aed", letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>AI Content Studio · Generation</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>{opp.title || opp.idea || "Generating..."}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:24, lineHeight:1, padding:0, marginLeft:16 }}>×</button>
        </div>

        <div style={{ padding:"20px 24px 28px" }}>

          {/* BLOCKED */}
          {phase === "blocked" && (
            <div>
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"20px 22px", marginBottom:20 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#dc2626", marginBottom:8 }}>Insufficient brand context to generate</div>
                <div style={{ fontSize:13, color:"#374151", marginBottom:14 }}>
                  Content Confidence Score: <strong>{ccs.score}/100</strong> — minimum 50 required.
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Complete these:</div>
                {ccs.missing.map(m => (
                  <div key={m} style={{ fontSize:13, color:"#374151", marginBottom:5 }}>• {m}</div>
                ))}
              </div>
              <button type="button" onClick={onClose} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:14, cursor:"pointer" }}>Close</button>
            </div>
          )}

          {/* GENERATING */}
          {phase === "generating" && (
            <div style={{ textAlign:"center", padding:"56px 0" }}>
              <div style={{ width:48, height:48, border:"4px solid #ede9fe", borderTopColor:"#7c3aed", borderRadius:"50%", margin:"0 auto 20px", animation:"cs-spin 1s linear infinite" }} />
              <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:8 }}>Generating with full brand context...</div>
              <div style={{ fontSize:13, color:"#6b7280", maxWidth:340, margin:"0 auto" }}>
                Brand DNA · {activeBrand?.industry || "industry"} · {platforms.join(" · ") || "selected platforms"}
              </div>
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && (
            <div>
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"14px 18px", marginBottom:16, fontSize:14, color:"#dc2626" }}>{err}</div>
              <button type="button" onClick={() => { setPhase("generating"); setErr(""); }} style={{ padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer", background:"#7c3aed", color:"#fff", fontWeight:700, fontSize:14 }}>
                Retry
              </button>
            </div>
          )}

          {/* DONE */}
          {phase === "done" && result && (
            <div>
              {ccs.level === "good" && (
                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#92400e" }}>
                  Content generated with moderate confidence. Consider completing Brand DNA for stronger outputs.
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
                <div style={{ background:"#f8fafc", borderRadius:10, padding:"12px 16px", display:"flex", gap:16, flexWrap:"wrap" }}>
                  <div><span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:2 }}>Brand</span><span style={{ fontSize:13, color:"#111827", fontWeight:600 }}>{activeBrand?.name || "—"}</span></div>
                  <div><span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:2 }}>Format</span><span style={{ fontSize:13, color:"#111827", fontWeight:600 }}>{opp.format || opp.type || "Social Post"}</span></div>
                  <div><span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:2 }}>Platforms</span><span style={{ fontSize:13, color:"#111827", fontWeight:600 }}>{platforms.join(", ") || "All connected"}</span></div>
                </div>

                {[
                  { label:"Hook",      value: result.hook || result.suggested_hook },
                  { label:"Post Body", value: result.body || result.content || result.post_body },
                  { label:"CTA",       value: result.cta  || result.suggested_cta },
                  { label:"Hashtags",  value: Array.isArray(result.hashtags) ? result.hashtags.join("  ") : result.hashtags },
                ].filter(f => f.value).map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:5 }}>{f.label}</div>
                    <div style={{ fontSize:13, color:"#111827", lineHeight:1.65, whiteSpace:"pre-wrap", background:"#fafafa", borderRadius:8, padding:"10px 14px" }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {savedId && !routed && (
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#15803d", fontWeight:600 }}>
                  ✓ Saved to Content Vault — choose where to open it below
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {!savedId && (
                  <button type="button" onClick={() => saveToVault("draft")} disabled={saving} style={{
                    padding:"13px 0", borderRadius:10, border:"none", cursor:"pointer",
                    background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", fontWeight:700, fontSize:14,
                  }}>
                    {saving ? "Saving..." : "Save To Content Vault"}
                  </button>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <button type="button" onClick={() => handleRoute("social", "draft")} style={{
                    padding:"12px 0", borderRadius:10, border:"1px solid #c4b5fd", background:"#faf5ff",
                    color:"#7c3aed", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>
                    Open in Create Social Post
                  </button>
                  <button type="button" onClick={() => handleRoute("blog", "draft")} style={{
                    padding:"12px 0", borderRadius:10, border:"1px solid #bae6fd", background:"#f0f9ff",
                    color:"#0284c7", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>
                    Open in Create Article
                  </button>
                  <button type="button" onClick={() => handleRoute("social", "approval_requested")} style={{
                    padding:"12px 0", borderRadius:10, border:"1px solid #bbf7d0", background:"#f0fdf4",
                    color:"#059669", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>
                    Share For Approval
                  </button>
                  <button type="button" onClick={() => handleRoute("schedule", "draft")} style={{
                    padding:"12px 0", borderRadius:10, border:"1px solid #e5e7eb", background:"#f9fafb",
                    color:"#374151", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>
                    Schedule
                  </button>
                </div>
                <button type="button" onClick={onClose} style={{
                  padding:"12px 0", borderRadius:10, border:"none", background:"#f3f4f6",
                  color:"#374151", fontWeight:600, fontSize:14, cursor:"pointer",
                }}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Posts Tab ──────────────────────────────────────────────────────────────────
const FILTERS = [
  { id:"for-you",           label:"For You" },
  { id:"upcoming-moments",  label:"Upcoming Moments" },
  { id:"high-conversion",   label:"High Conversion" },
  { id:"thought-leadership",label:"Thought Leadership" },
  { id:"seasonal",          label:"Seasonal" },
  { id:"carousel",          label:"Carousel" },
  { id:"blog-ideas",        label:"Blog Ideas" },
];

function matchFilter(opp, filter) {
  if (filter === "for-you") return true;
  const mt = (opp.media_type || opp.type || opp.format || "").toLowerCase();
  const fw = (opp.framework || opp.category || "").toLowerCase();
  const combined = mt + " " + fw;
  if (filter === "upcoming-moments")   return !!opp.calendar_event;
  if (filter === "high-conversion")    return combined.includes("convert") || combined.includes("lead") || combined.includes("offer") || combined.includes("sale") || fw.includes("generation");
  if (filter === "thought-leadership") return fw.includes("authority") || fw.includes("thought") || fw.includes("predict") || fw.includes("opinion") || fw.includes("insight") || fw.includes("leadership");
  if (filter === "seasonal")           return !!opp.calendar_event || combined.includes("seasonal") || combined.includes("holiday");
  if (filter === "carousel")           return mt.includes("carousel");
  if (filter === "blog-ideas")         return combined.includes("blog") || combined.includes("article") || combined.includes("long");
  return true;
}

function PostsTab({ activeBrand, connectedPlatforms, switchTab }) {
  const [opps,       setOpps]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("for-you");
  const [genModal,   setGenModal]   = useState(null);
  const [saved,      setSaved]      = useState(new Set());
  const [hidden,     setHidden]     = useState(new Set());

  const calendarEvents = getUpcomingEvents();
  const ccs = calcCCS(activeBrand, connectedPlatforms);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/customer/studio/opportunities");
      const list = (data.opportunities || []).map((o, i) => ({ ...o, _index: i }));
      setOpps(list);
    } catch (e) {
      setError(e.message || "Failed to load opportunities.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSave(opp) {
    setSaved(prev => new Set([...prev, opp.id || opp.title]));
    apiRequest("/api/customer/vault", {
      method:"POST",
      body: JSON.stringify({
        content_type:"social", title: opp.title || opp.idea || "Studio Idea",
        body: opp.hook || opp.objective || "", lifecycle_status:"draft", source:"studio",
      }),
    }).catch(() => {});
  }

  const visible = opps
    .filter(o => !hidden.has(o.id || o.title))
    .filter(o => matchFilter(o, filter))
    .slice(0, 20);

  return (
    <div>
      <style>{CSS}</style>

      {/* CCS + refresh row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <CCSBar ccs={ccs} />
        <button type="button" onClick={() => load(true)} disabled={refreshing} style={{
          display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8,
          border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:12, cursor:"pointer",
        }}>
          {refreshing
            ? <><div style={{ width:12, height:12, border:"2px solid #d1d5db", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"cs-spin 1s linear infinite" }} /> Refreshing...</>
            : <><i className="fas fa-sync-alt" style={{ fontSize:10 }} /> Refresh Feed</>
          }
        </button>
      </div>

      {/* Filter rail */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:20, scrollbarWidth:"none" }}>
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} style={{
            flexShrink:0, padding:"7px 16px", borderRadius:99, border:"1px solid",
            borderColor: filter === f.id ? "#7c3aed" : "#e5e7eb",
            background:  filter === f.id ? "#7c3aed" : "#fff",
            color:       filter === f.id ? "#fff" : "#374151",
            fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ border:"1px solid #e5e7eb", borderRadius:14, overflow:"hidden" }}>
              <div className="cs-shimmer" style={{ height:175 }} />
              <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                <div className="cs-shimmer" style={{ height:14, borderRadius:4, width:"75%" }} />
                <div className="cs-shimmer" style={{ height:10, borderRadius:4, width:"90%" }} />
                <div className="cs-shimmer" style={{ height:10, borderRadius:4, width:"55%" }} />
              </div>
              <div style={{ padding:"10px 16px 14px", borderTop:"1px solid #f1f5f9", display:"flex", gap:6 }}>
                <div className="cs-shimmer" style={{ flex:1, height:34, borderRadius:8 }} />
                <div className="cs-shimmer" style={{ width:60, height:34, borderRadius:8 }} />
                <div className="cs-shimmer" style={{ width:60, height:34, borderRadius:8 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign:"center", padding:"56px 24px" }}>
          <div style={{ fontSize:28, marginBottom:14 }}>⚠️</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>Failed to load opportunities</div>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>{error}</div>
          <button type="button" onClick={() => load()} style={{ padding:"10px 24px", borderRadius:8, border:"none", cursor:"pointer", background:"#7c3aed", color:"#fff", fontWeight:700, fontSize:14 }}>Try Again</button>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 24px", border:"1px dashed #e5e7eb", borderRadius:14, background:"#fafafa" }}>
              <div style={{ fontSize:28, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>No opportunities in this category</div>
              <div style={{ fontSize:13, color:"#9ca3af" }}>Try a different filter or refresh the feed.</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
              {visible.map((opp, i) => (
                <OpportunityCard
                  key={opp.id || i}
                  opp={opp}
                  calendarEvents={calendarEvents}
                  onUse={setGenModal}
                  onSave={handleSave}
                  onHide={o => setHidden(prev => new Set([...prev, o.id || o.title]))}
                />
              ))}
            </div>
          )}
          <div style={{ marginTop:14, fontSize:12, color:"#9ca3af", textAlign:"right" }}>
            {visible.length} of {opps.length} opportunities · Studio never publishes
          </div>
        </>
      )}

      {genModal && (
        <GenerationModal
          opp={genModal}
          ccs={ccs}
          activeBrand={activeBrand}
          switchTab={switchTab}
          onClose={() => setGenModal(null)}
        />
      )}
    </div>
  );
}

// ── Playbooks Tab ──────────────────────────────────────────────────────────────
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
  const [search,  setSearch]  = useState("");
  const [wizard,  setWizard]  = useState(null);

  const filtered = PLAYBOOK_TYPES.filter(p =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.desc.toLowerCase().includes(search.toLowerCase())
  );

  if (wizard) {
    return <PlaybookWizard playbook={wizard} activeBrand={activeBrand} switchTab={switchTab} onClose={() => setWizard(null)} />;
  }

  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:32, padding:"0 20px" }}>
        <div style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 }}>What are you trying to achieve?</div>
        <div style={{ fontSize:14, color:"#6b7280", marginBottom:20 }}>Select a playbook to generate a full content strategy.</div>
        <div style={{ maxWidth:480, margin:"0 auto", position:"relative" }}>
          <i className="fas fa-search" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", fontSize:13 }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Describe your goal..."
            style={{ width:"100%", padding:"12px 14px 12px 38px", borderRadius:10, border:"1px solid #e5e7eb", fontSize:14, color:"#111827", boxSizing:"border-box", outline:"none" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
          />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => setWizard(p)} style={{
            border:"2px solid #e5e7eb", borderRadius:14, padding:"20px 20px 16px",
            background:"#fff", cursor:"pointer", transition:"all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.boxShadow = `0 8px 24px ${p.accent}20`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`${p.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className={p.icon} style={{ fontSize:18, color:p.accent }} />
              </div>
              <div style={{ fontSize:14, fontWeight:800, color:"#111827", lineHeight:1.2 }}>{p.name}</div>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.6, marginBottom:14 }}>{p.desc}</div>
            <div style={{ padding:"9px 0", borderRadius:8, textAlign:"center", background:`${p.accent}12`, color:p.accent, fontWeight:700, fontSize:13 }}>
              Start Playbook →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Playbook Wizard ────────────────────────────────────────────────────────────
function PlaybookWizard({ playbook, activeBrand, switchTab, onClose }) {
  const [step,        setStep]        = useState(1);
  const [industry,    setIndustry]    = useState(activeBrand?.industry || "");
  const [sourceType,  setSourceType]  = useState("brand-dna");
  const [inputData,   setInputData]   = useState("");
  const [intensity,   setIntensity]   = useState("medium");
  const [channels,    setChannels]    = useState([]);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState("");
  const [savedIdx,    setSavedIdx]    = useState([]);

  const CHANNELS = ["LinkedIn","Instagram","Facebook","TikTok","Twitter/X","YouTube","Blog"];

  async function generate() {
    setStep(5); setLoading(true); setErr("");
    try {
      const data = await apiRequest("/api/customer/studio/playbook", {
        method:"POST",
        body: JSON.stringify({ playbook_type: playbook.id, industry, input_data: inputData, intensity, channels }),
      });
      setResult(data);
      setStep(6);
    } catch (e) {
      setErr(e.message || "Generation failed. Try again.");
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  async function saveModule(mod, i) {
    try {
      await apiRequest("/api/customer/vault", {
        method:"POST",
        body: JSON.stringify({
          content_type:"social",
          title: mod.title || mod.type || `${playbook.name} — Output ${i+1}`,
          body: mod.body || mod.content || mod.hook || "",
          lifecycle_status:"draft", source:"studio",
        }),
      });
      setSavedIdx(prev => [...prev, i]);
    } catch { setErr("Save failed."); }
  }

  const STEPS = ["Industry","Source","Review","Configure","Generate","Results"];

  return (
    <div>
      <button type="button" onClick={onClose} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontWeight:600, fontSize:13, padding:"0 0 20px 0" }}>
        <i className="fas fa-arrow-left" style={{ fontSize:11 }} /> All Playbooks
      </button>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div style={{ width:40, height:40, borderRadius:11, background:`${playbook.accent}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className={playbook.icon} style={{ fontSize:18, color:playbook.accent }} />
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:playbook.accent, letterSpacing:1, textTransform:"uppercase" }}>Playbook Wizard</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>{playbook.name}</div>
        </div>
      </div>

      {step < 5 && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:28 }}>
          {STEPS.slice(0,4).map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{
                  width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                  background: i+1 < step ? playbook.accent : i+1 === step ? playbook.accent : "#f1f5f9",
                  color: i+1 <= step ? "#fff" : "#9ca3af", fontSize:10, fontWeight:700,
                }}>{i+1 < step ? "✓" : i+1}</div>
                <span style={{ fontSize:10, color: i+1 <= step ? playbook.accent : "#9ca3af", fontWeight:600 }}>{s}</span>
              </div>
              {i < 3 && <div style={{ flex:1, height:1, background: i+1 < step ? `${playbook.accent}50` : "#e5e7eb" }} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ maxWidth:560 }}>
        {step === 1 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:6 }}>What industry are you in?</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>We'll tailor the playbook to your specific market context.</div>
            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. SaaS, Real Estate, Fitness, Marketing Agency..."
              style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, color:"#111827", boxSizing:"border-box", outline:"none" }}
              onFocus={e => { e.currentTarget.style.borderColor = playbook.accent; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; }}
              onKeyDown={e => { if (e.key === "Enter" && industry.trim()) setStep(2); }}
            />
            <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
              <button type="button" onClick={() => setStep(2)} disabled={!industry.trim()} style={{
                padding:"10px 24px", borderRadius:8, border:"none",
                background: industry.trim() ? playbook.accent : "#e5e7eb",
                color: industry.trim() ? "#fff" : "#9ca3af",
                fontWeight:700, fontSize:14, cursor: industry.trim() ? "pointer" : "default",
              }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:6 }}>Where should we get source data?</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>The richer the context, the stronger the output.</div>

            {[
              { id:"brand-dna",  label:"Brand DNA",              desc:"Use your stored brand profile. Best for on-brand, consistent content.", icon:"🧬" },
              { id:"manual",     label:"Manual Input",            desc:"Provide specific context, messages, or angles for this run.", icon:"✍️" },
              { id:"repurpose",  label:"Repurpose Existing Content", desc:"Paste existing content and we'll transform it into fresh posts.", icon:"🔄" },
            ].map(opt => (
              <div key={opt.id} onClick={() => !opt.disabled && setSourceType(opt.id)} style={{
                border:`2px solid ${sourceType === opt.id ? playbook.accent : "#e5e7eb"}`,
                borderRadius:10, padding:"13px 16px", marginBottom:10,
                cursor: opt.disabled ? "default" : "pointer",
                background: sourceType === opt.id ? `${playbook.accent}08` : opt.disabled ? "#fafafa" : "#fff",
                opacity: opt.disabled ? 0.5 : 1, transition:"all 0.15s",
              }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{opt.label}{opt.disabled && " (Soon)"}</div>
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{opt.desc}</div>
                  </div>
                </div>
              </div>
            ))}

            {(sourceType === "manual" || sourceType === "repurpose") && (
              <textarea value={inputData} onChange={e => setInputData(e.target.value)}
                placeholder={sourceType === "manual" ? "Key messages, angles, specific details..." : "Paste existing content to repurpose..."}
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, color:"#111827", resize:"vertical", minHeight:90, boxSizing:"border-box", lineHeight:1.6, outline:"none", marginTop:6 }}
              />
            )}

            <div style={{ marginTop:16, display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={() => setStep(3)} style={{ padding:"9px 22px", borderRadius:8, border:"none", cursor:"pointer", background:playbook.accent, color:"#fff", fontWeight:700, fontSize:13 }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:6 }}>Review your inputs</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>Confirm what the AI will use to build your playbook.</div>
            <div style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
              {[
                { label:"Brand",    value: activeBrand?.name || "Your Brand" },
                { label:"Industry", value: industry },
                { label:"Playbook", value: playbook.name },
                { label:"Source",   value: sourceType === "brand-dna" ? "Brand DNA" : sourceType === "manual" ? "Manual input" : sourceType === "website" ? "Website import" : "Repurpose existing" },
                inputData ? { label:"Context", value: inputData.slice(0,200) + (inputData.length > 200 ? "…" : "") } : null,
              ].filter(Boolean).map((row, i, arr) => (
                <div key={i} style={{ display:"flex", gap:16, padding:"11px 16px", borderBottom: i < arr.length-1 ? "1px solid #f3f4f6" : "none", background: i%2===0 ? "#fff" : "#fafafa" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.5, width:90, flexShrink:0 }}>{row.label}</div>
                  <div style={{ fontSize:13, color:"#111827" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(2)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={() => setStep(4)} style={{ padding:"9px 22px", borderRadius:8, border:"none", cursor:"pointer", background:playbook.accent, color:"#fff", fontWeight:700, fontSize:13 }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:6 }}>Configure execution</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Set scale and channels.</div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Content Intensity</div>
              <div style={{ display:"flex", gap:8 }}>
                {[{id:"low",label:"Low",sub:"3–5 posts"},{id:"medium",label:"Medium",sub:"8–12 posts"},{id:"high",label:"High",sub:"15–20 posts"}].map(opt => (
                  <div key={opt.id} onClick={() => setIntensity(opt.id)} style={{
                    flex:1, border:`2px solid ${intensity===opt.id ? playbook.accent : "#e5e7eb"}`,
                    borderRadius:10, padding:"12px 8px", textAlign:"center", cursor:"pointer",
                    background: intensity===opt.id ? `${playbook.accent}08` : "#fff", transition:"all 0.15s",
                  }}>
                    <div style={{ fontSize:14, fontWeight:700, color: intensity===opt.id ? playbook.accent : "#374151" }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:"#9ca3af" }}>{opt.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Channels</div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {CHANNELS.map(ch => (
                  <button key={ch} type="button" onClick={() => setChannels(p => p.includes(ch) ? p.filter(c=>c!==ch) : [...p,ch])} style={{
                    padding:"6px 13px", borderRadius:99, border:"1px solid",
                    borderColor: channels.includes(ch) ? playbook.accent : "#e5e7eb",
                    background:  channels.includes(ch) ? playbook.accent : "#fff",
                    color:       channels.includes(ch) ? "#fff" : "#374151",
                    fontWeight:600, fontSize:12, cursor:"pointer", transition:"all 0.15s",
                  }}>{ch}</button>
                ))}
              </div>
            </div>

            {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#dc2626" }}>{err}</div>}

            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button type="button" onClick={() => setStep(3)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:13, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={generate} style={{
                padding:"9px 22px", borderRadius:8, border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${playbook.accent},${playbook.accent}cc)`,
                color:"#fff", fontWeight:700, fontSize:13,
              }}>Generate Playbook</button>
            </div>
          </div>
        )}

        {step === 5 && loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <style>{CSS}</style>
            <div style={{ width:48, height:48, border:`4px solid ${playbook.accent}30`, borderTopColor:playbook.accent, borderRadius:"50%", margin:"0 auto 20px", animation:"cs-spin 1s linear infinite" }} />
            <div style={{ fontSize:16, fontWeight:700, color:"#111827", marginBottom:6 }}>Building your playbook...</div>
            <div style={{ fontSize:13, color:"#6b7280" }}>Generating full content strategy. This may take a moment.</div>
          </div>
        )}

        {step === 6 && result && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"#f0fdf4", border:"1px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#16a34a", fontSize:14 }}>✓</span>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Playbook generated</div>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:16 }}>Save pieces individually or all at once. Route to Create Post to edit.</div>

            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:360, overflowY:"auto", marginBottom:20, paddingRight:4 }}>
              {(result.modules || result.posts || []).map((mod,i) => (
                <div key={i} style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:"13px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{mod.title || mod.type || `Output ${i+1}`}</div>
                    {savedIdx.includes(i)
                      ? <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>✓ Saved</span>
                      : <button type="button" onClick={() => saveModule(mod,i)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${playbook.accent}50`, background:`${playbook.accent}10`, color:playbook.accent, fontWeight:700, fontSize:11, cursor:"pointer" }}>Save</button>
                    }
                  </div>
                  <div style={{ fontSize:12, color:"#374151", lineHeight:1.65, maxHeight:80, overflowY:"auto" }}>{mod.body || mod.content || mod.hook || ""}</div>
                </div>
              ))}
              {!result.modules && !result.posts && Object.entries(result)
                .filter(([,v]) => typeof v === "string" && v.length > 10)
                .map(([k,v]) => (
                  <div key={k} style={{ border:"1px solid #f1f5f9", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{k.replace(/_/g," ")}</div>
                    <div style={{ fontSize:12, color:"#374151", lineHeight:1.6 }}>{v}</div>
                  </div>
                ))
              }
            </div>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button type="button" onClick={() => { switchTab("social"); onClose(); }} style={{
                flex:1, padding:"11px 0", borderRadius:8, border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${playbook.accent},${playbook.accent}cc)`, color:"#fff", fontWeight:700, fontSize:13,
              }}>Open in Create Social Post</button>
              <button type="button" onClick={onClose} style={{ padding:"11px 20px", borderRadius:8, border:"none", background:"#f3f4f6", color:"#374151", fontWeight:600, fontSize:13, cursor:"pointer" }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaign Content Tab ───────────────────────────────────────────────────────
function CampaignContentTab({ activeBrand, switchTab }) {
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result,     setResult]     = useState(null);
  const [err,        setErr]        = useState("");
  const [savedKeys,  setSavedKeys]  = useState([]);

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
          offer: selected.description || selected.goal || "",
          goal: selected.objective || selected.goal || "",
          channels: selected.channels || [],
          campaign_id: selected.id || selected.campaign_id,
        }),
      });
      setResult(data);
    } catch (e) {
      setErr(e.message || "Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveModule(key, content) {
    try {
      const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      await apiRequest("/api/customer/vault", {
        method:"POST",
        body: JSON.stringify({
          content_type:"social",
          title:`${selected?.name || "Campaign"} — ${key.replace(/_/g," ")}`,
          body: text, lifecycle_status:"draft", source:"studio",
        }),
      });
      setSavedKeys(prev => [...prev, key]);
    } catch { setErr("Save failed."); }
  }

  if (loading) {
    return (
      <div>
        <style>{CSS}</style>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="cs-shimmer" style={{ height:72, borderRadius:10 }} />)}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Campaign Assets — {selected?.name}</div>
            <div style={{ fontSize:13, color:"#6b7280" }}>Save to vault. Open in Create Post to edit and schedule.</div>
          </div>
          <button type="button" onClick={() => { setResult(null); setSavedKeys([]); }} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:12, cursor:"pointer" }}>
            ← Back
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {[
            { key:"social_posts", label:"Social Posts",         accent:"#7c3aed", bg:"#faf5ff" },
            { key:"article",      label:"Article / Blog",       accent:"#0284c7", bg:"#f0f9ff" },
            { key:"cta_variants", label:"CTA Variants",         accent:"#059669", bg:"#f0fdf4" },
            { key:"media_requirements", label:"Media Requirements", accent:"#d97706", bg:"#fffbeb" },
          ].filter(m => result[m.key]).map(m => (
            <div key={m.key} style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden", gridColumn: m.key==="social_posts" ? "span 2" : undefined }}>
              <div style={{ padding:"12px 16px 10px", background:m.bg, borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:m.accent }}>{m.label}</div>
                {savedKeys.includes(m.key)
                  ? <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>✓ Saved</span>
                  : <button type="button" onClick={() => saveModule(m.key, result[m.key])} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${m.accent}40`, background:"#fff", color:m.accent, fontWeight:700, fontSize:11, cursor:"pointer" }}>Save to Vault</button>
                }
              </div>
              <div style={{ padding:"12px 16px", fontSize:12, color:"#374151", lineHeight:1.65 }}>
                {Array.isArray(result[m.key])
                  ? result[m.key].slice(0,4).map((item,i) => (
                      <div key={i} style={{ background:"#f9fafb", borderRadius:7, padding:"8px 10px", marginBottom:8 }}>
                        {typeof item === "string" ? item : (item.content || item.body || item.text || JSON.stringify(item))}
                      </div>
                    ))
                  : <span style={{ whiteSpace:"pre-wrap" }}>{typeof result[m.key]==="string" ? result[m.key] : (result[m.key]?.headline || result[m.key]?.title || JSON.stringify(result[m.key]))}</span>
                }
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:16, display:"flex", gap:10 }}>
          <button type="button" onClick={() => switchTab("social")} style={{ padding:"11px 24px", borderRadius:8, border:"none", cursor:"pointer", background:"#059669", color:"#fff", fontWeight:700, fontSize:14 }}>Open Editor</button>
          <button type="button" onClick={() => switchTab("schedule")} style={{ padding:"11px 24px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:14, cursor:"pointer" }}>Schedule</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Generate Campaign Content</div>
        <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Select an existing campaign — we'll read it and generate a full content asset set.</div>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ border:"1px dashed #e5e7eb", borderRadius:14, padding:"56px 24px", textAlign:"center", background:"#fafafa" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>No campaigns found</div>
          <div style={{ fontSize:13, color:"#9ca3af", marginBottom:20 }}>Create a campaign first — Studio uses your campaign as the content source.</div>
          <button type="button" onClick={() => switchTab("campaign")} style={{ padding:"10px 24px", borderRadius:8, border:"none", cursor:"pointer", background:"#7c3aed", color:"#fff", fontWeight:700, fontSize:14 }}>
            Go to Campaigns
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {campaigns.slice(0,10).map(c => (
              <div key={c.id || c.campaign_id} onClick={() => setSelected(c)} style={{
                border:`2px solid ${selected?.id === c.id ? "#7c3aed" : "#e5e7eb"}`,
                borderRadius:12, padding:"14px 18px", cursor:"pointer", background: selected?.id === c.id ? "#faf5ff" : "#fff",
                transition:"all 0.15s",
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{c.name}</div>
                    {(c.description || c.goal || c.objective) && (
                      <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{c.description || c.goal || c.objective}</div>
                    )}
                  </div>
                  {selected?.id === c.id && <span style={{ fontSize:18, color:"#7c3aed" }}>✓</span>}
                </div>
              </div>
            ))}
          </div>

          {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#dc2626" }}>{err}</div>}

          <button type="button" onClick={generate} disabled={!selected || generating} style={{
            padding:"13px 32px", borderRadius:10, border:"none",
            cursor: selected ? "pointer" : "default",
            background: selected ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#e5e7eb",
            color: selected ? "#fff" : "#9ca3af", fontWeight:700, fontSize:15,
            display:"flex", alignItems:"center", gap:10,
          }}>
            {generating && (
              <div style={{ width:17, height:17, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"cs-spin 1s linear infinite" }} />
            )}
            <style>{CSS}</style>
            {generating ? "Generating..." : "Generate Campaign Assets"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Studio Vault Tab ───────────────────────────────────────────────────────────
const VAULT_SUB_TABS = [
  { id:"posts",            label:"Posts" },
  { id:"carousels",        label:"Carousels" },
  { id:"articles",         label:"Articles" },
  { id:"playbook-outputs", label:"Playbook Outputs" },
  { id:"campaign-outputs", label:"Campaign Outputs" },
];

function StudioVaultTab({ activeBrand, switchTab }) {
  const [subTab,   setSubTab]   = useState("posts");
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const data = await apiRequest("/api/customer/studio/vault");
      setItems(data.data || data.items || data.drafts || data.vault || []);
    } catch (e) {
      setErr(e.message || "Failed to load vault.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteItem(id) {
    try {
      await apiRequest(`/api/customer/vault/${id}`, { method:"DELETE" });
      setItems(prev => prev.filter(i => (i.content_id || i.id) !== id));
    } catch { setErr("Delete failed."); }
  }

  async function duplicate(item) {
    try {
      await apiRequest("/api/customer/vault", {
        method:"POST",
        body: JSON.stringify({
          content_type: item.content_type || "social",
          title: `${item.title || "Draft"} (Copy)`,
          body: item.body || "", lifecycle_status:"draft", source:"studio",
        }),
      });
      load();
    } catch { setErr("Duplicate failed."); }
  }

  async function shareForApproval(item) {
    try {
      await apiRequest(`/api/customer/vault/${item.content_id || item.id}`, {
        method:"PATCH",
        body: JSON.stringify({ lifecycle_status:"approval_requested" }),
      });
      load();
    } catch { setErr("Share failed."); }
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

  const visible = items.filter(filterBySubTab);

  const thS = { padding:"9px 14px", fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:1, textAlign:"left", whiteSpace:"nowrap", borderBottom:"1px solid #e5e7eb", background:"#f8fafc" };
  const tdS = { padding:"12px 14px", fontSize:13, color:"#374151", borderBottom:"1px solid #f1f5f9", verticalAlign:"top" };

  return (
    <div>
      <style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Content Vault</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Studio-generated drafts. Open in editor to refine before publishing.</div>
        </div>
        <button type="button" onClick={load} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
          <i className="fas fa-sync-alt" style={{ fontSize:10 }} /> Refresh
        </button>
      </div>

      <div style={{ display:"flex", gap:0, background:"#f1f5f9", borderRadius:10, padding:3, marginBottom:20, overflow:"hidden" }}>
        {VAULT_SUB_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSubTab(t.id)} style={{
            flex:1, padding:"7px 0", border:"none", borderRadius:8, cursor:"pointer",
            fontSize:12, fontWeight: subTab === t.id ? 700 : 500,
            background: subTab === t.id ? "#fff" : "transparent",
            color: subTab === t.id ? "#111827" : "#6b7280",
            boxShadow: subTab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition:"all 0.15s", whiteSpace:"nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#0369a1" }}>
        AI-generated drafts. Open in editor → refine → send for approval → schedule. Studio never publishes.
      </div>

      {loading && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="cs-shimmer" style={{ height:64, borderRadius:10 }} />)}
        </div>
      )}

      {!loading && err && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 }}>{err}</div>
      )}

      {!loading && !err && visible.length === 0 && (
        <div style={{ border:"1px dashed #e5e7eb", borderRadius:14, padding:"56px 24px", textAlign:"center", background:"#fafafa" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>🗂️</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>No drafts in this category</div>
          <div style={{ fontSize:13, color:"#9ca3af" }}>Generate content in Posts, Playbooks, or Campaign Content — it lands here.</div>
        </div>
      )}

      {!loading && !err && visible.length > 0 && (
        <div style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={thS}>Title</th>
                <th style={{ ...thS, width:100 }}>Status</th>
                <th style={{ ...thS, width:120 }}>Created</th>
                <th style={{ ...thS, width:200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(item => {
                const id = item.content_id || item.id;
                const status = item.lifecycle_status || "draft";
                const statusColor = status === "approval_requested" ? { bg:"#fef3c7", color:"#92400e" } : { bg:"#f1f5f9", color:"#475569" };
                return (
                  <tr key={id}>
                    <td style={tdS}>
                      <div style={{ fontWeight:600, color:"#111827", marginBottom:2 }}>{item.title || "Untitled Draft"}</div>
                      {item.body && (
                        <div style={{ fontSize:11, color:"#9ca3af", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{item.body}</div>
                      )}
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:statusColor.bg, color:statusColor.color, textTransform:"uppercase", letterSpacing:0.5 }}>
                        {status.replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{ ...tdS, fontSize:11, color:"#6b7280", whiteSpace:"nowrap" }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"}
                    </td>
                    <td style={tdS}>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <button type="button" onClick={() => switchTab("social")} style={{ padding:"4px 9px", borderRadius:6, border:"1px solid #c4b5fd", background:"#faf5ff", color:"#7c3aed", fontWeight:700, fontSize:11, cursor:"pointer" }}>Edit</button>
                        <button type="button" onClick={() => duplicate(item)} style={{ padding:"4px 9px", borderRadius:6, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:11, cursor:"pointer" }}>Duplicate</button>
                        {status !== "approval_requested" && (
                          <button type="button" onClick={() => shareForApproval(item)} style={{ padding:"4px 9px", borderRadius:6, border:"1px solid #bbf7d0", background:"#f0fdf4", color:"#059669", fontWeight:700, fontSize:11, cursor:"pointer" }}>Approve</button>
                        )}
                        <button type="button" onClick={() => switchTab("schedule")} style={{ padding:"4px 9px", borderRadius:6, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:11, cursor:"pointer" }}>Schedule</button>
                        <button type="button" onClick={() => deleteItem(id)} style={{ padding:"4px 7px", borderRadius:6, border:"1px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontWeight:700, fontSize:11, cursor:"pointer" }}>✕</button>
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

// ── Main ───────────────────────────────────────────────────────────────────────
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

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <i className="fas fa-magic" style={{ fontSize:16, color:"#fff" }} />
          </div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:0, lineHeight:1.2 }}>AI Content Studio</h2>
            <div style={{ fontSize:12, color:"#7c3aed", fontWeight:600, marginTop:1, letterSpacing:0.2 }}>
              Discover → Generate → Refine → Approve → Schedule
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:0, background:"#f1f5f9", borderRadius:10, padding:4, maxWidth:520, marginBottom:28 }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:"8px 0", border:"none", borderRadius:8, cursor:"pointer",
            fontSize:13, fontWeight: activeTab === t.id ? 700 : 500,
            background: activeTab === t.id ? "#fff" : "transparent",
            color: activeTab === t.id ? "#111827" : "#6b7280",
            boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
            transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === "posts"            && <PostsTab            activeBrand={activeBrand} connectedPlatforms={connectedPlatforms} switchTab={switchTab} />}
      {activeTab === "playbooks"        && <PlaybooksTab        activeBrand={activeBrand} switchTab={switchTab} />}
      {activeTab === "campaign-content" && <CampaignContentTab  activeBrand={activeBrand} switchTab={switchTab} />}
      {activeTab === "vault"            && <StudioVaultTab      activeBrand={activeBrand} switchTab={switchTab} />}
    </div>
  );
}
