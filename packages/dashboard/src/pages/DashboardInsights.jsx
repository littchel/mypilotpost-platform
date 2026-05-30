import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../lib/api/client";

/* ─── CSS ────────────────────────────────────────────────────────────── */
const STYLES = `
@keyframes intel-slide-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes intel-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes intel-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0.15)} 50%{box-shadow:0 0 0 8px rgba(37,99,235,0)} }
.intel-new  { animation: intel-slide-in 0.35s ease forwards; }
.intel-glow { animation: intel-glow 2s ease-in-out 3; }
.intel-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
.intel-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; cursor: pointer; }
.intel-module-btn { transition: background 0.15s, color 0.15s; }
.intel-module-btn:hover { background: #f1f5f9 !important; }
.intel-pulse { animation: intel-pulse 2s infinite; }
.intel-dismiss { transition: opacity 0.15s; opacity: 0; }
.intel-card:hover .intel-dismiss { opacity: 1; }
`;

/* ─── Module config ─────────────────────────────────────────────────── */
const MODULES = [
  { id: "platform_health",         label: "Platform Health",  icon: "fas fa-satellite-dish",  color: "#0891b2" },
  { id: "growth_engine",           label: "Growth Engine",    icon: "fas fa-rocket",          color: "#2563eb" },
  { id: "content_intelligence",    label: "Content",          icon: "fas fa-file-alt",        color: "#7c3aed" },
  { id: "audience_intelligence",   label: "Audience",         icon: "fas fa-users",           color: "#0369a1" },
  { id: "competitive_moat",        label: "Competitive",      icon: "fas fa-binoculars",      color: "#dc2626" },
  { id: "seo_intelligence",        label: "SEO",              icon: "fas fa-search",          color: "#059669" },
  { id: "conversion_intelligence", label: "Conversion",       icon: "fas fa-filter",          color: "#d97706" },
  { id: "campaign_intelligence",   label: "Campaigns",        icon: "fas fa-bullhorn",        color: "#6d28d9" },
];

const CONF_STYLES = {
  "Observed":            { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  "Observed + Inferred": { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
  "Industry Benchmark":  { bg: "#fdf4ff", border: "#d8b4fe", text: "#6b21a8" },
  "Estimated":           { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
};
const PRI_COLOR = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
const NOTIF_S = {
  urgent:      { bg: "#fff1f2", border: "#fca5a5", icon: "fas fa-exclamation-circle", color: "#dc2626" },
  warning:     { bg: "#fffbeb", border: "#fcd34d", icon: "fas fa-exclamation-triangle",color: "#d97706" },
  opportunity: { bg: "#eff6ff", border: "#93c5fd", icon: "fas fa-lightbulb",          color: "#2563eb" },
  win:         { bg: "#f0fdf4", border: "#86efac", icon: "fas fa-trophy",              color: "#16a34a" },
};

/* ─── Atoms ─────────────────────────────────────────────────────────── */
const ConfBadge = ({ v }) => {
  const s = CONF_STYLES[v] || CONF_STYLES["Estimated"];
  return <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:99, background:s.bg, border:`1px solid ${s.border}`, fontSize:10, fontWeight:700, color:s.text, letterSpacing:0.3 }}>{v||"Estimated"}</span>;
};
const PriPip = ({ v }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:PRI_COLOR[v]||"#d97706" }}>
    <span style={{ width:6, height:6, borderRadius:"50%", background:PRI_COLOR[v]||"#d97706" }} />{v||"medium"}
  </span>
);
const UnreadDot = () => <span className="intel-pulse" style={{ width:7, height:7, borderRadius:"50%", background:"#2563eb", display:"inline-block", flexShrink:0 }} />;

