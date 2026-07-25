"use client";

import { useState, useEffect, type ReactNode } from "react";
import clsx from "clsx";

import {
  CONTENT_CONTAINER_CLASSES,
  getSidebarLayoutClasses,
  NAVBAR_OFFSET_CLASSES,
} from "@/constants/layout";

import { LayoutSkeleton } from "./layout-skeleton";
import { MobileSidebar } from "./mobile-sidebar";
import { Navbar } from "./navbar";
import { NavbarActionsProvider } from "./navbar-actions-context";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";

interface LayoutShellProps {
  children: ReactNode;
  /** Hide the top navbar and its offset (full-bleed pages like driver map). */
  hideNavbar?: boolean;
}

function LayoutShellContent({
  children,
  hideNavbar = false,
}: LayoutShellProps) {
  const { isExpanded } = useSidebar();
  const { mainMargin } = getSidebarLayoutClasses(isExpanded);

  return (
    <>
      <Sidebar />
      <MobileSidebar />
      {hideNavbar ? null : <Navbar />}
      <div
        className={clsx(
          mainMargin,
          "transition-[margin] duration-200 ease-in-out",
        )}
      >
        <main
          className={clsx(
            "flex min-h-dvh flex-col",
            hideNavbar
              ? "p-0 md:h-dvh md:overflow-hidden"
              : clsx(
                  "pb-6 md:pb-8",
                  NAVBAR_OFFSET_CLASSES,
                  CONTENT_CONTAINER_CLASSES,
                ),
          )}
        >
          {children}
        </main>
      </div>
    </>
  );
}

export const LayoutShell = ({
  children,
  hideNavbar = false,
}: LayoutShellProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LayoutSkeleton />;
  }

  return (
    <SidebarProvider>
      <NavbarActionsProvider>
        <LayoutShellContent hideNavbar={hideNavbar}>
          {children}
        </LayoutShellContent>
      </NavbarActionsProvider>
    </SidebarProvider>
  );
};
