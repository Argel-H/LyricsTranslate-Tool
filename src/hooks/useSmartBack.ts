import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Returns a back-navigation function that falls back to "/" when there is
 * no meaningful history (e.g. user opened the page directly in a new tab).
 */
export function useSmartBack(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (document.referrer && document.referrer.startsWith(window.location.origin)) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);
}
