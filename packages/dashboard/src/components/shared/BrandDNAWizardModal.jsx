import React, { useState } from 'react';
import { X, Target, Zap, TrendingUp, Building2, Globe, MessageCircle } from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { apiRequest } from '../../lib/api/client';

const BrandDNAWizardModal = ({ isOpen, onClose }) => {
  const { activeBrand } = useBrand();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    industry: activeBrand?.industry || "",
    target_audience: "",
    brand_voice: "",
    primary_goal: "",
    competitors: ""
  });

  if (!isOpen) return null;

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Hydrate Brand DNA via API
      await apiRequest(`/api/customer/brands/${activeBrand.id}/dna`, {
        method: "PATCH",
        body: JSON.stringify({ profile: data })
      });
      // Trigger growth event
      await apiRequest(`/api/customer/growth/activity`, {
        method: "POST",
        body: JSON.stringify({ brandId: activeBrand.id, action_type: "brand_dna_completed" })
      });
      onClose();
      window.dispatchEvent(new CustomEvent('refresh-data'));
    } catch {
      alert("Failed to save Brand DNA");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="wizard-step animate__animated animate__fadeIn">
            <div className="d-flex justify-content-center mb-4">
              <div className="p-4 bg-primary bg-opacity-10 rounded-circle text-primary">
                <Target size={48} />
              </div>
            </div>
            <h3 className="text-center fw-bold mb-3">Teach MyPilotPost About Your Brand</h3>
            <p className="text-center text-muted mb-4 px-4">
              We use this strategic baseline to detect Content Opportunities, analyze competitors, and calibrate your growth roadmap. Let's configure your Brand DNA.
            </p>
            <div className="form-group mb-4">
              <label className="fw-bold mb-2">What industry are you operating in?</label>
              <input 
                type="text" 
                className="form-control form-control-lg" 
                placeholder="e.g. B2B SaaS, Real Estate, E-Commerce"
                value={data.industry}
                onChange={e => setData({...data, industry: e.target.value})}
              />
            </div>
            <button className="btn btn-primary btn-lg w-100 fw-bold" onClick={nextStep} disabled={!data.industry}>
              Continue Configuration <Zap size={16} className="ms-2" />
            </button>
          </div>
        );
      
      case 2:
        return (
          <div className="wizard-step animate__animated animate__fadeIn">
            <h4 className="fw-bold mb-4">Audience & Voice</h4>
            <div className="form-group mb-4">
              <label className="fw-bold mb-2">Who is your ideal customer?</label>
              <textarea 
                className="form-control" 
                rows={3} 
                placeholder="e.g. Marketing directors at mid-sized tech companies who struggle with content velocity..."
                value={data.target_audience}
                onChange={e => setData({...data, target_audience: e.target.value})}
              />
            </div>
            <div className="form-group mb-4">
              <label className="fw-bold mb-2">How should your brand sound?</label>
              <div className="d-flex gap-2 flex-wrap">
                {['Authoritative', 'Conversational', 'Witty', 'Academic', 'Direct & Bold'].map(voice => (
                  <div 
                    key={voice}
                    className={`badge border p-2 cursor-pointer ${data.brand_voice === voice ? 'bg-primary text-white border-primary' : 'bg-white text-dark'}`}
                    onClick={() => setData({...data, brand_voice: voice})}
                  >
                    {voice}
                  </div>
                ))}
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-light fw-bold" onClick={prevStep}>Back</button>
              <button className="btn btn-primary flex-grow-1 fw-bold" onClick={nextStep} disabled={!data.target_audience || !data.brand_voice}>
                Next <TrendingUp size={16} className="ms-2" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizard-step animate__animated animate__fadeIn">
            <h4 className="fw-bold mb-4">Strategic Goals & Competitors</h4>
            <div className="form-group mb-4">
              <label className="fw-bold mb-2">What is your primary 90-day growth goal?</label>
              <select 
                className="form-select form-select-lg"
                value={data.primary_goal}
                onChange={e => setData({...data, primary_goal: e.target.value})}
              >
                <option value="">Select a strategic goal...</option>
                <option value="lead_generation">Increase Inbound Lead Generation</option>
                <option value="brand_awareness">Expand Organic Brand Awareness</option>
                <option value="audience_engagement">Deepen Community Engagement & Trust</option>
                <option value="thought_leadership">Establish Executive Thought Leadership</option>
              </select>
            </div>
            <div className="form-group mb-4">
              <label className="fw-bold mb-2">Name 1-2 top competitors (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. HubSpot, Salesforce"
                value={data.competitors}
                onChange={e => setData({...data, competitors: e.target.value})}
              />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-light fw-bold" onClick={prevStep}>Back</button>
              <button className="btn btn-success flex-grow-1 fw-bold text-white" onClick={handleFinish} disabled={loading || !data.primary_goal}>
                {loading ? "Activating Intelligence..." : "Activate Brand DNA"}
              </button>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="wizard-modal-overlay" style={{ zIndex: 1050 }}>
      <div className="wizard-modal-container bg-white shadow-lg rounded-4 position-relative p-5" style={{ width: '100%', maxWidth: '600px' }}>
        <button onClick={onClose} className="btn-close position-absolute top-0 end-0 m-4"></button>
        <div className="progress mb-4" style={{ height: '6px' }}>
          <div className="progress-bar bg-primary" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>
        {renderStep()}
      </div>
      <style>{`
        .wizard-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
        }
        .wizard-modal-container {
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default BrandDNAWizardModal;
