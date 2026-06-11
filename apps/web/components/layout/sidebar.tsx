"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@heroui/react";
import clsx from "clsx";

import { NAV_ITEMS } from "@/config/navigation";
import { SIDEBAR_WIDTH_CLASSES } from "@/constants/layout";

import { Logo } from "./logo";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside
      suppressHydrationWarning
      className={clsx(
        "fixed left-0 top-0 z-40 hidden h-screen bg-background md:block",
        "shadow-sm dark:shadow-none dark:border-r dark:border-separator",
        SIDEBAR_WIDTH_CLASSES.collapsed,
      )}
    >
      <div className="flex h-14 items-center justify-center px-2">
        <NextLink aria-label="Home" className="flex items-center" href="/">
          <Logo size={28} />
        </NextLink>
      </div>

      <nav className="flex flex-col gap-2 p-3 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Tooltip key={item.href} delay={0}>
              <NextLink
                aria-label={item.label}
                className={clsx(
                  "flex items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-background text-inherit"
                    : "hover:bg-default/40 hover:text-foreground",
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
              <Tooltip.Content showArrow placement="right">
                <Tooltip.Arrow />
                <p>{item.label}</p>
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
};
