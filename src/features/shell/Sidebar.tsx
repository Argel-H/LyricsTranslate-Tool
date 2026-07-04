import { Home, Info, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavButton } from "./NavButton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface SidebarProps {
  activePage?: "home" | "about" | "settings";
  bgColor?: string;
  className?: string;
  showLogo?: boolean;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export function Sidebar({
  activePage,
  bgColor = "bg-surface-container-lowest",
  className,
  showLogo = true,
  onOpenSettings,
  onOpenAbout,
}: SidebarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <nav
      className={cn(
        "hidden lg:flex flex-col w-20 z-10 pt-sm transition-colors duration-300 fixed left-0 top-0 h-screen",
        bgColor,
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-6 h-full",
          showLogo ? "mt-6" : "pt-2",
        )}
      >
        {showLogo && (
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-headline-sm font-bold text-lg shadow-md shrink-0">
            L
          </div>
        )}
        <div onClick={() => navigate("/")}>
          <NavButton
            icon={Home}
            label={t("sidebar.home")}
            active={activePage === "home"}
          />
        </div>
        <div className="mt-auto mb-8 flex flex-col items-center gap-6">
          <div onClick={onOpenSettings}>
            <NavButton
              icon={Settings}
              label={t("sidebar.settings")}
              active={activePage === "settings"}
            />
          </div>
          <div onClick={onOpenAbout}>
            <NavButton
              icon={Info}
              label={t("sidebar.about")}
              active={activePage === "about"}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
