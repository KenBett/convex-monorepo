"use client";

import { useState, useEffect, type ReactNode } from "react";
import clsx from "clsx";

import {
  CONTENT_CONTAINER_CLASSES,
  MAIN_MARGIN_CLASSES,
  MOBILE_TAB_BAR_OFFSET_CLASSES,
  NAVBAR_OFFSET_CLASSES,
} from "@/constants/layout";

import { LayoutSkeleton } from "./layout-skeleton";
import { MobileTabBar } from "./mobile-tab-bar";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

interface LayoutShellProps {
  children: ReactNode;
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
    <>
      <Sidebar />
      <Navbar />
      <MobileTabBar />
      <div className={clsx(MAIN_MARGIN_CLASSES.collapsed)}>
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
};
