import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import type { ReactNode } from "react"
import { useEffect } from "react"

interface AppShellProps {
  children: ReactNode
  title?: string
  activePage?: "home" | "patch-notes" | "about" | "settings"
  /** "standard" shows TopBar by default; "dashboard" hides it by default */
  variant?: "standard" | "dashboard"
  onBack?: () => void
  onOpenSettings?: () => void
  onOpenAbout?: () => void
  actions?: ReactNode
  sidebarBg?: string
  topbarBg?: string
  /** Explicitly override TopBar visibility (takes precedence over variant) */
  showTopbar?: boolean
  showTopbarBorder?: boolean
  bodyBg?: string
  className?: string
}

export function AppShell({ 
  children, 
  title,
  activePage,
  variant = "standard",
  onBack,
  onOpenSettings,
  onOpenAbout,
  actions,
  sidebarBg,
  topbarBg,
  showTopbar: showTopbarProp,
  showTopbarBorder = true,
  bodyBg = "bg-surface-container-low",
  className 
}: AppShellProps) {
  // Default showTopbar based on variant, but allow explicit override
  const showTopbar = showTopbarProp ?? (variant === "standard")

  // Sync body background with page color so scroll-bounce matches the bars
  useEffect(() => {
    document.body.classList.add(bodyBg)
    return () => { document.body.classList.remove(bodyBg) }
  }, [bodyBg])

  return (
    <div className={cn("font-body-lg text-body-lg min-h-screen flex overflow-hidden", bodyBg, className)}>
      <Sidebar activePage={activePage} bgColor={sidebarBg} onOpenSettings={onOpenSettings} onOpenAbout={onOpenAbout} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden lg:ml-20">
        {showTopbar && title && (
          <TopBar 
            title={title} 
            onBack={onBack} 
            bgColor={topbarBg}
            showBorder={showTopbarBorder}
            actions={actions} 
          />
        )}
        
        <main className={cn("flex-1 pr-6 pb-10 md:pb-5 flex overflow-hidden", !showTopbar && "pt-10 md:pt-5", bodyBg)}>
          {children}
        </main>
      </div>
    </div>
  )
}
