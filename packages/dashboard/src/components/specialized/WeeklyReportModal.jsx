import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  TrendingDown, 
  Map, 
  X,
  ArrowRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import PilotButton from "../shared/PilotButton";

const WeeklyReportModal = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="weekly-report-overlay">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="weekly-report-container"
      >
        <div className="report-header">
           <div className="header-badge"><Sparkles size={12} className="me-1" /> WEEKLY GROWTH REPORT</div>
           <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="report-body">
           <div className="report-title-section text-center mb-5">
              <h1>Your Week in Review</h1>
              <p>Strategic analysis for {new Date(report.generated_at).toLocaleDateString()}</p>
           </div>

           <div className="report-main-grid">
              {/* What Worked */}
              <div className="report-pillar worked">
                 <div className="pillar-header">
                    <Trophy size={20} className="text-success" />
                    <h3>Performance Wins</h3>
                 </div>
                 <p>{report.worked}</p>
              </div>

              {/* What Hurt */}
              <div className="report-pillar alert">
                 <div className="pillar-header">
                    <TrendingDown size={20} className="text-danger" />
                    <h3>Growth Inhibitors</h3>
                 </div>
                 <p>{report.hurt}</p>
              </div>
           </div>

           {/* Actions / Roadmap */}
           <div className="report-roadmap-section mt-5">
              <div className="section-label"><Map size={14} className="me-2" /> NEXT STEPS: YOUR ROADMAP</div>
              <div className="roadmap-stack">
                 {report.actions?.map((action, i) => (
                    <div key={i} className="roadmap-item">
                       <div className="roadmap-number">{i + 1}</div>
                       <div className="roadmap-content">{action}</div>
                       <ArrowRight size={16} className="text-muted" />
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="report-footer">
           <div className="footer-promo">
              <TrendingUp size={16} className="text-primary me-2" />
              <span>Acting on these now improves your next Audit Score.</span>
           </div>
           <PilotButton type="primary" onClick={onClose}>Apply Strategy</PilotButton>
        </div>
      </motion.div>

      <style>{`
        .weekly-report-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
          padding: 20px;
        }

        .weekly-report-container {
          width: 100%;
          max-width: 800px;
          background: white;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .report-header {
           padding: 24px 32px;
           display: flex;
           justify-content: space-between;
           align-items: center;
           border-bottom: 1px solid #f1f5f9;
        }

        .header-badge {
           display: flex;
           align-items: center;
           background: #eff6ff;
           color: #2563eb;
           padding: 4px 12px;
           border-radius: 100px;
           font-size: 0.7rem;
           font-weight: 800;
           letter-spacing: 0.05em;
        }

        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; }
        .close-btn:hover { color: #1e293b; }

        .report-body { padding: 40px; overflow-y: auto; max-height: 70vh; }
        
        .report-title-section h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 8px; color: #0f172a; }
        .report-title-section p { color: #64748b; font-size: 1.1rem; }

        .report-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        
        .report-pillar { padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9; }
        .report-pillar.worked { background: #f0fdf4; border-color: #dcfce7; }
        .report-pillar.alert { background: #fff1f2; border-color: #ffe4e6; }

        .pillar-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .pillar-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a; }
        .report-pillar p { font-size: 0.95rem; line-height: 1.6; color: #334155; margin: 0; }

        .section-label { font-size: 0.75rem; font-weight: 800; color: #2563eb; letter-spacing: 0.05em; margin-bottom: 20px; display: flex; align-items: center; }

        .roadmap-stack { display: flex; flex-direction: column; gap: 12px; }
        .roadmap-item {
           background: #f8fafc;
           padding: 16px 20px;
           border-radius: 16px;
           display: flex;
           align-items: center;
           gap: 16px;
           border: 1px solid #e2e8f0;
        }
        .roadmap-number { width: 32px; height: 32px; background: #fff; border: 2px solid #2563eb; color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
        .roadmap-content { flex: 1; font-size: 0.95rem; font-weight: 500; color: #1e293b; }

        .report-footer {
           background: #f8fafc;
           padding: 32px 40px;
           border-top: 1px solid #f1f5f9;
           display: flex;
           justify-content: space-between;
           align-items: center;
        }

        .footer-promo { display: flex; align-items: center; font-size: 0.9rem; color: #64748b; font-weight: 500; }
      `}</style>
    </div>
  );
};

export default WeeklyReportModal;
