import React, { useMemo } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { motion, AnimatePresence } from 'framer-motion';

const OnboardingLayout = ({ children }) => {
  const { step, prevStep, onboardingMode } = useOnboarding();

  const totalSteps = onboardingMode === 'smart' ? 5 : 6;
  const progress = Math.round(((step - 1) / totalSteps) * 100);

  // V1.2.1 Photorealistic Illustration Mapping
  const illustration = useMemo(() => {
    const assets = {
      welcome: "/ob_welcome.png",
      mode: "/ob_mode.png",
      import: "/ob_import.png",
      brand: "/ob_brand.png",
      market: "/ob_market.png",
      platforms: "/ob_platforms.png",
      activation: "/ob_activation.png",
      success: "/onboarding_success_illustration.png"
    };

    if (step === 1) return assets.welcome;
    if (step === 2) return assets.mode;

    if (onboardingMode === 'smart') {
      if (step === 3) return assets.import;
      if (step === 4) return assets.brand;
      if (step === 5) return assets.activation;
    } else if (onboardingMode === 'manual') {
      if (step === 3) return assets.brand;
      if (step === 4) return assets.market;
      if (step === 5) return assets.platforms;
      if (step === 6) return assets.activation;
    }
    return assets.welcome;
  }, [step, onboardingMode]);

  return (
    <div className="onboarding-split-layout min-vh-100 w-100 d-flex">
      {/* Left: Illustration Area (50/50 Split) */}
      <div className="onboarding-illustration-sidebar d-none d-lg-flex col-lg-6 p-0">
        <div className="illustration-gradient-overlay"></div>
        <AnimatePresence mode="wait">
          <motion.img
            key={illustration}
            src={illustration}
            alt="Onboarding Illustration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="step-illustration-img"
          />
        </AnimatePresence>
      </div>

      {/* Right: Content Area (50/50 Split) */}
      <div className="onboarding-content-area col-12 col-lg-6 d-flex flex-column h-100 min-vh-100 bg-white">
        <header className="onboarding-header px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <img src="/logo.png" alt="myPilotPost" height="28" />
          </div>
          <button className="btn btn-link text-muted text-decoration-none small" onClick={() => window.location.href = '/login'}>
            Exit to Login
          </button>
        </header>

        <div className="progress rounded-0" style={{ height: '4px' }}>
          <motion.div 
            className="progress-bar bg-primary" 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <main className="flex-grow-1 d-flex flex-column overflow-auto p-4 p-md-5">
          <div className="mx-auto w-100" style={{ maxWidth: '600px' }}>
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                {step > 1 && (
                  <button 
                    onClick={prevStep}
                    className="btn btn-sm btn-light rounded-circle d-flex align-items-center justify-content-center p-0" 
                    style={{ width: '32px', height: '32px' }}
                    title="Go Back"
                  >
                    <i className="fas fa-chevron-left small"></i>
                  </button>
                )}
                <span className="text-muted x-small fw-bold text-uppercase tracking-wider">Step {step} of {totalSteps}</span>
              </div>
              <span className="text-muted x-small fw-bold">{progress}% Complete</span>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OnboardingLayout;
