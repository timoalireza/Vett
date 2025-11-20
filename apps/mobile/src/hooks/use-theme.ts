import { useAppState } from "../state/app-state";

export function useTheme() {
  const { theme } = useAppState();
  return theme;
}

