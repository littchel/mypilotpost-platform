import React, { useState, useEffect } from "react";
import { 
  FileText, Download, Share2, Calendar, Layout, 
  ChevronRight, Plus, History, Clock, FileCheck,
  TrendingUp, BarChart, Settings, CheckCircle2,
  AlertCircle, ArrowRight, Printer, Copy, Search,
  ToggleLeft as Toggle, Mail, Link, RefreshCw, Target,
  MessageSquare, Lock, Edit3
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart as RechartsBarChart, Bar
} from "recharts";

import { apiSafeFetch } from "../lib/api/client";

/**
 * Agency-Grade Executive Reporting Engine
 */

// ── Shared Constants ─────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: "exec_growth", label: "Executive Growth Report", icon: Target },
  { id: "social_perf", label: "Social Performance Report", icon: BarChart },
  { id: "seo_vis", label: "SEO Visibility Report", icon: Search },
  { id: "comp_bench", label: "Competitive Benchmark Report", icon: TrendingUp },
  { id: "brand_health", label: "Brand Health Report", icon: FileCheck },
  { id: "qbr", label: "Quarterly Business Review", icon: Calendar },
  { id: "content_perf", label: "Content Performance Report", icon: FileText },
  { id: "audience_intel", label: "Audience Intelligence Report", icon: Share2 },
  { id: "campaign_impact", label: "Campaign Impact Report", icon: Target },
  { id: "whitelabel", label: "White-label Client Report", icon: Briefcase },
  { id: "boardroom", label: "Boardroom Strategic Report", icon: Layout },
  { id: "agency_perf", label: "Agency Performance Report", icon: BarChart },
];

function Briefcase(props) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
}

const REPORT_MODES = [
  { id: "snapshot", label: "Quick Snapshot", desc: "1–2 pages. Best for weekly summaries and internal updates." },
  { id: "executive", label: "Executive Report", desc: "6–15 pages. Best for leadership, agencies, and strategic reviews." },
  { id: "deck", label: "Strategic Deck", desc: "Presentation style. Best for pitches, QBRs, and boardroom reviews." },
];

// ── Components ───────────────────────────────────────────────────────────────

const LockedDataBadge = () => (
  <div className="d-flex align-items-center gap-1 extra-small text-muted fw-bold mb-2">
    <Lock size={10} /> LOCKED DATA LAYER
  </div>
);

const EditableLayerBadge = () => (
  <div className="d-flex align-items-center gap-1 extra-small text-primary fw-bold mb-2">
    <Edit3 size={10} /> EDITABLE NARRATIVE LAYER
  </div>
);

