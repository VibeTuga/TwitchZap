import { create } from "zustand";

interface VoteCounts {
  skip: number;
  stay: number;
  total: number;
}

interface VotingStoreState {
  counts: VoteCounts;
  hasVoted: boolean;
  isSubmitting: boolean;
  setCounts: (counts: VoteCounts) => void;
  setHasVoted: (hasVoted: boolean) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

export const useVotingStore = create<VotingStoreState>((set) => ({
  counts: { skip: 0, stay: 0, total: 0 },
  hasVoted: false,
  isSubmitting: false,

  setCounts: (counts) => set({ counts }),
  setHasVoted: (hasVoted) => set({ hasVoted }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  reset: () => set({ counts: { skip: 0, stay: 0, total: 0 }, hasVoted: false }),
}));
