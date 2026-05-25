import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';

const GoalsStep = () => {
  const { data, step, updateStep, signupSource } = useOnboarding();
  const isAuditPath = signupSource === 'brand_audit';

  const [selectedGoals, setSelectedGoals] = useState(data.goals || []);
  const [loading, setLoading] = useState(false);

  // Goals that came from the audit intake form — shown with a badge
  const auditSuggestedGoals = isAuditPath && data.goals?.length > 0 ? data.goals : [];

  const goalOptions = [
    { id: 'brand_awareness', label: 'Brand Awareness', icon: 'fa-bullhorn', desc: 'Increase visibility and reach' },
    { id: 'lead_gen', label: 'Lead Generation', icon: 'fa-user-plus', desc: 'Attract qualified prospects' },
    { id: 'engagement', label: 'Engagement', icon: 'fa-comments', desc: 'Build community and loyalty' },
    { id: 'sales', label: 'Sales / Conversions', icon: 'fa-shopping-cart', desc: 'Drive revenue and conversions' },
    { id: 'thought_leadership', label: 'Thought Leadership', icon: 'fa-lightbulb', desc: 'Establish expert authority' }
  ];

  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (data.brandId) {
        await apiRequest(`/api/customer/brands/${data.brandId}`, {
          method: "PATCH",
          body: JSON.stringify({ goals: selectedGoals })
        });
      }
      await updateStep(step + 1, { goals: selectedGoals });
    } catch (err) {
      console.error("Goals save failed", err);
      await updateStep(step + 1, { goals: selectedGoals });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card">
      <h2 className="fw-bold mb-2">
        {isAuditPath ? 'Confirm your goals' : 'What are your primary goals?'}
      </h2>
      <p className="text-muted mb-1 small">
        {isAuditPath
          ? 'We suggested these based on your audit. Edit freely.'
          : 'Maximize your impact with curated objectives.'}
      </p>

      {isAuditPath && auditSuggestedGoals.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-3"
          style={{ background: '#fef9c3', border: '1px solid #fde68a', fontSize: '0.78rem' }}>
          <i className="fas fa-star text-warning"></i>
          <span className="fw-bold text-warning-emphasis">Pre-selected from your audit</span>
        </div>
      )}

      <div className="goals-grid mb-4">
        {goalOptions.map(goal => {
          const isSelected = selectedGoals.includes(goal.id);
          const isAuditSuggested = auditSuggestedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              className={`goal-item d-flex align-items-center p-3 mb-2 border rounded-3 cursor-pointer transition-all ${isSelected ? 'border-primary bg-light-primary border-2' : ''}`}
              onClick={() => toggleGoal(goal.id)}
            >
              <div className={`goal-icon me-3 ${isSelected ? 'text-primary' : 'text-muted'}`}>
                <i className={`fas ${goal.icon} fa-lg`}></i>
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold">{goal.label}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{goal.desc}</div>
              </div>
              <div className="d-flex align-items-center gap-2 ms-2">
                {isAuditPath && isAuditSuggested && !isSelected && (
                  <span className="badge rounded-pill" style={{ background: '#fef9c3', color: '#854d0e', fontSize: '0.65rem', border: '1px solid #fde68a' }}>
                    Suggested
                  </span>
                )}
                {isSelected && <i className="fas fa-check-circle text-primary"></i>}
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-pilot-ob w-100 mt-2"
        onClick={handleSubmit}
        disabled={loading || selectedGoals.length === 0}
      >
        {loading ? <span className="spinner-border spinner-border-sm"></span> : "Continue →"}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .goal-item { transition: all 0.2s; cursor: pointer; }
        .goal-item:hover { background: #f8fafc; border-color: #cbd5e1; }
        .bg-light-primary { background: #eff6ff !important; }
      `}} />
    </div>
  );
};

export default GoalsStep;