const MetricCard = ({ label, value, delta }) => (
  <div className="card-workspace p-3 bg-white" style={{ position: 'relative' }}>
    <div style={{ position: 'absolute', top: 10, right: 10 }}><Lock size={12} className="text-muted opacity-25" /></div>
    <div className="extra-small fw-bold text-muted text-uppercase mb-1">{label}</div>
    <div className="h4 fw-bold mb-0 text-main">{value || "0"}</div>
    {delta !== undefined && (
      <div className={`extra-small fw-bold mt-1 ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
        {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs last period
      </div>
    )}
  </div>
);

const RichTextEditor = ({ value, onChange, placeholder }) => (
  <div 
    className="rich-editor p-3 rounded-lg border"
    contentEditable
    suppressContentEditableWarning
    onBlur={(e) => onChange(e.currentTarget.innerHTML)}
    placeholder={placeholder}
    dangerouslySetInnerHTML={{ __html: value }}
    style={{ minHeight: '120px', outline: 'none', background: '#f8fafc', borderColor: '#e2e8f0', transition: 'border-color 0.2s, background 0.2s' }}
    onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#2563eb'; }}
  />
);

// ── Main Page Component ──────────────────────────────────────────────────────

const Reporting = ({ activeBrand }) => {
  const [view, setView] = useState("history"); // history | builder | preview
  const [reportsState, setReportsState] = useState({ status: 'loading', data: null });
  const [reportConfig, setReportConfig] = useState({
    type: "exec_growth",
    mode: "executive",
    dateRange: "Last 30 Days",
  });
  
  const [narrative, setNarrative] = useState({
    summary: "<h3>Executive Diagnosis</h3><p>Your brand has established strong momentum over the last 30 days. We are seeing early leading indicators of authority positioning...</p>",
    insights: "<ul><li>Visual content is currently outperforming text formats by 3:1.</li><li>LinkedIn algorithmic resonance improved 18% week-over-week.</li></ul>",
    recommendations: "<ul><li>Shift 20% of weekly capacity toward short-form visual content.</li><li>Execute the proposed authority framework next Tuesday.</li></ul>",
    roadmap: "<h3>Next 30 Days</h3><p>We will focus heavily on engagement recovery and deploying the new case study sequences...</p>"
  });

  const fetchReports = async () => {
    if (!activeBrand?.id) {
      setReportsState({ status: "empty", data: [] });
      return;
    }
    setReportsState({ status: 'loading', data: null });
    const result = await apiSafeFetch(`/api/customer/reports?brandId=${activeBrand.id}`);
    setReportsState(result);
  };

  useEffect(() => {
    fetchReports();
  }, [activeBrand?.id]);

  const handleExportPDF = () => {
    window.print(); // [Estimated] Browser print API acting as PDF generation placeholder
  };

  if (reportsState.status === 'loading') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '400px' }}>
        <RefreshCw className="text-primary animate-spin mb-3" size={32} />
        <div className="fw-bold text-muted">Loading Strategic Reports...</div>
      </div>
    );
  }

  const history = reportsState.data || [];
  const analytics = {
    summary: { reach: "142k", reachDelta: 12, engagement: "3.4%", engagementDelta: -2, conversions: "48", conversionsDelta: 8 },
    timeSeries: [
      { name: "Week 1", value: 12000 }, { name: "Week 2", value: 19000 },
      { name: "Week 3", value: 15000 }, { name: "Week 4", value: 24000 }
    ]
  };

  return (
    <div className="reporting-engine animate__animated animate__fadeIn p-2">
      
      {/* ── Header System ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="extra-small fw-bold text-primary text-uppercase tracking-widest mb-1">Executive Briefings</div>
          <h4 className="fw-bold mb-1 text-main">Reporting & Strategy</h4>
          <p className="text-muted extra-small mb-0">Generate strategic presentations, performance reviews, and client decks.</p>
        </div>
        {view === "history" && (
          <button className="btn btn-primary btn-sm px-4 d-flex align-items-center gap-2 extra-small fw-bold shadow-sm" onClick={() => setView("builder")} style={{ borderRadius: 8 }}>
            <Plus size={16} /> Build Executive Report
          </button>
        )}
        {view !== "history" && (
          <button className="btn btn-light btn-sm extra-small fw-bold shadow-sm" onClick={() => setView("history")} style={{ borderRadius: 8 }}>
            <History size={16} className="me-2" /> View History
          </button>
        )}
      </div>

      {/* ── VIEW: HISTORY ── */}
      {view === "history" && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card-workspace p-0 overflow-hidden bg-white shadow-sm" style={{ borderRadius: 16 }}>
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-main">Recent Reports</h6>
                <div className="d-flex align-items-center gap-2 extra-small text-muted fw-bold">
                  <Toggle size={16} className="text-primary" /> Monthly Automation Active
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3 extra-small fw-bold text-muted text-uppercase">Briefing Type</th>
                      <th className="py-3 extra-small fw-bold text-muted text-uppercase">Period</th>
                      <th className="py-3 extra-small fw-bold text-muted text-uppercase">Status</th>
                      <th className="text-end px-4 py-3 extra-small fw-bold text-muted text-uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map(report => (
                      <tr key={report.id} style={{ cursor: 'pointer' }} onClick={() => setView("preview")}>
                        <td className="px-4 py-3">
                          <div className="fw-bold small text-main">{report.title}</div>
                          <div className="extra-small text-muted">{report.report_type}</div>
                        </td>
                        <td className="small fw-medium text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                        <td><span className="badge bg-success bg-opacity-10 text-success extra-small fw-bold rounded-pill">Generated</span></td>
                        <td className="text-end px-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-link btn-sm p-0 text-muted hover-primary"><Download size={16} /></button>
                            <button className="btn btn-link btn-sm p-0 text-muted hover-primary"><Copy size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="text-center py-5 text-muted small">No reports generated yet. Build your first executive briefing.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 16 }}>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-main">
                <Clock size={18} className="text-primary" /> Automated Delivery
              </h6>
              <div className="extra-small text-muted mb-3 lh-base">Your next strategic review will generate automatically and notify stakeholders.</div>
              <div className="bg-light p-3 rounded-3 border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold small text-main">Executive Growth Report</span>
                  <span className="extra-small text-primary fw-bold">In 12 days</span>
                </div>
                <div className="extra-small text-muted">Format: Strategic Deck</div>
              </div>
              <button className="btn btn-outline-secondary w-100 mt-3 extra-small fw-bold rounded-3">Configure Automation</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW: BUILDER (WIZARD) ── */}
      {view === "builder" && (
        <div className="builder-wizard card-workspace p-5 mx-auto bg-white shadow-sm" style={{ maxWidth: '960px', borderRadius: 20 }}>
          <h4 className="fw-bold mb-1 text-main">Configure Executive Briefing</h4>
          <p className="text-muted small mb-5">Select the reporting mode and intelligence template for this presentation.</p>
          
          <div className="mb-5">
            <label className="small fw-bold text-main mb-3 d-block">1. Select Reporting Mode</label>
            <div className="row g-3">
              {REPORT_MODES.map(m => (
                <div key={m.id} className="col-md-4">
                  <div 
                    className={`p-3 border rounded-3 h-100 cursor-pointer transition-all ${reportConfig.mode === m.id ? 'border-primary bg-primary bg-opacity-10' : 'hover-bg-light'}`}
                    onClick={() => setReportConfig({...reportConfig, mode: m.id})}
                  >
                    <div className="small fw-bold mb-1 text-main">{m.label}</div>
                    <div className="extra-small text-muted lh-base">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="small fw-bold text-main mb-3 d-block">2. Select Intelligence Template</label>
            <div className="row g-3">
              {REPORT_TYPES.map(t => (
                <div key={t.id} className="col-md-3">
                  <div 
                    className={`p-3 border rounded-3 h-100 cursor-pointer transition-all ${reportConfig.type === t.id ? 'border-primary bg-primary bg-opacity-10' : 'hover-bg-light'}`}
                    onClick={() => setReportConfig({...reportConfig, type: t.id})}
                  >
                    <t.icon size={20} className={`${reportConfig.type === t.id ? 'text-primary' : 'text-muted'} mb-2`} />
                    <div className="small fw-bold text-main lh-sm">{t.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-3 mt-5 pt-4 border-top">
             <button className="btn btn-light btn-sm px-4 fw-bold rounded-3" onClick={() => setView("history")}>Cancel</button>
             <button className="btn btn-primary btn-sm px-5 fw-bold rounded-3 shadow-sm" onClick={() => setView("preview")}>Build Report Narrative <ArrowRight size={16} className="ms-2" /></button>
          </div>
        </div>
      )}

      {/* ── VIEW: PREVIEW & EDITOR ── */}
      {view === "preview" && (
        <div className={`report-document mode-${reportConfig.mode} animate__animated animate__fadeInUp`}>
          <div className="report-actions-bar p-3 mb-4 bg-white border rounded-3 shadow-sm d-flex justify-content-between align-items-center sticky-top" style={{ top: 16, zIndex: 100 }}>
            <div className="d-flex gap-2">
              <button onClick={handleExportPDF} className="btn btn-outline-secondary btn-sm extra-small fw-bold d-flex align-items-center gap-2 rounded-3"><Printer size={14} /> Export PDF</button>
              <button className="btn btn-outline-secondary btn-sm extra-small fw-bold d-flex align-items-center gap-2 rounded-3"><Share2 size={14} /> Share Link</button>
            </div>
            <div className="d-flex align-items-center gap-3">
              <span className="extra-small text-primary fw-bold bg-primary bg-opacity-10 px-2 py-1 rounded">Drafting Mode Active</span>
              <button className="btn btn-primary btn-sm px-4 extra-small fw-bold rounded-3 shadow-sm" onClick={() => setView("history")}>Save Briefing</button>
            </div>
          </div>

          <div className="document-container bg-white shadow-lg mx-auto position-relative print-container" style={{ maxWidth: '850px', minHeight: '1100px' }}>
            
            {/* 1. Cover Page */}
            <div className="report-cover" style={{ padding: '120px 60px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
              <div className="d-flex justify-content-between align-items-start mb-5">
                <div>
                  <div className="fw-bold text-primary tracking-widest text-uppercase extra-small mb-2">Strategic Intelligence Briefing</div>
                  <h1 className="fw-bold text-main mb-3" style={{ fontSize: '2.5rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {(REPORT_TYPES.find(t => t.id === reportConfig.type))?.label}
                  </h1>
                </div>
                <div className="text-end">
                  <div className="fw-bold text-main fs-5">myPilotPost</div>
                  <div className="extra-small text-muted text-uppercase tracking-widest mt-1">Growth Intelligence</div>
                </div>
              </div>
              
              <div className="mt-5 pt-5">
                <div className="row">
                  <div className="col-6">
                    <div className="extra-small text-muted text-uppercase fw-bold mb-1">Prepared For</div>
                    <div className="fs-5 fw-bold text-main">{activeBrand?.name || "Global Brand Partner"}</div>
                  </div>
                  <div className="col-6 text-end">
                    <div className="extra-small text-muted text-uppercase fw-bold mb-1">Analysis Period</div>
                    <div className="fs-5 fw-bold text-main">{reportConfig.dateRange}</div>
                    <div className="extra-small text-muted mt-1">Generated: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* 2. Executive Summary (Editable Narrative) */}
              <div className="report-section mb-5 position-relative">
                <EditableLayerBadge />
                <h6 className="fw-bold text-main text-uppercase tracking-widest extra-small mb-3 pb-2 border-bottom">01 // Executive Summary</h6>
                <RichTextEditor 
                  value={narrative.summary} 
                  onChange={(val) => setNarrative({...narrative, summary: val})} 
                  placeholder="Enter strategic interpretation and executive diagnosis..."
                />
              </div>

              {/* 3. Narrative Intelligence (Editable) */}
              <div className="report-section mb-5 position-relative">
                <EditableLayerBadge />
                <h6 className="fw-bold text-main text-uppercase tracking-widest extra-small mb-3 pb-2 border-bottom">02 // Key Insights & Narrative</h6>
                <RichTextEditor 
                  value={narrative.insights} 
                  onChange={(val) => setNarrative({...narrative, insights: val})} 
                  placeholder="Document the 'why' behind the performance data..."
                />
              </div>

              {/* 4. Benchmark & Analytics (Locked Data Layer) */}
              <div className="report-section mb-5 position-relative">
                <LockedDataBadge />
                <h6 className="fw-bold text-main text-uppercase tracking-widest extra-small mb-3 pb-2 border-bottom">03 // Performance Benchmarks</h6>
                
                <div className="row g-3 mb-4">
                  <div className="col-md-4"><MetricCard label="Total Audience Reach" value={analytics.summary?.reach} delta={analytics.summary?.reachDelta} /></div>
                  <div className="col-md-4"><MetricCard label="Avg. Engagement Rate" value={analytics.summary?.engagement} delta={analytics.summary?.engagementDelta} /></div>
                  <div className="col-md-4"><MetricCard label="Tracked Conversions" value={analytics.summary?.conversions} delta={analytics.summary?.conversionsDelta} /></div>
                </div>

                <div className="card-workspace p-4 border bg-white">
                  <div className="extra-small fw-bold text-muted text-uppercase mb-3">Growth Trajectory</div>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.timeSeries}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 5. Strategic Recommendations (Editable) */}
              <div className="report-section mb-5 position-relative">
                <EditableLayerBadge />
                <h6 className="fw-bold text-main text-uppercase tracking-widest extra-small mb-3 pb-2 border-bottom">04 // Strategic Recommendations</h6>
                <RichTextEditor 
                  value={narrative.recommendations} 
                  onChange={(val) => setNarrative({...narrative, recommendations: val})} 
                  placeholder="Detail the recommended actions to improve outcomes..."
                />
              </div>

              {/* 6. Execution Roadmap (Editable) */}
              <div className="report-section position-relative">
                <EditableLayerBadge />
                <h6 className="fw-bold text-main text-uppercase tracking-widest extra-small mb-3 pb-2 border-bottom">05 // Execution Roadmap</h6>
                <RichTextEditor 
                  value={narrative.roadmap} 
                  onChange={(val) => setNarrative({...narrative, roadmap: val})} 
                  placeholder="Outline the next 30-90 days of execution..."
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-5 py-4 border-top bg-light mt-4 d-flex justify-content-between align-items-center">
              <div className="extra-small fw-bold text-muted">myPilotPost Intelligence Engine</div>
              <div className="extra-small text-muted">CONFIDENTIAL</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reporting-engine { max-width: 1400px; margin: 0 auto; }
        .hover-bg-light:hover { background: #f8fafc; }
        .hover-primary:hover { color: #2563eb !important; }
        
        .rich-editor h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: #0f172a; }
        .rich-editor p { font-size: 0.9rem; margin-bottom: 0.75rem; color: #334155; line-height: 1.6; }
        .rich-editor ul { padding-left: 1.5rem; font-size: 0.9rem; color: #334155; line-height: 1.6; }
        .rich-editor li { margin-bottom: 0.4rem; }
        
        /* Mode-specific styling */
        .report-document.mode-snapshot .document-container { font-size: 0.9rem; }
        .report-document.mode-deck .document-container { max-width: 1000px; font-size: 1.1rem; }
        .report-document.mode-deck .report-cover { padding: 200px 80px; }
        .report-document.mode-deck .MetricCard { transform: scale(1.05); margin-bottom: 1rem; }
        
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-shadow: none !important; }
          .report-actions-bar { display: none !important; }
          .rich-editor { border: none !important; background: transparent !important; padding: 0 !important; }
          .badge, .lucide { display: none !important; } /* Hide badges/icons in print */
        }
      `}</style>
    </div>
  );
};

export default Reporting;
