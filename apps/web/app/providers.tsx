"use client";

import type { ReactNode } from "react";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { themeProviderProps } from "@/config/theme";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <NextThemesProvider {...themeProviderProps}>
        {children}
      </NextThemesProvider>
    </ConvexAuthProvider>
  );
}
