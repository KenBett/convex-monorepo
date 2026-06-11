import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme, type ColorSchemeName } from "react-native";
import { Uniwind } from "uniwind";

import { STORAGE_KEYS } from "@/constants/app-config";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isLoading: boolean;
  isDark: boolean;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

function resolveTheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ResolvedTheme {
  if (preference === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return preference;
}

type ThemePreferenceProviderProps = {
  children: ReactNode;
};

export function ThemePreferenceProvider({
  children,
}: ThemePreferenceProviderProps): ReactNode {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [isLoading, setIsLoading] = useState(true);

  const resolvedTheme = resolveTheme(preference, systemScheme);

  const applyTheme = useCallback((theme: ResolvedTheme) => {
    if (Uniwind.currentTheme !== theme) {
      Uniwind.setTheme(theme);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.themePreference);
        if (!isMounted) {
          return;
        }
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    applyTheme(resolveTheme(preference, systemScheme));
  }, [applyTheme, isLoading, preference, systemScheme]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      setPreferenceState(next);
      await AsyncStorage.setItem(STORAGE_KEYS.themePreference, next);
      applyTheme(resolveTheme(next, systemScheme));
    },
    [applyTheme, systemScheme],
  );

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      isLoading,
      isDark: resolvedTheme === "dark",
      setPreference,
    }),
    [isLoading, preference, resolvedTheme, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error(
      "useThemePreference must be used within ThemePreferenceProvider",
    );
  }
  return context;
}
