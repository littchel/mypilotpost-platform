import React from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { motion } from 'framer-motion';

const ModeStep = ({ isWizard, onSelect }) => {
    const onboarding = useOnboarding();
    const updateStep = isWizard ? null : onboarding.updateStep;
    const data = isWizard ? {} : onboarding.data;
    const setOnboardingMode = isWizard ? null : onboarding.setOnboardingMode;

    const mode = isWizard ? null : data.onboardingMode;

    const handleSelect = (selectedMode) => {
        if (isWizard) {
            onSelect(selectedMode);
        } else {
            setOnboardingMode(selectedMode);
        }
    };

    const handleContinue = () => {
        if (!isWizard && !mode) return;
        if (!isWizard) updateStep(mode === 'smart' ? 3 : 4);
    };

    return (
        <div className="onboarding-card text-center">
            <h2 className="fw-bold mb-3">Let’s set up your brand</h2>
            <p className="text-muted mb-4 small">Choose a path to initialize your operating system.</p>
            
            <div className="row g-3 mb-5">
                <div className="col-md-6">
                    <motion.div 
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className={`mode-card ${mode === 'smart' ? 'active' : ''}`}
                        onClick={() => handleSelect('smart')}
                    >
                        <div className="mode-badge">Recommended</div>
                        <div className="mode-icon">
                            <i className="fas fa-magic"></i>
                        </div>
                        <h4 className="fw-bold">Import from Website</h4>
                        <p className="small text-muted mb-0">
                            Paste your URL and we'll extract your logo, colors, and tone for you.
                        </p>
                    </motion.div>
                </div>
                
                <div className="col-md-6">
                    <motion.div 
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className={`mode-card ${mode === 'manual' ? 'active' : ''}`}
                        onClick={() => handleSelect('manual')}
                    >
                        <div className="mode-icon">
                            <i className="fas fa-edit"></i>
                        </div>
                        <h4 className="fw-bold">Set up manually</h4>
                        <p className="small text-muted mb-0">
                            Enter your brand details step-by-step for full control.
                        </p>
                    </motion.div>
                </div>
            </div>

            <button 
                className="btn btn-pilot-ob w-100" 
                onClick={handleContinue}
                disabled={!mode}
            >
                Continue Setup →
            </button>

            <style dangerouslySetInnerHTML={{ __html: `
                .mode-card {
                    background: #fff;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 32px 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    height: 100%;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .mode-card:hover {
                    border-color: #2563eb;
                    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.05);
                }
                .mode-card.active {
                    border-color: #2563eb;
                    background: #eff6ff;
                }
                .mode-badge {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #2563eb;
                    color: white;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 4px 12px;
                    border-radius: 20px;
                    text-transform: uppercase;
                }
                .mode-icon {
                    width: 56px;
                    height: 56px;
                    background: #f1f5f9;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: #2563eb;
                    margin-bottom: 20px;
                }
                .mode-card.active .mode-icon {
                    background: #fff;
                }
            `}} />
        </div>
    );
};

export default ModeStep;
