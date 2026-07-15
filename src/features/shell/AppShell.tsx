import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  activePage?: "home" | "about" | "settings";
  variant?: "standard" | "dashboard";
  onBack?: () => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
  actions?: ReactNode;
  leading?: ReactNode;
  sidebarBg?: string;
  topbarBg?: string;
  showTopbar?: boolean;
  showTopbarBorder?: boolean;
  bodyBg?: string;
  className?: string;
  bottomBar?: ReactNode;
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
  leading,
  sidebarBg,
  topbarBg,
  showTopbar: showTopbarProp,
  showTopbarBorder = true,
  bodyBg = "bg-surface-container-low",
  className,
  bottomBar,
}: AppShellProps) {
  const showTopbar = showTopbarProp ?? variant === "standard";

  useEffect(() => {
    document.body.classList.add(bodyBg);
    return () => {
      document.body.classList.remove(bodyBg);
    };
  }, [bodyBg]);

  return (
    <div
      className={cn(
        "font-body-lg text-body-lg min-h-screen flex flex-col",
        bodyBg,
        className,
      )}
    >
      <Sidebar
        activePage={activePage}
        bgColor={sidebarBg}
        showLogo={!showTopbar}
        className={showTopbar ? "top-[5rem] h-[calc(100vh-5rem)]" : undefined}
        onOpenSettings={onOpenSettings}
        onOpenAbout={onOpenAbout}
      />

      {showTopbar && title && (
        <TopBar
          title={title}
          onBack={onBack}
          bgColor={topbarBg}
          showBorder={showTopbarBorder}
          actions={actions}
          leading={leading}
        />
      )}

      <main
        className={cn(
          "flex-1 pr-6 flex transition-colors duration-300 lg:ml-20 overflow-x-hidden scroll-pb-[4.5rem]",
          bottomBar ? "pb-36 md:pb-28" : "pb-24 md:pb-16",
          !showTopbar && "pt-10 md:pt-5",
          bodyBg,
        )}
      >
        {children}
      </main>

      {bottomBar && (
        <div className="fixed bottom-0 left-0 lg:left-20 right-0 z-50 h-[4.5rem] bg-surface-container border-t border-outline-variant/20 ">
          <div className="h-full max-w-[1400px] mx-auto flex items-center px-4">
            {bottomBar}
          </div>
        </div>
      )}
    </div>
  );
}
