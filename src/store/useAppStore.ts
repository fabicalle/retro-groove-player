import { create } from "zustand";

interface AppState {
  mode: "winamp" | "ps1";
  hasBooted: boolean;
  toggleMode: () => void;
  setMode: (mode: "winamp" | "ps1") => void;
  setBooted: (booted: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "winamp",
  hasBooted: false,
  toggleMode: () => set((state) => ({ mode: state.mode === "winamp" ? "ps1" : "winamp" })),
  setMode: (mode) => set({ mode }),
  setBooted: (hasBooted) => set({ hasBooted }),
}));
