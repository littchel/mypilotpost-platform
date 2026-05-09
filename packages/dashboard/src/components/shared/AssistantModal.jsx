import React, { useState } from 'react';

/**
 * AssistantModal - FINAL LOCK REBUILD
 * 1:1 Parity with index.html structure.
 */
export default function AssistantModal({ isOpen, onClose, mode = 'social' }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    intention: '',
    platforms: [],
    tone: '',
    emoji: false,
    cta: 'Learn More'
  });

  if (!isOpen) return null;

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h6 className="fw-bold mb-3 text-main">What's your intention?</h6>
            <div className="grid-2x2 gap-2 mb-4">
              {['Promote Product', 'Share News', 'Ask Question', 'Educational'].map(opt => (
                <button 
                  key={opt}
                  className={`btn-grey ${data.intention === opt ? 'active' : ''}`}
                  onClick={() => setData({ ...data, intention: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="extra-small fw-bold text-muted mb-2 d-block text-uppercase">Additional Context</label>
              <textarea 
                className="input-pill w-100 res-none" 
                rows="3" 
                placeholder="Give me some details..."
              ></textarea>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h6 className="fw-bold mb-3 text-main">Tone & Style</h6>
            <div className="grid-2x2 gap-2 mb-4">
              {['Professional', 'Casual', 'Witty', 'Urgent'].map(opt => (
                <button 
                  key={opt}
                  className={`btn-grey ${data.tone === opt ? 'active' : ''}`}
                  onClick={() => setData({ ...data, tone: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="d-flex align-items-center mb-4">
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="emojiSwitch" 
                  checked={data.emoji}
                  onChange={(e) => setData({ ...data, emoji: e.target.checked })}
                />
                <label className="form-check-label extra-small fw-bold ms-2 text-main" htmlFor="emojiSwitch">Include Emojis</label>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h6 className="fw-bold mb-3 text-main">Final Touches</h6>
            <div className="mb-4">
              <label className="extra-small fw-bold text-muted mb-2 d-block text-uppercase">Call to Action</label>
              <select 
                className="input-pill w-100"
                value={data.cta}
                onChange={(e) => setData({ ...data, cta: e.target.value })}
              >
                <option>Learn More</option>
                <option>Shop Now</option>
                <option>Sign Up</option>
                <option>Contact Us</option>
              </select>
            </div>
            <div className="badge bg-info w-100 py-3 text-start mb-3">
              <i className="fas fa-magic me-2"></i>
              I'll generate 3 variants based on your strategy.
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal show d-block bg-dark-overlay" tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content rounded-lg border-subtle overflow-hidden">
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold text-main">
              <i className="fas fa-robot me-2 text-primary"></i>
              myPilotPost Assistant - {mode === 'social' ? 'Social' : 'Blog'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="wizard-steps">
              {[1, 2, 3].map(i => (
                <div key={i} className="wizard-step">
                  <div className={`step-circle ${step === i ? 'active' : step > i ? 'completed' : ''}`}>
                    {step > i ? <i className="fas fa-check"></i> : i}
                  </div>
                  <div className={`extra-small fw-bold ${step === i ? 'text-primary' : 'text-muted'}`}>Step {i}</div>
                </div>
              ))}
            </div>

            {renderStep()}

            <div className="d-flex justify-content-between mt-4">
              {step > 1 ? (
                <button className="btn-grey" onClick={prevStep}>
                  <i className="fas fa-arrow-left me-2"></i> Previous
                </button>
              ) : <div />}
              
              {step < 3 ? (
                <button className="btn-pilot" onClick={nextStep}>
                  Next <i className="fas fa-arrow-right ms-2"></i>
                </button>
              ) : (
                <button className="btn-pilot" onClick={onClose}>
                  <i className="fas fa-magic me-2"></i> Generate Content
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
