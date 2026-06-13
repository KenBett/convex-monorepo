"use client";

import { useState, useEffect, type ReactNode } from "react";
import clsx from "clsx";

import {
  CONTENT_CONTAINER_CLASSES,
  getSidebarLayoutClasses,
  MOBILE_TAB_BAR_OFFSET_CLASSES,
  NAVBAR_OFFSET_CLASSES,
} from "@/constants/layout";

import { LayoutSkeleton } from "./layout-skeleton";
import { MobileTabBar } from "./mobile-tab-bar";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";

interface LayoutShellProps {
  children: ReactNode;
}

function LayoutShellContent({ children }: LayoutShellProps) {
  const { isExpanded } = useSidebar();
  const { mainMargin } = getSidebarLayoutClasses(isExpanded);

  return (
    <>
      <Sidebar />
      <Navbar />
      <MobileTabBar />
      <div
        className={clsx(
          mainMargin,
          "transition-[margin] duration-200 ease-in-out",
        )}
      >
        <main
          className={clsx(
            "flex min-h-dvh flex-col pb-6 md:pb-8",
            NAVBAR_OFFSET_CLASSES,
            MOBILE_TAB_BAR_OFFSET_CLASSES,
            CONTENT_CONTAINER_CLASSES,
          )}
        >
          {children}
        </main>
      </div>
    </>
  );
}

export const LayoutShell = ({ children }: LayoutShellProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LayoutSkeleton />;
  }

  return (
    <SidebarProvider>
      <LayoutShellContent>{children}</LayoutShellContent>
    </SidebarProvider>
  );
};
