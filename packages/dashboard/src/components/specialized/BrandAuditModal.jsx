import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  X,
  ArrowRight,
  Sparkles
} from "lucide-react";
import PilotButton from "../shared/PilotButton";

const BrandAuditModal = ({ auditData, onClose, onRefresh, onFix }) => {
  const [stage, setStage] = useState("loading"); // loading -> reveal -> audit

  useEffect(() => {
    // Stage 1: Loading Interstitial (1.5s)
    const t1 = setTimeout(() => setStage("reveal"), 1500);
    // Stage 2: Hero Reveal (1s)
    const t2 = setTimeout(() => setStage("audit"), 2500);
    
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!auditData) return null;

  return (
    <div className="brand-audit-overlay">
      <AnimatePresence mode="wait">
        {stage === "loading" && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="audit-stage-fullscreen"
          >
            <div className="audit-loading-content">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="ai-pulse-orb"
              >
                <Zap size={60} fill="#2563eb" color="#2563eb" />
              </motion.div>
              <h2>Analyzing your brand...</h2>
              <p>Cross-referencing engagement trends and delivery patterns.</p>
            </div>
          </motion.div>
        )}

        {stage === "reveal" && (
          <motion.div 
            key="reveal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="audit-stage-fullscreen reveal-stage"
          >
            <div className="reveal-content text-center">
              <Sparkles size={80} className="text-primary mb-4" />
              <h1 className="reveal-title">Your Brand Intelligence is Ready</h1>
            </div>
          </motion.div>
        )}

        {stage === "audit" && (
          <motion.div 
            key="audit"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="audit-modal-container"
          >
            <div className="audit-modal-header">
               <div className="header-left">
                  <div className="score-circle">
                     {/* Dynamic Color based on Delta */}
                     <svg viewBox="0 0 36 36" className={`circular-chart ${auditData.score_delta > 0 ? 'green' : 'blue'}`}>
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray={`${auditData.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20.35" className="percentage">{auditData.score}</text>
                     </svg>
                  </div>
                  <div className="score-info">
                     <div className="d-flex align-items-center gap-2">
                        <h3>Brand Intelligence Score</h3>
                        {auditData.score_delta !== 0 && (
                           <div className={`delta-badge ${auditData.score_delta > 0 ? 'up' : 'down'}`}>
                              {auditData.score_delta > 0 ? '+' : ''}{auditData.score_delta}
                           </div>
                        )}
                     </div>
                     <p>Strategy is evolving based on {auditData.score > 70 ? 'strong' : 'emerging'} patterns.</p>
                  </div>
               </div>
               <div className="header-right">
                  <button className="close-audit-btn" onClick={onClose}><X size={20} /></button>
               </div>
            </div>

            <div className="audit-modal-body">
               <div className="audit-grid-main">
                  {/* Strategic Summary */}
                  <section className="audit-hero-section">
                     <div className="section-label"><Zap size={14} className="me-2" /> SENIOR STRATEGIST SUMMARY</div>
                     <p className="hero-summary-text">{auditData.summary}</p>
                     
                     {auditData.drivers?.length > 0 && (
                        <div className="delta-drivers-row mt-3">
                           {auditData.drivers.map((d, i) => (
                              <span key={i} className="driver-pill">#{d}</span>
                           ))}
                        </div>
                     )}

                     <div className="score-breakdown-row mt-4">
                        {Object.entries(auditData.breakdown).map(([key, val]) => (
                           <div key={key} className="breakdown-pill">
                              <span className="pill-label">{key.toUpperCase()}</span>
                              <div className="pill-bar-container">
                                 <div className="pill-bar-fill" style={{ width: `${val}%` }}></div>
                              </div>
                              <span className="pill-val">{val}%</span>
                           </div>
                        ))}
                     </div>
                  </section>

                  {/* Strategic Actions */}
                  <section className="audit-actions-section">
                     <div className="section-label"><Target size={14} className="me-2" /> RECOMMENDED ACTIONS</div>
                     
                     {/* Upgrade Moment for Starter (NEW) */}
                     {auditData.is_starter && (
                        <div className="upgrade-promo-box mb-3">
                           <div className="promo-text">
                              <strong>Unlock Full Strategy Access</strong>
                              <p>Pro users get daily trend analysis and custom content playbooks.</p>
                           </div>
                           <PilotButton type="secondary" size="sm" onClick={() => window.location.hash = '#billing'}>Upgrade Now</PilotButton>
                        </div>
                     )}

                     <div className="actions-stack">
                        {auditData.actions?.map((action, i) => (
                           <div key={i} className="audit-action-card">
                              <div className="action-info">
                                 <strong>{action.title}</strong>
                                 <p>{action.description}</p>
                              </div>
                              <PilotButton 
                                type="primary" 
                                size="sm" 
                                icon={ArrowRight}
                                onClick={() => {
                                  if (onFix) {
                                    onFix(action);
                                  } else {
                                    // Fallback navigation
                                    if (action.cta?.toLowerCase().includes('post')) window.location.hash = '#social';
                                    if (action.cta?.toLowerCase().includes('campaign')) window.location.hash = '#campaigns';
                                    onClose();
                                  }
                                }}
                              >
                                 Fix this
                              </PilotButton>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            </div>

            <div className="audit-modal-footer">
               <div className="footer-meta">
                  <span className="audit-date">Generated {new Date(auditData.generated_at).toLocaleDateString()}</span>
               </div>
               <div className="footer-actions">
                  <PilotButton 
                    type="outline" 
                    onClick={() => {
                      const token = localStorage.getItem("mpp_token");
                      const baseUrl = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787";
                      window.open(`${baseUrl}/api/v1/audit/report/${auditData.id}/pdf?token=${token}`, '_blank');
                    }}
                  >
                    Download PDF
                  </PilotButton>
                  <PilotButton type="outline" icon={Share2} onClick={() => {
                    navigator.clipboard.writeText(`My brand scored ${auditData.score}/100 on MyPilotPost Brand Intelligence!`);
                    alert("Audit summary copied to clipboard!");
                  }}>
                    Share Audit
                  </PilotButton>
                  <PilotButton type="secondary" onClick={onRefresh}>Re-run AI Analysis</PilotButton>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .brand-audit-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.95);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          backdrop-filter: blur(8px);
        }

        .audit-stage-fullscreen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .audit-loading-content h2 { font-size: 2rem; margin-top: 24px; font-weight: 700; }
        .audit-loading-content p { opacity: 0.6; font-size: 1.1rem; }

        .reveal-title { font-size: 3rem; font-weight: 800; background: linear-gradient(to right, #60a5fa, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .audit-modal-container {
          width: 95%;
          max-width: 1000px;
          max-height: 90vh;
          background: #fff;
          border-radius: 24px;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .audit-modal-header {
          padding: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }

        .header-left { display: flex; align-items: center; gap: 24px; }
        .score-circle { width: 80px; height: 80px; }
        .score-info h3 { font-size: 1.5rem; font-weight: 800; margin: 0; }
        .score-info p { color: #64748b; margin: 4px 0 0; }

        .audit-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
        }

        .section-label { font-size: 0.7rem; font-weight: 800; color: #2563eb; letter-spacing: 0.05em; margin-bottom: 20px; display: flex; align-items: center; }

        .audit-hero-section {
          background: #f8fafc;
          padding: 32px;
          border-radius: 20px;
          margin-bottom: 32px;
          border: 1px solid #e2e8f0;
        }

        .hero-summary-text { font-size: 1.25rem; font-weight: 500; line-height: 1.6; color: #334155; }

        .score-breakdown-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .breakdown-pill { display: flex; flex-direction: column; gap: 8px; }
        .pill-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; }
        .pill-bar-container { height: 8px; background: #e2e8f0; border-radius: 100px; overflow: hidden; }
        .pill-bar-fill { height: 100%; background: #2563eb; border-radius: 100px; }
        .pill-val { font-size: 0.9rem; font-weight: 800; color: #1e293b; }

        .actions-stack { display: flex; flex-direction: column; gap: 16px; }
        .audit-action-card {
          background: white;
          border: 1px solid #f1f5f9;
          padding: 20px;
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }
        .audit-action-card:hover { border-color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .action-info strong { display: block; font-size: 1rem; margin-bottom: 4px; }
        .action-info p { font-size: 0.85rem; color: #64748b; margin: 0; }

        .audit-modal-footer {
          padding: 24px 32px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .audit-date { font-size: 0.8rem; color: #94a3b8; }
        .footer-actions { display: flex; gap: 12px; }

        .delta-badge { font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
        .delta-badge.up { background: #dcfce7; color: #166534; }
        .delta-badge.down { background: #fee2e2; color: #991b1b; }

        .delta-drivers-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .driver-pill { font-size: 0.7rem; font-weight: 700; color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 4px 10px; border-radius: 100px; border: 1px solid rgba(59, 130, 246, 0.2); }

        .upgrade-promo-box { background: linear-gradient(to right, #2563eb, #1e40af); padding: 20px; border-radius: 16px; color: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3); }
        .promo-text strong { display: block; font-size: 0.95rem; margin-bottom: 2px; }
        .promo-text p { font-size: 0.8rem; margin: 0; opacity: 0.9; }

        .circular-chart { display: block; margin: 10px auto; max-width: 100%; max-height: 250px; }
        .circle-bg { fill: none; stroke: #eee; stroke-width: 3.8; }
        .circle { fill: none; stroke-width: 2.8; stroke-linecap: round; animation: progress 1s ease-out forwards; }
        .circular-chart.blue .circle { stroke: #2563eb; }
        .circular-chart.green .circle { stroke: #10b981; }
        .percentage { fill: #1e293b; font-family: sans-serif; font-size: 0.7em; text-anchor: middle; font-weight: 800; }

        @keyframes progress { 0% { stroke-dasharray: 0 100; } }
        .close-audit-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
        .close-audit-btn:hover { color: #1e293b; }
      `}</style>
    </div>
  );
};

export default BrandAuditModal;
