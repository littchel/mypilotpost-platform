import React, { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";

// Pre-computed particle positions to avoid calling Math.random() during render
const PARTICLE_POSITIONS = [...Array(20)].map((_, i) => ({
  left: ((i * 17 + 7) % 100),
  delay: ((i * 0.3) % 3),
  color: ['#FFD700', '#60a5fa', '#35C961', '#fdf2f8'][i % 4],
}));

/**
 * CelebrationOverlay
 * A high-impact, full-screen animation trigger for level-ups and viral milestones.
 */
const CelebrationOverlay = ({ show, message, subtext }) => {
  const particleStyles = useMemo(() => PARTICLE_POSITIONS.map((p, i) => `
               .p-${i} {
                  left: ${p.left}%;
                  animation-delay: ${p.delay}s;
                  background: ${p.color};
               }
            `).join(''), []);

  return (
    <AnimatePresence>
      {show && (
        <div className="celebration-overlay-fixed">
          <div className="confetti-container">
             {/* Dynamic CSS Confetti Particles */}
             {[...Array(20)].map((_, i) => (
                <div key={i} className={`particle p-${i}`} />
             ))}
          </div>

          <div className="celebration-content">
             <div className="icon-pulse">
                <Trophy size={80} color="#FFD700" />
             </div>

             <h1 className="celebration-title">{message}</h1>
             <p className="celebration-subtext">{subtext || "You're outperforming 85% of brands in your industry."}</p>

             <div className="growth-indicator-hero">
                <TrendingUp size={24} />
                <span>Strategic Milestone Unlocked</span>
             </div>
          </div>

          <style>{`
            .celebration-overlay-fixed {
               position: fixed;
               top: 0; left: 0; right: 0; bottom: 0;
               background: rgba(15, 23, 42, 0.95);
               z-index: 9999;
               display: flex;
               align-items: center;
               justify-content: center;
               backdrop-filter: blur(10px);
            }

            .celebration-content { text-align: center; color: white; }

            .celebration-title { font-size: 3rem; font-weight: 900; margin: 20px 0 10px; }
            .celebration-subtext { font-size: 1.2rem; opacity: 0.7; margin-bottom: 40px; }

            .icon-pulse {
               animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            @keyframes pulse-ring {
               0% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
               70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); }
               100% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
            }

            .growth-indicator-hero {
               display: inline-flex;
               align-items: center;
               gap: 12px;
               background: rgba(53, 201, 97, 0.2);
               color: #35C961;
               padding: 12px 24px;
               border-radius: 100px;
               font-weight: 800;
               letter-spacing: 0.05em;
               border: 1px solid rgba(53, 201, 97, 0.3);
            }

            .confetti-container { position: absolute; inset: 0; pointer-events: none; }
            .particle {
               position: absolute;
               width: 10px; height: 10px;
               background: #FFD700;
               top: -10px;
               animation: drop 3s infinite linear;
            }
            ${particleStyles}

            @keyframes drop {
               to { transform: translateY(100vh) rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationOverlay;
