"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { getNavItemsForRole } from "@/config/navigation";
import { MOBILE_TAB_BAR_HEIGHT_CLASSES } from "@/constants/layout";

export const MobileTabBar = () => {
  const pathname = usePathname();
  const viewer = useQuery(api.users.viewer);
  const navItems = getNavItemsForRole(viewer?.role);

  return (
    <nav
      aria-label="Primary"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "bg-background pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className={clsx("flex", MOBILE_TAB_BAR_HEIGHT_CLASSES)}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <NextLink
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={clsx(
                "flex flex-1 items-center justify-center transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted hover:text-foreground",
              )}
              href={item.href}
            >
              <Icon
                className={clsx(
                  "h-6 w-6 shrink-0 transition-all",
                  isActive && "fill-current stroke-current",
                )}
              />
            </NextLink>
          );
        })}
      </div>
    </nav>
  );
};
