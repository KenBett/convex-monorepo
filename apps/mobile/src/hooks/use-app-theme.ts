import * as Haptics from "expo-haptics";
import { useUniwind } from "uniwind";

import type { ResolvedTheme } from "@/contexts/theme-preference-context";
import { useThemePreference } from "@/contexts/theme-preference-context";

export type { ResolvedTheme, ThemePreference } from "@/contexts/theme-preference-context";

export function useAppTheme() {
  const { theme } = useUniwind();
  const { preference, setPreference, resolvedTheme, isLoading, isDark } =
    useThemePreference();

  const setTheme = (next: ResolvedTheme) => {
    void setPreference(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTheme = () => {
    const next: ResolvedTheme = resolvedTheme === "dark" ? "light" : "dark";
    void setPreference(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return {
    theme,
    resolvedTheme,
    preference,
    isDark,
    isLoading,
    setPreference,
    setTheme,
    toggleTheme,
  };
}
