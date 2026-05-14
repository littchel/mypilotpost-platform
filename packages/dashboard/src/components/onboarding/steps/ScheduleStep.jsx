import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';

const ScheduleStep = () => {
  const { data, updateStep } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async (type) => {
    setLoading(true);
    setError("");
    try {
      // If "Post Now", use current time, else tomorrow
      const date = new Date();
      if (type === 'later') date.setDate(date.getDate() + 1);
      
      await apiRequest("/api/customer/schedule", {
        method: "POST",
        body: JSON.stringify({
          content_id: data.generatedContent?.content_id,
          scheduled_at: date.toISOString(),
          status: type === 'now' ? 'published' : 'scheduled'
        })
      });

      await updateStep(8, { isScheduled: true });
    } catch {
      setError("Scheduling failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card text-center">
      <div className="mb-4">
        <i className="fas fa-calendar-check text-success" style={{ fontSize: '3rem' }}></i>
      </div>
      <h2 className="fw-bold mb-2">First success! Ready to schedule?</h2>
      <p className="text-muted mb-4 small">Complete the loop and get your content in front of your audience.</p>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <div className="d-grid gap-3">
        <button 
          className="btn btn-pilot-ob" 
          onClick={() => handleSchedule('now')}
          disabled={loading}
        >
          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-paper-plane me-2"></i>}
          Post Now
        </button>
        <button 
          className="btn btn-grey" 
          onClick={() => handleSchedule('later')}
          disabled={loading}
        >
          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-clock me-2"></i>}
          Schedule for Tomorrow
        </button>
        <button 
          className="btn btn-link text-muted small" 
          onClick={() => updateStep(8, { isScheduled: false })}
          disabled={loading}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default ScheduleStep;
