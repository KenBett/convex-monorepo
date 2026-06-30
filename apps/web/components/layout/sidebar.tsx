"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { Tooltip } from "@heroui/react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { getNavItemsForRole, getRoleHomePath } from "@/config/navigation";
import { getSidebarLayoutClasses } from "@/constants/layout";

import { Logo } from "./logo";
import { useSidebar } from "./sidebar-context";

export const Sidebar = () => {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { sidebarWidth } = getSidebarLayoutClasses(isExpanded);
  const viewer = useQuery(api.users.viewer);
  const navItems = getNavItemsForRole(viewer?.role);
  const homePath = getRoleHomePath(viewer?.role ?? "farmer");

  return (
    <div
      suppressHydrationWarning
      className={clsx(
        "fixed left-0 top-0 z-40 hidden md:block",
        "transition-[width] duration-200 ease-in-out",
        sidebarWidth,
      )}
    >
      <aside
        className={clsx(
          "h-screen w-full bg-background",
          "shadow-[2px_0_10px_-4px_rgba(0,0,0,0.08)]",
          "dark:shadow-[3px_0_18px_-6px_rgba(0,0,0,0.45)]",
        )}
      >
        <div className="flex h-14 items-center justify-center px-2">
          <NextLink aria-label="Home" className="flex items-center" href={homePath}>
            <Logo size={28} />
          </NextLink>
        </div>

        <nav
          className={clsx(
            "flex flex-col gap-2 p-3 pt-4",
            isExpanded ? "items-stretch" : "items-center",
          )}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const link = (
              <NextLink
                aria-label={item.label}
                className={clsx(
                  "flex items-center rounded-lg py-2 text-xs font-medium transition-colors",
                  isExpanded ? "gap-2 px-3" : "justify-center px-2",
                  isActive
                    ? "bg-background text-inherit"
                    : "hover:bg-default/40 hover:text-foreground",
                )}
                href={item.href}
              >
                <Icon
                  className={clsx(
                    "h-4 w-4 shrink-0 transition-all",
                    isActive && "fill-current stroke-current",
                  )}
                />
                {isExpanded ? (
                  <span className="truncate">{item.label}</span>
                ) : null}
              </NextLink>
            );

            if (isExpanded) {
              return <div key={item.href}>{link}</div>;
            }

            return (
              <Tooltip key={item.href} delay={0}>
                {link}
                <Tooltip.Content showArrow placement="right">
                  <Tooltip.Arrow />
                  <p>{item.label}</p>
                </Tooltip.Content>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      <button
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        className={clsx(
          "absolute top-7 left-full z-50 -translate-x-1/2 -translate-y-1/2",
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "border border-separator bg-background text-muted shadow-sm",
          "transition-colors hover:bg-default/40 hover:text-foreground",
        )}
        type="button"
        onClick={toggleSidebar}
      >
        {isExpanded ? (
          <PanelLeftClose className="h-3.5 w-3.5" />
        ) : (
          <PanelLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};
