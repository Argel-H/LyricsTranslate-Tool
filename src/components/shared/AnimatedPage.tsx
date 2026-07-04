import { motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";

const transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

export function AnimatedPage({ children }: { children: ReactNode }) {
  useEffect(() => {
    const timer = setTimeout(() => window.scrollTo(0, 0), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition }}
      exit={{ opacity: 0, transition }}
      className="absolute inset-0"
    >
      {children}
    </motion.div>
  );
}
