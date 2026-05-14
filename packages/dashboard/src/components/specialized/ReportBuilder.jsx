import React, { useState, useEffect, useCallback } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import WorkspaceCard from "../shared/WorkspaceCard";
import PilotButton from "../shared/PilotButton";
import { 
  Save, Download, ArrowLeft, TrendingUp, Users, Target, Printer,
  Edit2, Lock
} from "lucide-react";
import { apiRequest } from "../../lib/api/client";

const ReportBuilder = ({ reportId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/customer/analytics/report/${reportId}`);
      setReport(data.report);
    } catch (e) {
      console.error("Failed to fetch report", e);
    }
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchReport(), 0);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/customer/analytics/report/update", {
        method: "PATCH",
        body: JSON.stringify({
          id: reportId,
          executive_summary: report.executive_summary,
          recommendations: report.recommendations
        })
      });
      alert("Report saved successfully!");
    } catch {
      alert("Failed to save report");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-muted">Opening secure report snapshot...</div>;
  if (!report) return <div className="p-8 text-center">Report not found.</div>;

  const data = report.report_data;

  return (
    <div className="report-builder">
      {/* Editor Controls (Hidden on Print) */}
      <header className="report-editor-header no-print">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Analytics
        </button>
        <div className="header-actions">
          <PilotButton type="outline" icon={Printer} onClick={() => window.print()}>Print / Export PDF</PilotButton>
          <PilotButton type="primary" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </PilotButton>
        </div>
      </header>

      {/* Actual Report Document */}
      <div className="report-document shadow-lg">
        {/* Document Header (Branding) */}
        <div className="document-branding">
          <div className="agency-brand">
             {data.branding.agency_logo_url ? (
               <img src={data.branding.agency_logo_url} alt="Agency Logo" className="agency-logo" />
             ) : (
               <h2 className="agency-name">{data.branding.agency_name || "Account Performance"}</h2>
             )}
          </div>
          <div className="brand-identifier">
             <div className="brand-text">
                <span className="prepared-for">PREPARED FOR</span>
                <h3 className="brand-name">{data.branding.brand_name}</h3>
             </div>
             {data.branding.brand_logo_url && (
               <img src={data.branding.brand_logo_url} alt="Brand Logo" className="brand-logo" />
             )}
          </div>
        </div>

        <div className="report-title-section mt-5 px-5">
           <h1 className="report-title">{report.title}</h1>
           <div className="report-meta-line">
              <span>REPORT PERIOD: {report.period}</span>
              <span>GENERATED: {new Date(report.created_at).toLocaleDateString()}</span>
           </div>
        </div>

        {/* Campaign Strategic Block (If present) */}
        {data.campaign && (
          <div className="campaign-summary-block mt-5 mx-5">
            <div className="summary-banner">
               <div className="banner-item">
                  <span className="b-label">MISSION OBJECTIVE</span>
                  <strong className="b-val">{data.campaign.objective.toUpperCase()}</strong>
               </div>
               <div className="banner-item">
                  <span className="b-label">ACTIVE DURATION</span>
                  <strong className="b-val">{data.campaign.duration}</strong>
               </div>
               <div className="banner-item">
                  <span className="b-label">CAMPAIGN SCORE</span>
                  <strong className="b-val" style={{ color: data.campaign.score >= 80 ? '#35C961' : data.campaign.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {data.campaign.score}/100
                  </strong>
               </div>
            </div>
            
            <div className="takeaway-section">
               <div className="takeaway-header">
                  <TrendingUp size={14} className="text-primary" />
                  <span>STRATEGIC TAKEAWAY</span>
               </div>
               <p className="takeaway-text">{data.campaign.takeaway}</p>
            </div>
          </div>
        )}

        {/* SEO Strategic Block (If present) */}
        {data.seo && (
          <div className="campaign-summary-block mt-4 mx-5 seo-summary-accent">
            <div className="summary-banner" style={{ background: '#0f172a' }}>
               <div className="banner-item">
                  <span className="b-label">SEARCH IMPRESSIONS</span>
                  <strong className="b-val">{data.seo.summary.impressions.toLocaleString()}</strong>
               </div>
               <div className="banner-item">
                  <span className="b-label">CLICK-THROUGH RATE</span>
                  <strong className="b-val">{data.seo.summary.ctr}</strong>
               </div>
               <div className="banner-item">
                  <span className="b-label">AVG. POSITION</span>
                  <strong className="b-val">{data.seo.summary.position}</strong>
               </div>
            </div>
            
            <div className="takeaway-section">
               <div className="takeaway-header">
                  <Globe size={14} className="text-primary" />
                  <span>SEO STRATEGIC TAKEAWAY</span>
               </div>
               <p className="takeaway-text">{data.seo.takeaway}</p>
               <div className="seo-action-item mt-2 d-flex align-items-center gap-2" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  <Zap size={12} className="text-warning" />
                  <span className="fw-bold">RECOMMENDED: {data.seo.action}</span>
               </div>
            </div>
          </div>
        )}
        <section className="document-section mt-5 px-5">
           <div className="section-header">
              <div className="label-with-lock">
                <Edit2 size={12} className="no-print" />
                <span className="section-type">EXECUTIVE SUMMARY</span>
              </div>
           </div>
           <textarea 
             className="report-textarea"
             value={report.executive_summary}
             onChange={(e) => setReport({...report, executive_summary: e.target.value})}
             placeholder="Enter high-level summary..."
           />
        </section>

        {/* Locked Data Section */}
        <section className="document-section mt-4 px-5">
           <div className="section-header">
              <div className="label-with-lock">
                <Lock size={12} />
                <span className="section-type">PERFORMANCE KPIS (LOCKED)</span>
              </div>
           </div>
           
           <div className="metric-snapshot-grid mt-3">
              <div className="snap-card">
                 <span className="snap-label">ESTIMATED REACH</span>
                 <strong className="snap-val">{data.stats.summary.reach}</strong>
              </div>
              <div className="snap-card">
                 <span className="snap-label">ENGAGEMENT RATE</span>
                 <strong className="snap-val text-success">{data.stats.summary.engagement_rate}</strong>
              </div>
              <div className="snap-card">
                 <span className="snap-label">CONTENT PUBLISHED</span>
                 <strong className="snap-val">{data.stats.summary.published}</strong>
              </div>
           </div>

           <div className="snapshot-chart-box mt-4">
              <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <LineChart data={data.details.trends}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                       <XAxis dataKey="date" stroke="#999" fontSize={10} />
                       <YAxis stroke="#999" fontSize={10} />
                       <Line type="monotone" dataKey="reach" stroke="#2563eb" strokeWidth={2} dot={false} />
                       <Line type="monotone" dataKey="engagement" stroke="#35C961" strokeWidth={2} dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
              <p className="chart-caption">Audience Growth & Interaction Trajectory</p>
           </div>
        </section>

        {/* Platform Breakdown */}
        <section className="document-section mt-5 px-5">
           <div className="section-header">
              <div className="label-with-lock">
                <Lock size={12} />
                <span className="section-type">PLATFORM REACH DISTRIBUTION</span>
              </div>
           </div>
           <div className="platform-stats-grid mt-3">
              {data.details.platforms.map(p => (
                 <div key={p.platform} className="platform-mini-card">
                    <span className="p-name">{p.platform.toUpperCase()}</span>
                    <span className="p-val">{p.reach.toLocaleString()} reach</span>
                 </div>
              ))}
           </div>
        </section>

        {/* Recommendations (Editable) */}
        <section className="document-section mt-5 px-5 mb-5">
           <div className="section-header">
              <div className="label-with-lock">
                <Edit2 size={12} className="no-print" />
                <span className="section-type">STRATEGIC RECOMMENDATIONS</span>
              </div>
           </div>
           <textarea 
             className="report-textarea"
             value={report.recommendations}
             onChange={(e) => setReport({...report, recommendations: e.target.value})}
             placeholder="Provide actionable insights..."
           />
        </section>

        {/* Footer */}
        <footer className="document-footer px-5 py-4 border-top">
           <p>Report generated by myPilotPost Agency Engine • Confirmed Authoritative Metadata</p>
        </footer>
      </div>

      <style>{`
        .report-builder {
          background: #f8fafc;
          min-height: 100vh;
        }

        .report-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .back-btn {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .report-document {
          max-width: 900px;
          margin: 40px auto;
          background: white;
          min-height: 1100px;
          font-family: 'Inter', sans-serif;
        }

        .document-branding {
          display: flex;
          justify-content: space-between;
          padding: 40px 50px;
          background: #fafafa;
        }

        .agency-logo {
          max-height: 48px;
          object-fit: contain;
        }

        .brand-identifier {
           display: flex;
           align-items: center;
           gap: 16px;
           text-align: right;
        }

        .prepared-for {
           display: block;
           font-size: 0.65rem;
           font-weight: 800;
           color: #94a3b8;
           letter-spacing: 0.1em;
        }

        .brand-name {
           font-size: 1.25rem;
           font-weight: 900;
           color: var(--text-dark);
           margin: 0;
        }

        .brand-logo {
           width: 44px;
           height: 44px;
           border-radius: 8px;
           object-fit: contain;
        }

        .report-title-section .report-title {
           font-size: 2.5rem;
           font-weight: 900;
           line-height: 1.1;
           margin-bottom: 8px;
           color: var(--text-dark);
        }

        .report-meta-line {
           display: flex;
           gap: 24px;
           font-size: 0.75rem;
           font-weight: 700;
           color: #64748b;
           letter-spacing: 0.05em;
        }

        .section-header {
           border-bottom: 2px solid #f1f5f9;
           padding-bottom: 8px;
           margin-bottom: 16px;
        }

        .label-with-lock {
           display: flex;
           align-items: center;
           gap: 6px;
           color: #94a3b8;
        }

        .section-type {
           font-size: 0.75rem;
           font-weight: 800;
           letter-spacing: 0.05em;
        }

        .report-textarea {
           width: 100%;
           border: none;
           background: transparent;
           font-size: 1rem;
           line-height: 1.8;
           color: #334155;
           resize: none;
           outline: none;
           min-height: 100px;
        }

        .report-textarea:focus {
           background: #f8fafc;
           padding: 10px;
           border-radius: 8px;
        }

        .metric-snapshot-grid {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 20px;
        }

        .snap-card {
           padding: 16px;
           background: #f8fafc;
           border-radius: 12px;
        }

        .snap-label {
           display: block;
           font-size: 0.65rem;
           font-weight: 800;
           color: #64748b;
           margin-bottom: 4px;
        }

        .snap-val {
           font-size: 1.5rem;
           font-weight: 900;
        }

        .snapshot-chart-box {
           background: #f8fafc;
           padding: 24px;
           border-radius: 12px;
        }

        .chart-caption {
           text-align: center;
           font-size: 0.75rem;
           margin-top: 12px;
           color: #94a3b8;
        }

        .platform-stats-grid {
           display: grid;
           grid-template-columns: repeat(4, 1fr);
           gap: 12px;
        }

        .platform-mini-card {
           padding: 12px;
           border: 1px solid #e2e8f0;
           border-radius: 10px;
           text-align: center;
        }

        .p-name {
           display: block;
           font-size: 0.65rem;
           font-weight: 800;
        }

        .p-val {
           font-size: 0.85rem;
           color: #64748b;
        }

        .document-footer p {
           font-size: 0.75rem;
           color: #94a3b8;
           text-align: center;
        }

        .campaign-summary-block {
          background: #fdfdfd;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          overflow: hidden;
        }

        .summary-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #1e293b;
          color: white;
          padding: 24px;
        }

        .b-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .b-val {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .takeaway-section {
          padding: 24px;
        }

        .takeaway-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .takeaway-text {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #1e293b;
          font-weight: 500;
          margin: 0;
        }

        .seo-summary-accent {
          border-left: 4px solid #2563eb !important;
        }

        .seo-action-item {
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          display: inline-flex !important;
        }

        @media print {
           .no-print { display: none !important; }
           body { background: white; }
           .report-builder { background: white; padding: 0; }
           .report-document { margin: 0; box-shadow: none; max-width: 100%; }
           .report-textarea { background: none; border: none; padding: 0; }
        }
      `}</style>
    </div>
  );
};

export default ReportBuilder;
