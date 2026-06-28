import { create } from "zustand";

interface AppState {
  familyId: string | null;
  familyMembers: any[];
  currentUser: any | null;
  memberRole: string;
  isInitialized: boolean;
  setAppInfo: (info: { familyId: string; familyMembers: any[]; currentUser: any; memberRole: string }) => void;
  resetApp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  familyId: null,
  familyMembers: [],
  currentUser: null,
  memberRole: "member",
  isInitialized: false,
  setAppInfo: (info) => set({ ...info, isInitialized: true }),
  resetApp: () => set({ familyId: null, familyMembers: [], currentUser: null, memberRole: "member", isInitialized: false }),
}));
