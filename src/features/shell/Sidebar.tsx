import { Home, History, Info, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavButton } from "./NavButton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface SidebarProps {
  activePage?: "home" | "patch-notes" | "about" | "settings";
  bgColor?: string;
  className?: string;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export function Sidebar({
  activePage,
  bgColor = "bg-surface-container-lowest",
  className,
  onOpenSettings,
  onOpenAbout,
}: SidebarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <nav
      className={cn(
        "hidden lg:flex flex-col h-screen fixed left-0 top-0 w-20 z-10 py-lg transition-colors duration-300",
        bgColor,
        className,
      )}
    >
      <div className="pt-14 flex flex-col items-center gap-6 h-full mt-4">
        <div onClick={() => navigate("/")}>
          <NavButton
            icon={Home}
            label={t("sidebar.home")}
            active={activePage === "home"}
          />
        </div>
        <div onClick={() => navigate("/")}>
          <NavButton
            icon={History}
            label={t("sidebar.patchNotes")}
            active={activePage === "patch-notes"}
          />
        </div>
        <div className="mt-auto mb-4 flex flex-col items-center gap-6">
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
