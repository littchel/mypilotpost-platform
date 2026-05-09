import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../lib/api/client';

// We will need to wrap this in a provider or mock context for reuse
import OnboardingLayout from '../onboarding/OnboardingLayout';
import WelcomeStep from '../onboarding/steps/WelcomeStep';
import ModeStep from '../onboarding/steps/ModeStep';
import ImportStep from '../onboarding/steps/ImportStep';
import BrandStep from '../onboarding/steps/BrandStep';
import MarketStep from '../onboarding/steps/MarketStep';
import PlatformsStep from '../onboarding/steps/PlatformsStep';
import ActivationStep from '../onboarding/steps/ActivationStep';

const BrandWizardModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "",
    industry: "",
    tone: "professional",
    country: "ZW",
    language: "en",
    onboardingMode: null
  });

  if (!isOpen) return null;

  // Since we want 1-to-1 parity, we will handle the wizard flow here
  // but use the same logic as the onboarding.
  
  const nextStep = (stepData) => {
    if (stepData) setData(prev => ({ ...prev, ...stepData }));
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleFinish = async () => {
    onClose();
    window.location.reload(); // Refresh to show new brand
  };

  const renderStep = () => {
    switch(step) {
      case 1: return <ModeStep isWizard={true} onSelect={(mode) => { setData(p => ({...p, onboardingMode: mode})); setStep(2); }} />;
      
      // Smart Flow
      case 2: 
        return data.onboardingMode === 'smart' 
          ? <ImportStep isWizard={true} onNext={(res) => { setData(p => ({...p, ...res})); setStep(3); }} />
          : <BrandStep isWizard={true} isReview={false} onNext={(d) => { setData(p => ({...p, ...d})); setStep(3); }} />;
      
      case 3:
        return data.onboardingMode === 'smart'
          ? <BrandStep isWizard={true} isReview={true} onNext={(d) => { setData(p => ({...p, ...d})); setStep(4); }} />
          : <MarketStep isWizard={true} onNext={(d) => { setData(p => ({...p, ...d})); setStep(4); }} />;
      
      case 4:
        return data.onboardingMode === 'smart'
          ? <ActivationStep isWizard={true} onFinish={handleFinish} />
          : <PlatformsStep isWizard={true} onNext={(d) => { setData(p => ({...p, ...d})); setStep(5); }} />;
      
      case 5:
        return <ActivationStep isWizard={true} onFinish={handleFinish} />;
        
      default: return null;
    }
  };

  return (
    <div className="wizard-modal-overlay">
      <div className="wizard-modal-container bg-white shadow-2xl rounded-4 overflow-hidden position-relative" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh' }}>
        <button onClick={onClose} className="position-absolute top-0 end-0 m-4 btn btn-link text-muted p-0" style={{ zIndex: 10 }}>
          <X size={24} />
        </button>
        
        <div className="d-flex flex-column h-100">
           {renderStep()}
        </div>
      </div>

      <style>{`
        .wizard-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5000;
          padding: 20px;
        }
        .wizard-modal-container {
           animation: modalSlideUp 0.3s ease-out;
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BrandWizardModal;
