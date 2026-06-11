"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { NAV_ITEMS } from "@/config/navigation";
import { MOBILE_TAB_BAR_HEIGHT_CLASSES } from "@/constants/layout";

export const MobileTabBar = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "bg-background pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div
        className={clsx(
          "grid grid-cols-3",
          MOBILE_TAB_BAR_HEIGHT_CLASSES,
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <NextLink
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={clsx(
                "flex items-center justify-center transition-colors",
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