/* ─── Insight Card ───────────────────────────────────────────────────── */
const InsightCard = ({ item, color, isNew, onDismiss }) => {
  const [open, setOpen] = useState(isNew);
  return (
    <div className={`intel-card${isNew?" intel-new intel-glow":""}`} style={{
      background:"#fff", borderRadius:14, marginBottom:12, position:"relative",
      border:`1px solid ${isNew?color+"40":"#e5e9f0"}`, borderLeft:`4px solid ${color}`,
      boxShadow: isNew?`0 4px 16px ${color}20`:"0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {isNew && <div style={{ position:"absolute", top:-1, right:12, background:color, color:"#fff", fontSize:9, fontWeight:800, letterSpacing:1, padding:"2px 8px", borderRadius:"0 0 8px 8px", textTransform:"uppercase" }}>New</div>}
      <button onClick={() => setOpen(v=>!v)} style={{ width:"100%", textAlign:"left", background:"none", border:"none", padding:"16px 18px 12px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
              <PriPip v={item.priority} /><ConfBadge v={item.confidence} />
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#0f172a", lineHeight:1.4, marginBottom:4 }}>{item.title}</div>
            <div style={{ fontSize:12, color:"#64748b", lineHeight:1.55 }}>{item.finding}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button className="intel-dismiss" onClick={e=>{e.stopPropagation();onDismiss(item.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:13, padding:"2px 4px" }}><i className="fas fa-times"/></button>
            <i className={`fas fa-chevron-${open?"up":"down"}`} style={{ color:"#94a3b8", fontSize:11 }}/>
          </div>
        </div>
      </button>
      {open && (
        <div style={{ padding:"0 18px 16px", borderTop:"1px solid #f1f5f9" }}>
          {item.why_it_matters && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:4 }}>Why It Matters</div>
              <div style={{ fontSize:12, color:"#334155", lineHeight:1.65 }}>{item.why_it_matters}</div>
            </div>
          )}
          {(item.evidence||[]).length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:5 }}>Evidence</div>
              {item.evidence.map((e,i)=>(
                <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start", marginBottom:4 }}>
                  <i className="fas fa-database" style={{ color, fontSize:10, marginTop:3, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:"#475569", lineHeight:1.5 }}>{e}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:14, background:"#f8fafc", borderRadius:10, padding:"12px 14px", border:"1px solid #e2e8f0" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color, marginBottom:4 }}>Recommended Action</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#0f172a", lineHeight:1.5 }}>{item.recommended_action}</div>
            {item.expected_impact && <div style={{ fontSize:11, color:"#64748b", marginTop:5, lineHeight:1.5 }}><i className="fas fa-arrow-trend-up" style={{ marginRight:5, color:"#16a34a" }}/>{item.expected_impact}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Notification Strip ─────────────────────────────────────────────── */
const NotifStrip = ({ notifications, newIds, onDismiss }) => {
  const [dismissed, setDismissed] = useState(new Set());
  const visible = (notifications||[]).filter(n=>!dismissed.has(n.id));
  if (!visible.length) return null;
  const dismiss = id => { setDismissed(p=>new Set([...p,id])); onDismiss(id); };
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"#94a3b8", marginBottom:8 }}>Intelligence Alerts</div>
      {visible.map(n=>{
        const s=NOTIF_S[n.notification_type]||NOTIF_S.opportunity;
        return (
          <div key={n.id} className={newIds.has(n.id)?"intel-new":""} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:"11px 14px", marginBottom:7, display:"flex", gap:10, alignItems:"flex-start" }}>
            <i className={s.icon} style={{ color:s.color, fontSize:13, marginTop:2, flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", marginBottom:2 }}>{n.title}</div>
                  <div style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>{n.notification_body||n.finding}</div>
                  {n.notification_action && <div style={{ fontSize:11, fontWeight:600, color:s.color, marginTop:3 }}>→ {n.notification_action}</div>}
                </div>
                <button onClick={()=>dismiss(n.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:12, padding:0, flexShrink:0 }}><i className="fas fa-times"/></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Pending Banner ─────────────────────────────────────────────────── */
const PendingBanner = ({ count, onReveal, revealing }) => {
  if (count <= 0) return null;
  return (
    <div style={{ background:"linear-gradient(135deg,#eff6ff,#f0fdf4)", border:"1px solid #93c5fd", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e40af", marginBottom:2 }}>
          <i className="fas fa-brain" style={{ marginRight:8 }}/>{count} more intelligence insight{count!==1?"s":""} queued
        </div>
        <div style={{ fontSize:11, color:"#475569" }}>Your strategist is working. Check back to reveal more.</div>
      </div>
      <button onClick={onReveal} disabled={revealing} style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px", background:"#2563eb", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:12, cursor:revealing?"not-allowed":"pointer", flexShrink:0, opacity:revealing?0.6:1 }}>
        {revealing?<i className="fas fa-spinner fa-spin"/>:<i className="fas fa-eye"/>} Reveal Next
      </button>
    </div>
  );
};

/* ─── Module Sidebar ─────────────────────────────────────────────────── */
const ModuleSidebar = ({ active, setActive, unread }) => (
  <div style={{ width:196, flexShrink:0, background:"#fff", borderRadius:16, border:"1px solid #e5e9f0", padding:"16px 10px", height:"fit-content", boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"#94a3b8", padding:"0 8px", marginBottom:10 }}>Modules</div>
    {MODULES.map(m=>{
      const isA=active===m.id;
      return (
        <button key={m.id} onClick={()=>setActive(m.id)} className="intel-module-btn" style={{ width:"100%", textAlign:"left", padding:"9px 10px", borderRadius:9, background:isA?`${m.color}15`:"none", border:isA?`1px solid ${m.color}30`:"1px solid transparent", cursor:"pointer", marginBottom:2, display:"flex", alignItems:"center", gap:9 }}>
          <i className={m.icon} style={{ fontSize:12, color:isA?m.color:"#64748b", width:14, textAlign:"center" }}/>
          <span style={{ fontSize:12, fontWeight:isA?700:500, color:isA?m.color:"#374151", flex:1 }}>{m.label}</span>
          {(unread[m.id]||0)>0 && <UnreadDot/>}
        </button>
      );
    })}
  </div>
);

/* ─── Export / Print handler ─────────────────────────────────────────── */
function exportIntelligencePDF(brandName, delivered, newInsights) {
  const all = [...(delivered||[]), ...(newInsights||[])];
  if (!all.length) { alert("No intelligence to export yet."); return; }
  const win = window.open("", "_blank");
  const rows = all.map(i => `
    <div class="card">
      <div class="meta">${i.category||""} · ${i.priority||""} · ${i.confidence||""}</div>
      <h3>${i.title||""}</h3>
      <p><strong>Finding:</strong> ${i.finding||""}</p>
      ${i.why_it_matters?`<p><strong>Why it matters:</strong> ${i.why_it_matters}</p>`:""}
      ${(i.evidence||[]).length?`<p><strong>Evidence:</strong> ${i.evidence.join(" · ")}</p>`:""}
      <p class="action"><strong>Recommended Action:</strong> ${i.recommended_action||""}</p>
      ${i.expected_impact?`<p><strong>Expected Impact:</strong> ${i.expected_impact}</p>`:""}
    </div>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Brand Intelligence Report — ${brandName}</title>
  <style>
    body{font-family:Georgia,serif;max-width:820px;margin:40px auto;color:#0f172a;line-height:1.6}
    h1{font-size:28px;margin-bottom:4px}
    .sub{color:#64748b;font-size:14px;margin-bottom:36px}
    .card{border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;break-inside:avoid}
    .meta{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px}
    h3{font-size:16px;margin:0 0 10px}
    p{font-size:14px;margin:6px 0;color:#334155}
    .action{background:#f8fafc;border-radius:6px;padding:10px 14px;margin-top:12px}
    @media print{body{margin:0}.card{break-inside:avoid}}
  </style></head><body>
  <h1>Brand Intelligence Report</h1>
  <div class="sub">${brandName} · Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
  ${rows}
  <script>window.print();</script></body></html>`);
  win.document.close();
}

/* ─── Platform Gate ──────────────────────────────────────────────────── */
const PlatformGate = ({ platformCount, switchTab }) => (
  <div style={{ maxWidth:520, margin:"60px auto", textAlign:"center", padding:"0 16px" }}>
    <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#fff7ed,#fed7aa)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
      <i className="fas fa-plug" style={{ fontSize:28, color:"#d97706" }}/>
    </div>
    <h2 style={{ fontSize:22, fontWeight:800, color:"#0f172a", marginBottom:10 }}>Connect 2 Platforms to Unlock Intelligence</h2>
    <p style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:8 }}>
      Brand Intelligence requires at least <strong>2 active platform connections</strong> to generate meaningful analysis.
      You currently have <strong>{platformCount} {platformCount===1?"platform":"platforms"}</strong> connected.
    </p>
    <p style={{ fontSize:13, color:"#94a3b8", marginBottom:28 }}>
      Examples: Facebook + Instagram · LinkedIn + X · TikTok + Instagram
    </p>
    <button
      onClick={() => switchTab?.("integrations")}
      style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 28px", background:"linear-gradient(135deg,#d97706,#b45309)", color:"#fff", borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer", border:"none", boxShadow:"0 4px 14px rgba(217,119,6,0.35)" }}
    >
      <i className="fas fa-plug"/> Connect Platforms
    </button>
    <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, maxWidth:400, margin:"24px auto 0", textAlign:"left" }}>
      {[
        { icon:"fas fa-chart-bar",  label:"Real engagement data",   desc:"See what content actually resonates" },
        { icon:"fas fa-users",      label:"Audience intelligence",  desc:"Who's following, engaging, converting" },
        { icon:"fas fa-binoculars", label:"Competitive signals",    desc:"How you compare to your category" },
        { icon:"fas fa-rocket",     label:"Growth engine",          desc:"Highest-leverage moves for your brand" },
      ].map(({icon,label,desc})=>(
        <div key={label} style={{ padding:"14px", background:"#f8fafc", borderRadius:12, border:"1px solid #e2e8f0" }}>
          <i className={icon} style={{ color:"#d97706", marginBottom:8, display:"block", fontSize:14 }}/>
          <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>{desc}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Generating State ───────────────────────────────────────────────── */
const GeneratingState = () => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:16 }}>
    <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#eff6ff,#dbeafe)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 0 12px rgba(37,99,235,0.08)" }}>
      <i className="fas fa-brain" style={{ fontSize:22, color:"#2563eb" }}/>
    </div>
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Analysing Your Brand</div>
      <div style={{ fontSize:13, color:"#64748b", maxWidth:340 }}>Running the intelligence engine across 8 strategic modules — 15–25 seconds.</div>
    </div>
    <div style={{ display:"flex", gap:6 }}>
      {["Platform","Content","Growth","SEO","Conversion"].map((l,i)=>(
        <div key={i} className="intel-pulse" style={{ fontSize:11, fontWeight:600, color:"#475569", background:"#f1f5f9", borderRadius:99, padding:"4px 10px", animationDelay:`${i*0.2}s` }}>{l}</div>
      ))}
    </div>
  </div>
);

/* ─── Empty State ─────────────────────────────────────────────────────── */
const EmptyState = ({ activeBrand, onGenerate, loading }) => (
  <div style={{ textAlign:"center", maxWidth:520, margin:"60px auto", padding:"0 16px" }}>
    <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#eff6ff,#dbeafe)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
      <i className="fas fa-brain" style={{ fontSize:28, color:"#2563eb" }}/>
    </div>
    <h2 style={{ fontSize:22, fontWeight:800, color:"#0f172a", marginBottom:10 }}>Brand Intelligence</h2>
    <p style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:28 }}>
      Get a daily AI intelligence report for <strong style={{ color:"#0f172a" }}>{activeBrand?.name||"your brand"}</strong> — powered by the same engine as the Social Media Brand Audit, enhanced with your connected platform data.
    </p>
    <button onClick={onGenerate} disabled={loading} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 28px", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"#fff", borderRadius:12, fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", border:"none", boxShadow:"0 4px 14px rgba(37,99,235,0.35)", opacity:loading?0.7:1 }}>
      <i className={loading?"fas fa-spinner fa-spin":"fas fa-brain"}/>{loading?"Generating…":"Run Intelligence Audit"}
    </button>
    <div style={{ fontSize:12, color:"#94a3b8", marginTop:12 }}>Generated once per day. Revealed progressively.</div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function DashboardInsights({ activeBrand, switchTab }) {
  const [activeModule, setActiveModule] = useState("platform_health");
  const [feed, setFeed]         = useState(null);
  const [newIds, setNewIds]     = useState(new Set());
  const [loading, setLoading]   = useState(false);
  const [generating, setGen]    = useState(false);
  const [err, setErr]           = useState(null);
  const [revealing, setReveal]  = useState(false);
  const styleRef = useRef(false);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  const loadFeed = useCallback(async (isGen = false) => {
    if (!activeBrand?.id) return;
    isGen ? setGen(true) : setLoading(true);
    setErr(null);
    try {
      const res = await apiRequest("/api/customer/intelligence/feed");
      if (res) {
        const freshIds = new Set([
          ...(res.new_insights||[]).map(i=>i.id),
          ...(res.new_notifications||[]).map(i=>i.id),
        ]);
        setNewIds(prev => new Set([...prev,...freshIds]));
        setFeed(res);
        if ((res.new_insights||[]).length > 0) setActiveModule(res.new_insights[0].module_id || "platform_health");
      }
    } catch(e) { setErr(e?.message||"Failed to load intelligence."); }
    finally { setLoading(false); setGen(false); }
  }, [activeBrand?.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleReveal  = async () => { setReveal(true); await loadFeed(); setReveal(false); };
  const handleDismiss = async (id) => {
    try {
      await apiRequest(`/api/customer/intelligence/dismiss/${id}`, { method:"POST" });
      setFeed(prev => {
        if (!prev) return prev;
        const f = arr => (arr||[]).filter(i=>i.id!==id);
        return { ...prev, delivered:f(prev.delivered), new_insights:f(prev.new_insights), notifications:f(prev.notifications), new_notifications:f(prev.new_notifications) };
      });
      setNewIds(prev => { const s=new Set(prev); s.delete(id); return s; });
    } catch {}
  };

  // Derived state
  const requiresPlatforms = feed?.requires_platforms;
  const platformCount     = feed?.platform_count ?? 0;
  const allInsights       = [...(feed?.delivered||[]), ...(feed?.new_insights||[])];
  const hasAny            = allInsights.length > 0;
  const moduleInsights    = allInsights.filter(i => i.module_id === activeModule);
  const unread            = {};
  for (const i of (feed?.new_insights||[])) { if (!unread[i.module_id]) unread[i.module_id]=0; unread[i.module_id]++; }
  const activeConf        = MODULES.find(m=>m.id===activeModule) || MODULES[0];
  const generatedAt       = feed?.generated_at;
  const formattedDate     = generatedAt
    ? new Date(generatedAt).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}) + " · " +
      new Date(generatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    : null;

  return (
    <div style={{ padding:"28px 32px", maxWidth:1160, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:"#2563EB", marginBottom:6 }}>Strategic Command Center</div>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, color:"#0f172a", marginBottom:5, lineHeight:1.2 }}>Brand Intelligence</h1>
            {formattedDate && (
              <div style={{ fontSize:12, color:"#94a3b8" }}>
                <i className="fas fa-clock" style={{ marginRight:5 }}/>Last generated {formattedDate}
                <span style={{ margin:"0 8px", color:"#e2e8f0" }}>·</span>
                <span style={{ color:"#16a34a", fontWeight:600 }}>Fresh today</span>
              </div>
            )}
          </div>
          {hasAny && (
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => exportIntelligencePDF(activeBrand?.name||"Brand", feed?.delivered, feed?.new_insights)} style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:9, fontWeight:600, fontSize:12, cursor:"pointer", color:"#374151" }}>
                <i className="fas fa-download" style={{ fontSize:11 }}/> Export Report
              </button>
              <button onClick={() => loadFeed(true)} disabled={generating} style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:9, fontWeight:600, fontSize:12, cursor:generating?"not-allowed":"pointer", color:"#374151", opacity:generating?0.6:1 }}>
                <i className={`fas fa-sync-alt${generating?" fa-spin":""}`} style={{ fontSize:11 }}/> Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {err && !loading && !generating && (
        <div style={{ background:"#fff1f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 16px", marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#991b1b", marginBottom:3 }}><i className="fas fa-exclamation-circle" style={{ marginRight:6 }}/>Generation failed</div>
          <div style={{ fontSize:12, color:"#7f1d1d", marginBottom:8 }}>{err}</div>
          <button onClick={() => loadFeed(true)} style={{ fontSize:11, fontWeight:600, color:"#dc2626", background:"none", border:"none", cursor:"pointer", padding:0 }}>Try again →</button>
        </div>
      )}

      {/* Platform gate */}
      {!loading && !generating && requiresPlatforms && (
        <PlatformGate platformCount={platformCount} switchTab={switchTab} />
      )}

      {/* Generating */}
      {generating && <GeneratingState />}

      {/* Loading */}
      {loading && !generating && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
          <div className="spinner-border spinner-border-sm" role="status"/>
          <div style={{ fontSize:12, marginTop:10 }}>Loading intelligence…</div>
        </div>
      )}

      {/* Empty — platforms connected but no intelligence yet */}
      {!loading && !generating && !requiresPlatforms && !hasAny && !err && (
        <EmptyState activeBrand={activeBrand} onGenerate={() => loadFeed(true)} loading={generating} />
      )}

      {/* Intelligence feed */}
      {!loading && !generating && !requiresPlatforms && hasAny && (
        <div>
          {(feed?.notifications||[]).length > 0 && (
            <NotifStrip notifications={feed.notifications} newIds={newIds} onDismiss={handleDismiss} />
          )}
          <PendingBanner count={feed?.pending_count||0} onReveal={handleReveal} revealing={revealing} />

          <div style={{ display:"flex", gap:18, alignItems:"flex-start" }}>
            <ModuleSidebar active={activeModule} setActive={setActiveModule} unread={unread} />

            <div style={{ flex:1, minWidth:0 }}>
              {/* Module header */}
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e9f0", padding:"14px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 4px rgba(0,0,0,0.03)" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${activeConf.color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className={activeConf.icon} style={{ fontSize:14, color:activeConf.color }}/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>{activeConf.label}</div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>
                    {moduleInsights.length} insight{moduleInsights.length!==1?"s":""} available
                    {(unread[activeModule]||0)>0 && <span style={{ marginLeft:8, color:activeConf.color, fontWeight:700 }}>{unread[activeModule]} new</span>}
                  </div>
                </div>
              </div>

              {moduleInsights.length > 0 ? (
                moduleInsights.map(item => (
                  <InsightCard key={item.id} item={item} color={activeConf.color} isNew={newIds.has(item.id)} onDismiss={handleDismiss} />
                ))
              ) : (
                <div style={{ background:"#f8fafc", borderRadius:14, border:"1px solid #e2e8f0", padding:"40px 24px", textAlign:"center" }}>
                  <i className={activeConf.icon} style={{ fontSize:28, color:"#cbd5e1", marginBottom:12, display:"block" }}/>
                  <div style={{ fontSize:13, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>No insights for this module yet</div>
                  <div style={{ fontSize:12, color:"#b0b7c3" }}>{(feed?.pending_count||0)>0?"Queued insights will reveal across your next sessions.":"Intelligence refreshes in the next daily cycle."}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
