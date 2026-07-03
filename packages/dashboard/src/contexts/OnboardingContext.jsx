import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api/client';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    brandName: "",
    country: "ZW",
    language: "en",
    industry: "",
    goals: [],
    platforms: [],
    isScheduled: false,
    onboardingMode: null // 'smart' | 'manual' (audit path uses signupSource instead)
  });
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [signupSource, setSignupSource] = useState('direct'); // 'direct' | 'brand_audit'
  const fetchDone = useRef(false);

  useEffect(() => {
    if (token && !fetchDone.current) {
      fetchDone.current = true;
      fetchProgress();
    } else if (!token) {
      fetchDone.current = false;
      setLoading(false);
    }
  }, [token]);

  const fetchProgress = async () => {
    try {
      const res = await apiRequest("/api/customer/onboarding");

      // Source determines which onboarding path the user follows
      if (res.signup_source) setSignupSource(res.signup_source);

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
        const safeData = JSON.parse(JSON.stringify(updatedData, (key, val) => {
          if (typeof val === 'function' || val instanceof Event) return undefined;
          return val;
        }));
        await apiRequest("/api/customer/onboarding/step", {
          method: "POST",
          body: JSON.stringify({ step: newStep, data: safeData })
        });
      }
      setStep(newStep);
    } catch (err) {
      console.error("Failed to update onboarding step", err);
      setStep(newStep);
    }
  };

  const nextStep = (stepData) => updateStep(step + 1, stepData);
  const prevStep = () => {
    if (step > 1) updateStep(step - 1);
  };

  const trackOnboardingEvent = (eventName, meta = {}) => {
    if (!token) return;
    apiRequest("/api/customer/growth/action", {
      method: "POST",
      body: JSON.stringify({ action: eventName, metadata: meta })
    }).catch(() => {});
  };

  const completeOnboarding = async () => {
    try {
      await apiRequest("/api/customer/onboarding/complete", { method: "POST" });
      trackOnboardingEvent("onboarding_complete", { mode: data.onboardingMode || signupSource });
      setIsComplete(true);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      setIsComplete(true);
    }
  };

  const setOnboardingMode = (mode) => {
    setData(prev => ({ ...prev, onboardingMode: mode }));
  };

  const value = {
    step,
    setStep,
    data,
    setData,
    loading,
    isComplete,
    showCelebration,
    signupSource,
    onboardingMode: data.onboardingMode,
    updateStep,
    nextStep,
    prevStep,
    completeOnboarding,
    setOnboardingMode,
    trackOnboardingEvent
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
