import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const CompletionStep = () => {
  const { data, completeOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    await completeOnboarding();
    // isComplete is now true in context — App.jsx gate opens, dashboard renders without reload
  };

  return (
    <div className="onboarding-card text-center">
      <div className="mb-4">
        <div className="success-check-lottie mx-auto" style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-check text-success fa-2x"></i>
        </div>
      </div>
      <h2 className="fw-bold mb-2">You’re ready to go!</h2>
      <p className="text-muted mb-4 small">Congratulations! Your content engine is now primed and ready to fly.</p>

      <div className="summary-box p-3 bg-light rounded-3 mb-5 text-start">
        <div className="d-flex align-items-center mb-2">
          <i className="fas fa-briefcase text-primary me-2"></i>
          <span className="small">Brand <strong>{data.brandName}</strong> created</span>
        </div>
        <div className="d-flex align-items-center mb-2">
          <i className="fas fa-magic text-primary me-2"></i>
          <span className="small">First AI post specialized for <strong>{data.platforms.join(', ')}</strong></span>
        </div>
        {data.isScheduled && (
          <div className="d-flex align-items-center">
            <i className="fas fa-calendar-check text-primary me-2"></i>
            <span className="small">Post scheduled and ready for delivery</span>
          </div>
        )}
      </div>

      <button className="btn btn-pilot-ob w-100" onClick={handleFinish} disabled={loading}>
        {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : "Go to Dashboard →"}
      </button>
    </div>
  );
};

export default CompletionStep;
