import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";

interface LoadingOverlayProps {
  title: string;
  description?: string;
}

export function LoadingOverlay({ title, description }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl p-8 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
        <M3LoadingIndicator size={40} style={{ color: "rgb(208, 188, 255)" }} />
        <p className="font-title-lg text-title-lg text-on-surface text-center">{title}</p>
        {description && (
          <p className="font-body-md text-body-md text-on-surface-variant text-center">
            {description}
          </p>
        )}
        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    </div>
  );
}
