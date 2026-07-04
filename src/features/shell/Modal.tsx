import type { ReactNode } from "react"
import { useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

const backdropTransition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
const cardTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: backdropTransition }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: cardTransition }}
            exit={{ opacity: 0, y: 24, transition: { duration: 0.15, ease: "easeIn" } }}
            className={cn(
              "relative bg-surface-container rounded-3xl shadow-2xl border border-outline-variant/20 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto",
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
