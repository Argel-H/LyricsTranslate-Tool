import { create } from "zustand";

interface ModalState {
  settingsOpen: boolean;
  aboutOpen: boolean;
  changelogOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  openAbout: () => void;
  closeAbout: () => void;
  openChangelog: () => void;
  closeChangelog: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  settingsOpen: false,
  aboutOpen: false,
  changelogOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openAbout: () => set({ aboutOpen: true }),
  closeAbout: () => set({ aboutOpen: false }),
  openChangelog: () => set({ changelogOpen: true }),
  closeChangelog: () => set({ changelogOpen: false }),
}));
