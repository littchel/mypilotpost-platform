import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShieldAlert, TrendingUp, Cpu, CheckCircle } from "lucide-react";

/**
 * GrowthReportReveal
 * A hardened, step-based loading experience for AI Growth Strategy Reports.
 */
const GrowthReportReveal = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    { id: 'aggregate', label: "Aggregating performance architecture...", icon: Search },
    { id: 'swot', label: "Mapping platform-specific SWOT vulnerabilities...", icon: ShieldAlert },
    { id: 'predictive', label: "Projecting 14-day growth trajectory...", icon: TrendingUp },
    { id: 'reasoning', label: "Injecting predictive reasoning...", icon: Cpu },
    { id: 'finalize', label: "Finalizing Strategic Report...", icon: CheckCircle }
  ];

  useEffect(() => {
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1200); // High-impact pause before reveal
      }
    }, [1500, 2000, 1800, 2200, 1000][currentStep] || 1500); // Variable timing for realism

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="report-reveal-overlay">
       <motion.div 
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         className="reveal-card"
       >
          <div className="reveal-header">
             <div className="ai-status-pulse"></div>
             <span>STRATEGIC ENGINE ACTIVE</span>
          </div>

          <div className="reveal-body">
             <AnimatePresence mode="wait">
                <motion.div 
                   key={step}
                   initial={{ x: 20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: -20, opacity: 0 }}
                   className="reveal-step-content"
                >
                   {React.createElement(steps[step].icon, { size: 40, className: "text-primary mb-3" })}
                   <h3>{steps[step].label}</h3>
                </motion.div>
             </AnimatePresence>

             <div className="reveal-progress-container mt-4">
                <div className="reveal-progress-track">
                   <motion.div 
                     className="reveal-progress-fill"
                     initial={{ width: "0%" }}
                     animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                   />
                </div>
                <div className="reveal-steps-counter">
                   Step {step + 1} of {steps.length}
                </div>
             </div>
          </div>
       </motion.div>

       <style>{`
         .report-reveal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.98);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(12px);
         }

         .reveal-card {
            width: 100%;
            max-width: 500px;
            background: white;
            padding: 40px;
            border-radius: 32px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
         }

         .reveal-header {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: #64748b;
            margin-bottom: 30px;
            padding: 6px 16px;
            background: #f1f5f9;
            border-radius: 100px;
         }

         .ai-status-pulse {
            width: 8px; height: 8px;
            background: #3b82f6;
            border-radius: 50%;
            animation: pulse-ring 1.25s infinite;
         }

         @keyframes pulse-ring {
            0% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            100% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
         }

         .reveal-step-content h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
         }

         .reveal-progress-container {
            width: 100%;
         }

         .reveal-progress-track {
            height: 6px;
            background: #f1f5f9;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 12px;
         }

         .reveal-progress-fill {
            height: 100%;
            background: #3b82f6;
            transition: width 0.4s ease;
         }

         .reveal-steps-counter {
            font-size: 0.75rem;
            font-weight: 600;
            color: #94a3b8;
         }
       `}</style>
    </div>
  );
};

export default GrowthReportReveal;
