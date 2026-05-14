import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp, Target, ShieldCheck, Share2, Zap } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.mypilotpost.com";

/**
 * PublicReportView
 * A standalone, viral public view for shared AI Growth Strategy Reports.
 */
const PublicReportView = () => {
  const { publicId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [publicId]);

  const fetchReport = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/public/reports/${publicId}`);
      if (!resp.ok) throw new Error("Report not found");
      const data = await resp.json();
      setReport(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-5 text-center">Loading Strategic Report...</div>;
  if (!report) return <div className="p-5 text-center">Unauthorized or Not Found</div>;

  const content = JSON.parse(report.content_json);

  return (
    <div className="public-report-container">
       <header className="public-report-header">
           <div className="branding">myPilotPost <span className="badge">STRATEGY</span></div>
           <div className="report-meta">Generated on {new Date(report.created_at).toLocaleDateString()} • Score: {report.score_at_time}</div>
       </header>

       <main className="report-main-content">
          <section className="report-hero">
             <h1>AI Growth Strategy Report</h1>
             <p className="summary-text">{content.summary}</p>
          </section>

          <div className="report-grid">
             {/* SWOT Matrix */}
             <div className="report-card full">
                <h3>SWOT Analysis</h3>
                <div className="swot-matrix">
                   <div className="swot-item s"><h4>Strengths</h4><ul>{content.swot.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
                   <div className="swot-item w"><h4>Weaknesses</h4><ul>{content.swot.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
                   <div className="swot-item o"><h4>Opportunities</h4><ul>{content.swot.opportunities.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
                   <div className="swot-item t"><h4>Threats</h4><ul>{content.swot.threats.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
                </div>
             </div>

             {/* Predictive Projections */}
             <div className="report-card">
                <div className="d-flex align-items-center gap-2 mb-3">
                   <TrendingUp className="text-primary" />
                   <h3>Predictive Growth</h3>
                </div>
                <div className="projection-value">{content.projection.percentage}</div>
                <p className="reasoning-text"><strong>Reasoning:</strong> {content.projection.reasoning}</p>
             </div>

             {/* Top Pattern */}
             <div className="report-card">
                <div className="d-flex align-items-center gap-2 mb-3">
                   <Zap className="text-warning" />
                   <h3>Top Growth Pattern</h3>
                </div>
                <p className="pattern-focus">{content.top_pattern}</p>
                <div className="pattern-badge">ELITE EFFICIENCY</div>
             </div>
          </div>
       </main>

       {/* VIRAL DISTRIBUTION FOOTER */}
       <footer className="public-report-footer">
          <div className="footer-cta">
             <h3>Ready to scale your own brand?</h3>
             <p>Generate your proprietary AI Growth Strategy Report in seconds.</p>
             <button className="cta-button" onClick={() => window.location.href = 'https://mypilotpost.com/signup'}>
                Get Your AI Report Free
             </button>
          </div>
          <div className="footer-credits">
             © 2026 myPilotPost Strategy Engine • Private & Confidential Strategy Asset
          </div>
       </footer>

       <style>{`
         .public-report-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
            font-family: 'Inter', sans-serif;
            color: #1e293b;
         }

         .public-report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 60px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
         }

         .branding { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.02em; }
         .branding .badge { font-size: 0.6rem; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; vertical-align: middle; margin-left: 8px; }
         .report-meta { font-size: 0.8rem; color: #64748b; font-weight: 600; }

         .report-hero { margin-bottom: 60px; }
         .report-hero h1 { font-size: 3rem; font-weight: 900; margin-bottom: 24px; color: #0f172a; }
         .summary-text { font-size: 1.25rem; line-height: 1.6; color: #475569; max-width: 800px; }

         .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
         .report-card { background: #f8fafc; padding: 32px; border-radius: 24px; border: 1px solid #f1f5f9; }
         .report-card.full { grid-column: span 2; }
         .report-card h3 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #1e293b; }

         .swot-matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
         .swot-item h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; font-weight: 800; }
         .swot-item ul { padding-left: 18px; color: #475569; font-size: 0.9rem; margin: 0; }
         .swot-item li { margin-bottom: 8px; }
         .swot-item.s h4 { color: #10b981; }
         .swot-item.w h4 { color: #f59e0b; }
         .swot-item.o h4 { color: #3b82f6; }
         .swot-item.t h4 { color: #ef4444; }

         .projection-value { font-size: 4rem; font-weight: 900; color: #3b82f6; line-height: 1; margin: 20px 0; }
         .reasoning-text { font-size: 0.9rem; line-height: 1.5; color: #64748b; }

         .pattern-focus { font-size: 1.5rem; font-weight: 700; margin: 20px 0; color: #0f172a; }
         .pattern-badge { display: inline-block; padding: 6px 12px; background: #fffbeb; color: #92400e; font-size: 0.7rem; font-weight: 800; border-radius: 6px; }

         .public-report-footer { margin-top: 80px; text-align: center; border-top: 2px solid #f1f5f9; padding-top: 60px; }
         .footer-cta { background: #0f172a; color: white; padding: 60px; border-radius: 32px; margin-bottom: 40px; }
         .footer-cta h3 { font-size: 2rem; font-weight: 800; margin-bottom: 12px; }
         .footer-cta p { opacity: 0.7; margin-bottom: 30px; }
         .cta-button { background: #3b82f6; color: white; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; }
         .cta-button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.4); }

         .footer-credits { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }

         @media print {
            .public-report-footer { display: none; }
            .public-report-container { padding: 0; }
         }
       `}</style>
    </div>
  );
};

export default PublicReportView;
