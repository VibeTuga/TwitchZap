import { create } from "zustand";

export interface QueueEntry {
  id: string;
  position: number;
  status: string;
  submittedAt: string;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
  } | null;
  submittedBy: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
}

interface QueueStoreState {
  queue: QueueEntry[];
  loading: boolean;
  setQueue: (queue: QueueEntry[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useQueueStore = create<QueueStoreState>((set) => ({
  queue: [],
  loading: true,

  setQueue: (queue) => set({ queue }),
  setLoading: (loading) => set({ loading }),
}));
