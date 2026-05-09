import React from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const WelcomeStep = () => {
  const { updateStep } = useOnboarding();

  return (
    <div className="onboarding-card text-center">
      <div className="mb-4">
        <i className="fas fa-rocket text-primary" style={{ fontSize: '3rem' }}></i>
      </div>
      <h2 className="fw-bold mb-3">Let’s set up your content engine</h2>
      <p className="text-muted mb-4">
        Ready for takeoff? We’re building your personalized content system to manage your digital footprint effortlessly.
      </p>
      <div className="features-mini mb-5 text-start px-md-4">
        <div className="d-flex align-items-center mb-3">
          <div className="icon-circle bg-light-primary me-3">
            <i className="fas fa-check text-primary"></i>
          </div>
          <div>Create your Brand ID</div>
        </div>
        <div className="d-flex align-items-center mb-3">
          <div className="icon-circle bg-light-primary me-3">
            <i className="fas fa-magic text-primary"></i>
          </div>
          <div>Generate your first AI post</div>
        </div>
        <div className="d-flex align-items-center">
          <div className="icon-circle bg-light-primary me-3">
            <i className="fas fa-calendar-check text-primary"></i>
          </div>
          <div>Schedule for auto-delivery</div>
        </div>
      </div>
      <button className="btn btn-pilot-ob w-100" onClick={() => updateStep(2)}>
        Get Started →
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-light-primary { background: #eff6ff; }
        .icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}} />
    </div>
  );
};

export default WelcomeStep;
