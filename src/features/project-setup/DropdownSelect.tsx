import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";
import { ChevronDown, X as XIcon } from "lucide-react";

interface DropdownSelectProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  onRemove?: () => void;
  options?: string[];
  onChange?: (value: string) => void;
  className?: string;
  variant?: "default" | "compact";
}

export function DropdownSelect({
  icon: Icon,
  label,
  value,
  onRemove,
  options,
  onChange,
  className,
  variant = "default",
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = () => {
    if (options) {
      setOpen((prev) => !prev);
    }
  };

  const handleSelect = (option: string) => {
    onChange?.(option);
    setOpen(false);
  };

  if (variant === "compact") {
    return (
      <div
        ref={containerRef}
        onClick={options ? handleClick : undefined}
        className={cn(
          "relative bg-surface-container-high px-4 py-2 flex items-center gap-3 border border-outline-variant/50",
          open ? "rounded-t-md rounded-b-none border-b-0" : "rounded-full",
          options && "cursor-pointer",
          className,
        )}
      >
        <Icon className="size-5 text-on-surface-variant" />
        <div className="flex-grow flex flex-col">
          <label className="font-label-md text-[10px] text-on-surface-variant leading-none mb-1">
            {label}
          </label>
          <input
            type="text"
            value={value}
            readOnly
            className="bg-transparent border-none p-0 text-on-surface font-body-md focus:ring-0 outline-none select-none cursor-pointer"
          />
        </div>
        <ChevronDown className="size-4 text-on-surface-variant hover:text-on-surface" />
        {open && options && (
          <div className="absolute top-full left-0 mt-0 bg-surface-container-high border border-outline-variant/20 rounded-b-md shadow-2xl z-50 w-full overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-highest hover:text-on-surface transition-colors cursor-pointer",
                    opt === value &&
                      "bg-primary-container !text-on-primary-container",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-surface-container-high pl-5 pr-4 py-3 flex items-center gap-3 border border-outline-variant/50 hover:bg-surface-variant cursor-pointer group",
        open ? "rounded-t-lg rounded-b-none border-b-0" : "rounded-full",
        className,
      )}
      onClick={handleClick}
    >
      <Icon className="size-5 text-on-surface-variant" />
      <div className="flex flex-col">
        <span className="font-label-md text-[10px] text-on-surface-variant leading-none">
          {label}
        </span>
        <span className="font-body-md text-on-surface mt-1">{value}</span>
      </div>
      {onRemove ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-4 text-on-surface-variant hover:text-on-surface"
        >
          <XIcon className="size-5" />
        </button>
      ) : (
        <ChevronDown className="size-5 text-on-surface-variant ml-4 group-hover:text-on-surface" />
      )}
      {open && options && (
        <div className="absolute top-full left-0 mt-0 bg-surface-container-high border border-outline-variant/20 rounded-b-md shadow-2xl z-50 w-full overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-highest hover:text-on-surface transition-colors cursor-pointer",
                  opt === value &&
                    "bg-primary-container !text-on-primary-container",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
