import { create } from 'zustand';

interface OnboardingStore {
  step: number;
  setStep: (s: number) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),
}));
