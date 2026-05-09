import React from 'react';
import { 
  X, AlertCircle, TrendingUp, Zap, 
  ArrowRight, Info, CheckCircle2 
} from 'lucide-react';

const InsightModal = ({ isOpen, onClose, insight, onAction }) => {
  if (!isOpen || !insight) return null;

  return (
    <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ 
      position: 'fixed', 
      top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(15, 23, 42, 0.4)', 
      backdropFilter: 'blur(8px)',
      zIndex: 2000 
    }}>
      <div className="card-workspace p-0 border-0 shadow-lg animate__animated animate__zoomIn" style={{ 
        width: '100%', 
        maxWidth: '500px', 
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#fff'
      }}>
        {/* Header */}
        <div className="p-4 d-flex justify-content-between align-items-center border-bottom bg-light bg-opacity-50">
          <div className="d-flex align-items-center gap-2">
            <div className={`p-2 rounded-3 ${insight.priority === 'high' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'}`}>
              {insight.priority === 'high' ? <AlertCircle size={20} /> : <Zap size={20} />}
            </div>
            <h6 className="fw-bold mb-0 text-main">Intelligence Insight</h6>
          </div>
          <button className="btn btn-link text-muted p-1" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h4 className="fw-bold text-main mb-3" style={{ letterSpacing: '-0.02em' }}>{insight.title}</h4>
          
          <div className="p-3 bg-light rounded-4 mb-4 border">
            <div className="d-flex gap-2 mb-2">
              <Info size={16} className="text-muted mt-1" />
              <div className="small fw-bold text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Explanation</div>
            </div>
            <p className="small text-main mb-0 leading-relaxed">{insight.explanation}</p>
          </div>

          <div className="mb-4">
            <div className="d-flex gap-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <div className="small fw-bold text-primary text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Context & Impact</div>
            </div>
            <p className="small text-muted mb-0">{insight.context}</p>
          </div>

          <div className="p-3 border border-success border-opacity-25 rounded-4 bg-success bg-opacity-10">
            <div className="d-flex gap-2 mb-2">
              <CheckCircle2 size={16} className="text-success" />
              <div className="small fw-bold text-success text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Recommended Action</div>
            </div>
            <p className="small text-main mb-0 fw-medium">{insight.action}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-light border-top d-flex gap-3">
          <button className="btn btn-white border w-100 fw-bold small py-2" onClick={onClose}>Dismiss</button>
          <button 
            className="btn btn-primary w-100 fw-bold small py-2 d-flex align-items-center justify-content-center gap-2" 
            onClick={() => {
              onAction(insight.tab);
              onClose();
            }}
          >
            {insight.cta} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InsightModal;
