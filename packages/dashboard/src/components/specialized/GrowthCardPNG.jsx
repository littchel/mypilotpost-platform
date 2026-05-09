import React, { useRef } from "react";
import { motion } from "framer-motion";
import { 
  Download, 
  Share2, 
  Zap, 
  Trophy, 
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import PilotButton from "../shared/PilotButton";

const GrowthCardPNG = ({ auditData, archetype, achievements, progression }) => {
  const cardRef = useRef(null);

  const handleDownload = () => {
    // Cross-device fallback logic
    try {
       alert("Exporting high-fidelity PNG... (Simulated)");
       console.log("PNG Export Payload:", { score: auditData.score, delta: auditData.score_delta, archetype, level: progression?.level });
    } catch (e) {
       // Manual fallback
       alert("Canvas rendering unavailable. Please take a screenshot for highest fidelity.");
    }
  };

  const copyCaption = () => {
     const caption = `Just hit Level ${progression?.level || 1} as a ${archetype?.replace('_', ' ')} on @myPilotPost! 🚀 Score: ${auditData.score} (+${auditData.score_delta}% growth). Identity: Hardened strategist.`;
     navigator.clipboard.writeText(caption);
     alert("Caption copied to clipboard!");
  };

  if (!auditData) return null;

  return (
    <div className="share-card-wrapper">
       <div className="share-card-preview" ref={cardRef}>
          <div className="card-inner">
             <div className="card-glow"></div>
             
             <header className="card-header">
                <div className="brand-logotype">myPilotPost</div>
                <div className="identity-stack">
                   <div className={`archetype-tag ${archetype}`}>
                      LEVEL {progression?.level || 1} {archetype?.toUpperCase() || 'STRATEGIST'}
                   </div>
                   <div className="percentile-badge">Top {progression?.percentile || 15}%</div>
                </div>
             </header>

             <main className="card-hero">
                <div className="score-main">
                   <div className="score-value">{auditData.score}</div>
                   <div className="score-label">INTELLIGENCE SCORE</div>
                </div>
                
                {auditData.score_delta !== 0 && (
                   <div className={`growth-stat ${auditData.score_delta > 0 ? 'positive' : ''}`}>
                      <TrendingUp size={24} />
                      <span>{auditData.score_delta > 0 ? '+' : ''}{auditData.score_delta}% Growth</span>
                   </div>
                )}
             </main>

             <footer className="card-footer">
                <div className="card-achievements">
                   {achievements?.slice(0, 2).map((ach, i) => (
                      <div key={i} className="ach-item">
                         <Trophy size={16} />
                         <span>{ach.achievement_key.replace('_', ' ')}</span>
                      </div>
                   ))}
                </div>
                <div className="narrative-box">
                   "Consistency has unlocked an elite reach tier."
                </div>
             </footer>
          </div>
       </div>

       <div className="share-actions mt-4">
          <PilotButton type="secondary" icon={Download} onClick={handleDownload}>Download PNG</PilotButton>
          <PilotButton type="outline" icon={Share2} onClick={copyCaption}>Copy Caption</PilotButton>
       </div>

       <style>{`
          .share-card-preview {
             width: 100%;
             aspect-ratio: 1.91 / 1;
             background: #0f172a;
             border-radius: 24px;
             position: relative;
             overflow: hidden;
             display: flex;
             color: white;
             box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4);
          }

          .card-inner {
             flex: 1;
             padding: 40px;
             display: flex;
             flex-direction: column;
             justify-content: space-between;
             position: relative;
             z-index: 2;
          }

          .card-glow {
             position: absolute;
             top: -50%;
             left: -20%;
             width: 140%;
             height: 200%;
             background: radial-gradient(circle at center, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
             z-index: 1;
             pointer-events: none;
          }

          .brand-logotype {
             font-weight: 900;
             letter-spacing: -0.02em;
             font-size: 1.4rem;
             background: linear-gradient(to right, #60a5fa, #3b82f6);
             -webkit-background-clip: text;
             -webkit-text-fill-color: transparent;
          }

          .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
          .identity-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
          
          .archetype-tag {
             font-size: 0.7rem;
             font-weight: 800;
             padding: 6px 14px;
             border-radius: 100px;
             background: rgba(255,255,255,0.1);
             backdrop-filter: blur(4px);
             border: 1px solid rgba(255,255,255,0.2);
          }
          .percentile-badge { font-size: 0.6rem; font-weight: 700; opacity: 0.6; text-transform: uppercase; }

          .card-hero { flex: 1; display: flex; align-items: center; gap: 40px; }
          
          .score-main { display: flex; flex-direction: column; }
          .score-value { font-size: 5rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
          .score-label { font-size: 0.8rem; font-weight: 800; opacity: 0.5; letter-spacing: 0.1em; }

          .growth-stat { 
             display: flex; 
             align-items: center; 
             gap: 12px; 
             background: rgba(53, 201, 97, 0.1); 
             color: #35C961; 
             padding: 12px 24px; 
             border-radius: 20px;
             font-size: 1.2rem;
             font-weight: 800;
             border: 1px solid rgba(53, 201, 97, 0.2);
          }

          .card-footer { display: flex; justify-content: space-between; align-items: center; }
          .card-achievements { display: flex; gap: 12px; }
          .ach-item {
             display: flex;
             align-items: center;
             gap: 8px;
             background: rgba(255,255,255,0.05);
             padding: 8px 16px;
             border-radius: 12px;
             font-size: 0.8rem;
             font-weight: 600;
             opacity: 0.8;
          }

          .narrative-box {
             font-size: 0.75rem;
             font-style: italic;
             opacity: 0.6;
             max-width: 200px;
             text-align: right;
          }

          .share-actions { display: flex; gap: 12px; }
       `}</style>
    </div>
  );
};

export default GrowthCardPNG;
