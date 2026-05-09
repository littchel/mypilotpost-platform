import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api/client';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    brandName: "",
    country: "ZW",
    language: "en",
    industry: "",
    goals: [],
    platforms: [],
    isScheduled: false,
    onboardingMode: null // 'smart' or 'manual'
  });
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProgress();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProgress = async () => {
    try {
      const res = await apiRequest("/api/customer/onboarding");
      if (res.progress) {
        setStep(res.progress.current_step);
        if (res.progress.data) {
          const savedData = JSON.parse(res.progress.data);
          setData(prev => ({ ...prev, ...savedData }));
        }
        if (res.progress.completed_at) {
          setIsComplete(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch onboarding progress", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (newStep, stepData = null) => {
    const updatedData = stepData ? { ...data, ...stepData } : data;
    if (stepData) setData(updatedData);

    try {
      if (token) {
        // Sanitize: strip any non-serializable values before sending to backend
        const safeData = JSON.parse(JSON.stringify(updatedData, (key, val) => {
          if (typeof val === 'function' || val instanceof Event) return undefined;
          return val;
        }));
        await apiRequest("/api/customer/onboarding/step", {
          method: "POST",
          body: JSON.stringify({
            step: newStep,
            data: safeData
          })
        });
      }
      setStep(newStep);
    } catch (err) {
      console.error("Failed to update onboarding step", err);
      // Still update UI local state if backend fails momentarily during navigation
      setStep(newStep);
    }
  };

  const nextStep = (stepData) => updateStep(step + 1, stepData);
  const prevStep = () => {
    if (step > 1) updateStep(step - 1);
  };

  const completeOnboarding = async () => {
    try {
      // 1. Create the brand if it doesn't exist yet (from onboarding data)
      const brandName = data.brandName || data.name || '';
      if (brandName) {
        const brandRes = await apiRequest("/api/customer/brands/create", {
          method: "POST",
          body: JSON.stringify({
            name: brandName,
            industry: data.industry || '',
            tone: data.tone || "Professional",
            goals: data.goals?.join(', ') || ""
          })
        });
        
        if (brandRes.id) {
          console.log("Brand created during onboarding:", brandRes.id);
        }
      }

      // 2. Mark onboarding as complete
      await apiRequest("/api/customer/onboarding/complete", { method: "POST" });
      setIsComplete(true);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      // Still mark complete locally so the user can access the dashboard
      setIsComplete(true);
    }
  };

  const setOnboardingMode = (mode) => {
    setData(prev => ({ ...prev, onboardingMode: mode }));
    // We don't necessarily need to persist to backend yet, but we will in updateStep
  };

  const value = {
    step,
    setStep,
    data,
    setData,
    loading,
    isComplete,
    updateStep,
    nextStep,
    prevStep,
    completeOnboarding,
    setOnboardingMode
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
};
