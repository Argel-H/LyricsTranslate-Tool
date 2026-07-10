import { create } from "zustand";
import type { ReactNode } from "react";

export interface ShellConfig {
  title?: string;
  activePage?: "home" | "about" | "settings";
  variant?: "standard" | "dashboard";
  onBack?: () => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
  actions?: ReactNode;
  leading?: ReactNode;
  sidebarBg?: string;
  topbarBg?: string;
  showTopbar?: boolean;
  showTopbarBorder?: boolean;
  bodyBg?: string;
  bottomBar?: ReactNode;
}

const DEFAULT_CONFIG: ShellConfig = {
  bodyBg: "bg-surface-container-low",
  showTopbarBorder: true,
};

interface ShellState {
  config: ShellConfig;
  setConfig: (partial: Partial<ShellConfig>) => void;
  reset: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  config: { ...DEFAULT_CONFIG },
  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
  reset: () => set({ config: { ...DEFAULT_CONFIG } }),
}));
