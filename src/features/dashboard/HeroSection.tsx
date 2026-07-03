import { Plus } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface HeroSectionProps {
  onCreateEmpty?: () => void;
  onSearch?: (value: string) => void;
  searchResults?: Array<{ id: number; trackName: string; artistName: string }>;
  onSearchSelect?: (index: number) => void;
  isSearching?: boolean;
}

export function HeroSection({
  onCreateEmpty,
  onSearch,
  searchResults,
  onSearchSelect,
  isSearching,
}: HeroSectionProps) {
  const { t } = useI18n();
  return (
    <section className="bg-surface-container-low rounded-[32px] p-8 md:p-12 border border-outline-variant/10 shadow-sm relative overflow-hidden z-20">
      <div className="flex flex-col items-center text-center space-y-8 relative z-10">
        <h2 className="font-display-lg text-display-lg text-on-surface">
          {t("dashboard.hero.title")}
        </h2>
        <SearchInput
          placeholder={t("dashboard.hero.searchPlaceholder")}
          onChange={(v) => onSearch?.(v)}
          results={searchResults}
          onSelect={onSearchSelect}
          isLoading={isSearching}
        />
        <div className="flex items-center gap-6 w-full max-w-md">
          <div className="h-px bg-outline-variant/30 flex-1" />
          <span className="text-on-surface-variant font-label-md uppercase tracking-widest">
            {t("dashboard.hero.or")}
          </span>
          <div className="h-px bg-outline-variant/30 flex-1" />
        </div>
        <Button
          onClick={onCreateEmpty}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-container !text-on-primary-container rounded-full font-label-lg text-label-lg hover:shadow-md hover:bg-primary hover:!text-on-primary transition-all duration-300 h-auto"
        >
          <Plus className="size-5" />
          {t("dashboard.hero.emptyProject")}
        </Button>
      </div>
    </section>
  );
}
