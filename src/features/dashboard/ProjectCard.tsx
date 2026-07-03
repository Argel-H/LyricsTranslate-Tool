import { MoreVertical, Music, Edit3, Trash2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import { StatusBadge } from "./StatusBadge"
import { ProjectProgressBar } from "./ProjectProgressBar"

interface ProjectCardProps {
  title: string
  artist: string
  coverUrl: string
  progress: number
  status: "in-progress" | "in-review"
  statusLabel?: string
  onMoreClick?: () => void
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onOpen?: () => void
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
  onOpen,
  className,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click-outside to close menu
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    // Use 'mousedown' to close before any click events bubble up
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-surface-container rounded-3xl p-5 flex flex-col gap-4 hover:bg-surface-container-high transition-all cursor-pointer border border-outline-variant/10 group shadow-sm hover:shadow-lg hover:-translate-y-1 duration-300",
        className
      )}
    >
      {/* Cover Image */}
      <div className="w-full aspect-square rounded-2xl bg-surface-container-highest overflow-hidden relative">
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
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container/80 backdrop-blur-md rounded-full size-8 flex items-center justify-center">
          <button
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

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-10 right-0 bg-surface-container-high border border-outline-variant/20 rounded-lg shadow-2xl z-50 py-1 min-w-[140px] overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onEdit?.()
              }}
              className="w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit3 className="size-4" />
              Edit
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
              Open
            </button>
            <div className="h-px bg-outline-variant/20 mx-2" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onDelete?.()
              }}
              className="w-full text-left px-4 py-2.5 text-body-md text-error hover:bg-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-title-lg text-title-lg text-on-surface truncate mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant truncate mb-4">
          {artist}
        </p>

        {/* Progress */}
        <div className="mt-auto space-y-3">
          <div className="flex justify-between items-center">
            <StatusBadge status={status} label={statusLabel} />
            <span className="font-label-md text-label-md text-on-surface-variant font-bold">
              {progress}%
            </span>
          </div>
          <ProjectProgressBar value={progress} color={status === "in-review" ? "tertiary" : "primary"} />
        </div>
      </div>
    </div>
  )
}
