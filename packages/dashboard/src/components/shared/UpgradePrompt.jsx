import React from 'react';
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react';

const UpgradePrompt = ({ feature, message, onUpgrade }) => {
  return (
    <div className="upgrade-prompt-container animate-fade-in py-5 px-4 text-center glass-card border-0 shadow-lg" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="prompt-icon mb-4 d-inline-flex p-4 rounded-circle bg-primary-light text-primary">
        <Zap size={48} fill="currentColor" />
      </div>
      
      <h2 className="fw-black mb-3">Premium Feature</h2>
      <p className="text-muted lead mb-4">
        {message || `The ${feature} engine is a professional-grade strategy tool. Upgrade your plan to unlock full access and scale your brand.`}
      </p>

      <div className="d-grid gap-3 mb-5">
        <button 
          onClick={onUpgrade}
          className="btn btn-primary btn-lg py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
        >
          View Professional Plans <ArrowRight size={20} />
        </button>
        <div className="mt-2 text-center">
            <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'promotions' })); }} className="text-primary fw-bold text-decoration-none small d-flex align-items-center justify-content-center gap-2">
                Or invite a friend to unlock 7 free days <ArrowRight size={14} />
            </a>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-center gap-4 text-muted x-small pt-4 border-top">
        <div className="d-flex align-items-center gap-1">
          <ShieldCheck size={14} className="text-success" />
          <span>No long-term contracts</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <ShieldCheck size={14} className="text-success" />
          <span>Cancel anytime</span>
        </div>
      </div>

      <style>{`
        .bg-primary-light {
          background: rgba(37, 99, 235, 0.1);
        }
        .fw-black {
          font-weight: 900;
        }
        .glass-card {
           background: rgba(255, 255, 255, 0.8);
           backdrop-filter: blur(12px);
           -webkit-backdrop-filter: blur(12px);
           border-radius: 24px;
        }
      `}</style>
    </div>
  );
};

export default UpgradePrompt;
