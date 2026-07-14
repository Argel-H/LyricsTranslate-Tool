import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

function hasInAppHistory(): boolean {
  const historyIndex = (window.history.state?.idx as number | undefined) ?? 0;
  return historyIndex > 0;
}

/**
 * Returns a back-navigation function that steps back through in-app history,
 * falling back to "/" when the page was opened directly (no prior entry).
 */
export function useSmartBack(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (hasInAppHistory()) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);
}
