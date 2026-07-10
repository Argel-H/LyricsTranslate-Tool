import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

/**
 * Auto-dismissing toast notification.
 *
 * Renders a pill-style toast anchored to the bottom-center of the viewport.
 * Uses a two-phase animation: visible → exit → DOM removal to allow the
 * exit transition (translate-y + opacity) to play before unmounting.
 */
export function Toast({
  message,
  visible,
  onDismiss,
  durationMs = 2500,
}: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      // Mount & fade in
      setShow(true);
      const timer = setTimeout(() => {
        // Start exit animation
        setShow(false);
        // Wait for exit animation to finish, then unmount from parent's perspective
        setTimeout(onDismiss, 300);
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [visible, durationMs, onDismiss]);

  // Keep the element mounted during exit animation (show is false but visible is still true)
  if (!visible && !show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] pointer-events-none",
        "transition-all duration-300 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}
    >
      <div className="flex items-center gap-2 bg-[#1c1b1f] text-[#e6e1e5] px-4 py-2.5 rounded-full shadow-lg">
        <Check className="size-4 text-green-400 shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>
  );
}
