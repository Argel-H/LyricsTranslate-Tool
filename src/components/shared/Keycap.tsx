import type { ReactNode } from "react";

interface KeycapProps {
  children: ReactNode;
}

export function Keycap({ children }: KeycapProps) {
  return (
    <kbd className="inline-flex items-center justify-center w-6 h-6 text-label-sm font-mono text-on-surface-variant bg-surface-container-high border border-outline-variant rounded-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] select-none">
      {children}
    </kbd>
  );
}
