import { useEffect, useRef } from "react";
import { useShellStore, type ShellConfig } from "@/stores/shellStore";

export function usePageShell(config: ShellConfig): void {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    useShellStore.getState().reset();
    useShellStore.getState().setConfig(configRef.current);
    return () => {
      useShellStore.getState().reset();
    };
  }, []);
}
