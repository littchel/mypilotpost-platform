import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';

const GoalsStep = () => {
  const { data, updateStep } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState(data.goals || []);
  const [loading, setLoading] = useState(false);

  const goalOptions = [
    { id: 'brand_awareness', label: 'Brand Awareness', icon: 'fa-bullhorn' },
    { id: 'lead_gen', label: 'Lead Generation', icon: 'fa-user-plus' },
    { id: 'engagement', label: 'Engagement', icon: 'fa-comments' },
    { id: 'sales', label: 'Sales / Conversions', icon: 'fa-shopping-cart' },
    { id: 'thought_leadership', label: 'Thought Leadership', icon: 'fa-lightbulb' }
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
      // Save goals to brand
      await apiRequest(`/api/customer/brands/${data.brandId}`, {
        method: "PATCH",
        body: JSON.stringify({ goals: selectedGoals })
      });
      await updateStep(5, { goals: selectedGoals });
    } catch (err) {
      console.error("Goals save failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card">
      <h2 className="fw-bold mb-2">What are your primary goals?</h2>
      <p className="text-muted mb-4 small">Maximize your impact with curated objectives.</p>

      <div className="goals-grid mb-4">
        {goalOptions.map(goal => (
          <div 
            key={goal.id}
            className={`goal-item d-flex align-items-center p-3 mb-2 border rounded-3 cursor-pointer transition-all ${selectedGoals.includes(goal.id) ? 'border-primary bg-light-primary border-2' : ''}`}
            onClick={() => toggleGoal(goal.id)}
          >
            <div className={`goal-icon me-3 ${selectedGoals.includes(goal.id) ? 'text-primary' : 'text-muted'}`}>
              <i className={`fas ${goal.icon} fa-lg`}></i>
            </div>
            <div className="fw-bold">{goal.label}</div>
            {selectedGoals.includes(goal.id) && <i className="fas fa-check-circle ms-auto text-primary"></i>}
          </div>
        ))}
      </div>

      <button 
        className="btn btn-pilot-ob w-100 mt-2" 
        onClick={handleSubmit}
        disabled={loading || selectedGoals.length === 0}
      >
        {loading ? <span className="spinner-border spinner-border-sm"></span> : "Choose Platforms →"}
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
