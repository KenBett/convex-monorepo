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
import {
  NavbarActionsProvider,
  useNavbarActions,
} from "./navbar-actions-context";
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
  const { hideTopChrome } = useNavbarActions();
  const { mainMargin } = getSidebarLayoutClasses(isExpanded);
  const navbarHidden = hideNavbar || hideTopChrome;

  return (
    <>
      <Sidebar />
      <MobileSidebar />
      {navbarHidden ? null : <Navbar />}
      <div
        className={clsx(
          mainMargin,
          "transition-[margin] duration-200 ease-in-out",
        )}
      >
        <main
          className={clsx(
            "flex flex-col",
            navbarHidden
              ? hideNavbar
                ? "min-h-dvh p-0 md:h-dvh md:overflow-hidden"
                : clsx(
                    // Composer focus: drop navbar offset; h-dvh tracks soft keyboard
                    // when interactive-widget=resizes-content.
                    "h-dvh overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]",
                    CONTENT_CONTAINER_CLASSES,
                  )
              : clsx(
                  "min-h-dvh pb-6 md:pb-8",
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
