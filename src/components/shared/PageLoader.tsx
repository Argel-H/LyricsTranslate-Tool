import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { motion } from "framer-motion";

/**
 * Full-screen loading screen shown during initial page load.
 * Wrapped in framer-motion for fade-in / fade-out animations.
 */
export function PageLoader() {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-surface-container z-50"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-bold text-2xl shadow-lg">
        L
      </div>
      <M3LoadingIndicator size={32} style={{ color: "rgb(208,188,255)" }} />
      <span className="text-on-surface-variant font-body-md">
        Loading...
      </span>
    </motion.div>
  );
}
