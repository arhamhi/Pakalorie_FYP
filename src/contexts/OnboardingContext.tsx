import React, { createContext, useContext, useState } from 'react';
import { GoalType, ActivityLevel, calculateDailyTarget, calculateAge } from '../constants/nutrition';

export interface OnboardingData {
  goalType: GoalType | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  dailyTargetKcal: number | null;
  displayName: string | null;
  isPremium: boolean;
}

interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  calculateTarget: () => number | null;
  resetOnboarding: () => void;
  isComplete: boolean;
}

const initialData: OnboardingData = {
  goalType: null,
  age: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  dailyTargetKcal: null,
  displayName: null,
  isPremium: false,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 14;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const calculateTarget = (): number | null => {
    if (
      data.weightKg &&
      data.heightCm &&
      data.age &&
      data.gender &&
      data.activityLevel &&
      data.goalType
    ) {
      const target = calculateDailyTarget(
        data.weightKg,
        data.heightCm,
        data.age,
        data.gender,
        data.activityLevel,
        data.goalType
      );
      updateData({ dailyTargetKcal: target });
      return target;
    }
    return null;
  };

  const resetOnboarding = () => {
    setData(initialData);
    setCurrentStep(0);
  };

  const isComplete = currentStep >= totalSteps - 1;

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        totalSteps,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        calculateTarget,
        resetOnboarding,
        isComplete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
