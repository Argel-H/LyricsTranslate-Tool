import { create } from "zustand";

interface ModalState {
  settingsOpen: boolean;
  aboutOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  openAbout: () => void;
  closeAbout: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  settingsOpen: false,
  aboutOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openAbout: () => set({ aboutOpen: true }),
  closeAbout: () => set({ aboutOpen: false }),
}));
