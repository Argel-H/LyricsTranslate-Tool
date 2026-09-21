import { MoreVertical, Music, Edit3, Trash2, ExternalLink, Download, CheckCircle, Archive, ArrowRight, MessageSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { useI18n } from "@/hooks/useI18n"
import { useClickOutside } from "@/hooks/useClickOutside"
import { useCoverTilt } from "@/hooks/useCoverTilt"
import { StatusBadge } from "./StatusBadge"
import { ProjectProgressBar } from "./ProjectProgressBar"
import type { ProjectStatus } from "@/lib/config/constants"
import { RotatingFlag } from "@/components/shared/RotatingFlag"

interface ProjectCardProps {
  title: string
  artist: string
  coverUrl: string
  progress: number
  status: ProjectStatus
  statusLabel?: string
  onMoreClick?: () => void
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onExport?: () => void
  onOpen?: () => void
  onToggleComplete?: () => void
  onToggleArchive?: () => void
  isArchived?: boolean
  originLanguage?: string
  translationLanguage?: string
  annotationCount?: number
  className?: string
}

export function ProjectCard({
  title,
  artist,
  coverUrl,
  progress,
  status,
  statusLabel,
  onMoreClick,
  onClick,
  onEdit,
  onDelete,
  onExport,
  onOpen,
  onToggleComplete,
  onToggleArchive,
  isArchived,
  originLanguage,
  translationLanguage,
  annotationCount,
  className,
}: ProjectCardProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    tilt,
    handlers: { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave },
  } = useCoverTilt(8)

  // Click-outside to close menu (toggle button is exempted via [data-menu-toggle])
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen, "[data-menu-toggle]")

  const hasFlags = !!(originLanguage && translationLanguage)
  const hasAnnotations = (annotationCount ?? 0) > 0

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease, background-color 0.3s ease' : 'background-color 0.3s ease',
      }}
      className={cn(
        "bg-surface-container rounded-3xl p-5 flex flex-col gap-4 hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/10 group shadow-sm hover:shadow-xl duration-300",
        className
      )}
    >
      <div className="w-full aspect-square rounded-2xl bg-surface-container-highest overflow-visible relative">
        <div className="w-full h-full rounded-2xl overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
              <Music className="size-12 text-outline-variant/30" />
            </div>
          )}
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container/80 backdrop-blur-md rounded-full size-8 flex items-center justify-center">
          <button
            data-menu-toggle
            onClick={(e) => {
              e.stopPropagation()
              if (onMoreClick) {
                onMoreClick()
              } else {
                setMenuOpen((prev) => !prev)
              }
            }}
            className="text-on-surface hover:text-primary flex items-center justify-center"
          >
            <MoreVertical className="size-5" />
          </button>
        </div>

        {(hasFlags || hasAnnotations) && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            {originLanguage && translationLanguage && (
              <span className="flex items-center gap-1 rounded-full bg-surface-container/80 backdrop-blur-md px-2 py-1">
                <RotatingFlag language={originLanguage} />
                <ArrowRight className="size-3 text-on-surface-variant" />
                <RotatingFlag language={translationLanguage} />
              </span>
            )}
            {hasAnnotations && (
              <span className="flex items-center gap-1 rounded-full bg-surface-container/80 backdrop-blur-md px-2 py-1">
                <MessageSquare className="size-3 text-on-surface-variant" />
                <span className="font-label-md text-label-md text-on-surface-variant">{annotationCount}</span>
              </span>
            )}
          </div>
        )}

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-10 right-0 bg-surface-container-high border border-outline-variant/20 rounded-lg shadow-2xl z-50 py-1 min-w-[140px] origin-top-right"
            >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onEdit?.()
              }}
              className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer first:rounded-t-lg"
            >
              <Edit3 className="size-4" />
              {t("common.edit")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onOpen?.()
              }}
              className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="size-4" />
              {t("common.open")}
            </button>
            {(status === "in-review" || status === "completed") && onToggleComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onToggleComplete()
                }}
                className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle className="size-4" />
                {status === "completed"
                  ? t("dashboard.unmarkCompleted")
                  : t("dashboard.markCompleted")}
              </button>
            )}
            {onToggleArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onToggleArchive()
                }}
                className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Archive className="size-4" />
                {isArchived ? t("dashboard.unarchive") : t("dashboard.archive")}
              </button>
            )}
            <div className="h-px bg-outline-variant/20 mx-2" />
            <div className="flex items-center justify-around px-2 py-1 last:rounded-b-lg">
              {onExport && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onExport()
                  }}
                  title={t("dashboard.exportProject")}
                  className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <Download className="size-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete()
                  }}
                  title={t("common.delete")}
                  className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-title-lg text-title-lg text-on-surface truncate mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant truncate mb-4">
          {artist}
        </p>

        <div className="mt-auto space-y-3">
          <div className="flex justify-between items-center">
            <StatusBadge status={status} label={statusLabel} />
            <span className="font-label-md text-label-md text-on-surface-variant font-bold">
              {progress}%
            </span>
          </div>
          <ProjectProgressBar value={progress} color={status === "in-review" || status === "completed" ? "tertiary" : "primary"} />
        </div>
      </div>
    </div>
  )
}
