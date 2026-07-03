import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import type { ReactNode } from "react"
import { useEffect } from "react"

interface AppShellProps {
  children: ReactNode
  title?: string
  activePage?: "home" | "patch-notes" | "about" | "settings"
  variant?: "standard" | "dashboard"
  onBack?: () => void
  onOpenSettings?: () => void
  onOpenAbout?: () => void
  actions?: ReactNode
  sidebarBg?: string
  topbarBg?: string
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
  const showTopbar = showTopbarProp ?? (variant === "standard")

  useEffect(() => {
    document.body.classList.add(bodyBg)
    return () => { document.body.classList.remove(bodyBg) }
  }, [bodyBg])

  return (
    <div className={cn("font-body-lg text-body-lg min-h-screen flex", bodyBg, className)}>
      <Sidebar activePage={activePage} bgColor={sidebarBg} onOpenSettings={onOpenSettings} onOpenAbout={onOpenAbout} />
      
      <div className="flex-1 flex flex-col lg:ml-20">
        {showTopbar && title && (
          <TopBar 
            title={title} 
            onBack={onBack} 
            bgColor={topbarBg}
            showBorder={showTopbarBorder}
            actions={actions} 
          />
        )}
        
        <main className={cn("flex-1 pr-6 pb-24 md:pb-16 flex", !showTopbar && "pt-10 md:pt-5", bodyBg)}>
          {children}
        </main>
      </div>
    </div>
  )
}
