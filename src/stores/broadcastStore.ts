import { create } from "zustand";

export interface BroadcastState {
  id: string;
  queueEntryId: string;
  streamId: string;
  submittedBy: string | null;
  startedAt: string;
  scheduledEndAt: string;
  actualEndAt: string | null;
  extensionsCount: number;
  maxExtensions: number;
  status: string;
  votingOpensAt: string | null;
  votingResult: string | null;
  totalVotes: number;
  skipVotes: number;
  stayVotes: number;
  streamTitle: string | null;
  streamCategory: string | null;
  streamViewerCount: number | null;
  offlineDetectedAt: string | null;
  gracePeriodExpiresAt: string | null;
  recoveryCount: number;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
    twitchChannelId: string;
  } | null;
  submitter: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
  has_voted: boolean;
}

interface BroadcastStoreState {
  broadcast: BroadcastState | null;
  loading: boolean;
  isReconnecting: boolean;
  setBroadcast: (broadcast: BroadcastState | null) => void;
  setLoading: (loading: boolean) => void;
  setIsReconnecting: (isReconnecting: boolean) => void;
  updateBroadcast: (
    updater: (prev: BroadcastState | null) => BroadcastState | null
  ) => void;
}

export const useBroadcastStore = create<BroadcastStoreState>((set) => ({
  broadcast: null,
  loading: true,
  isReconnecting: false,

  setBroadcast: (broadcast) => set({ broadcast }),
  setLoading: (loading) => set({ loading }),
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
  updateBroadcast: (updater) =>
    set((state) => ({ broadcast: updater(state.broadcast) })),
}));
