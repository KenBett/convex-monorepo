"use client";

import type { ReactNode } from "react";
import type { ThemeProviderProps } from "next-themes";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ProvidersProps {
  children: ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>;
}
