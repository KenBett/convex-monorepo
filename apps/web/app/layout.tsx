import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { ConvexClientProvider } from "@/lib/convex";
import { LayoutShell } from "@/components/layout";
import { fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { themeProviderProps } from "@/config/theme";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={fontSans.variable} lang="en">
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ConvexClientProvider>
          <Providers themeProps={themeProviderProps}>
            <LayoutShell>{children}</LayoutShell>
          </Providers>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
