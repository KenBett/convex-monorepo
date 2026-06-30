"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { getInitials } from "@repo/utils";
import { Avatar, Tooltip } from "@heroui/react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { getNavItemsForRole, getRoleHomePath } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getSidebarLayoutClasses } from "@/constants/layout";

import { Logo } from "./logo";
import { useSidebar } from "./sidebar-context";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

export const Sidebar = () => {
  const pathname = usePathname();
  const { isExpanded, setExpanded } = useSidebar();
  const { sidebarWidth } = getSidebarLayoutClasses(isExpanded);
  const viewer = useQuery(api.users.viewer);
  const navItems = getNavItemsForRole(viewer?.role);
  const homePath = getRoleHomePath(viewer?.role ?? "farmer");
  const profilePath =
    viewer?.role === "farmer"
      ? "/farmer/profile"
      : viewer?.role === "buyer"
        ? "/buyer/profile"
        : "/onboarding";
  const displayName = viewer?.name ?? viewer?.email ?? "Account";
  const initials = getInitials(viewer?.name, viewer?.email, avatarInitials);
  const isProfileActive = pathname === profilePath;

  return (
    <div
      suppressHydrationWarning
      className={clsx(
        "fixed left-0 top-0 z-40 hidden md:block",
        "transition-[width] duration-200 ease-in-out",
        sidebarWidth,
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <aside
        className={clsx(
          "flex h-screen w-full flex-col bg-background",
          "shadow-[2px_0_10px_-4px_rgba(0,0,0,0.08)]",
          "dark:shadow-[3px_0_18px_-6px_rgba(0,0,0,0.45)]",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-separator px-2">
          <NextLink
            aria-label="Home"
            className="flex items-center"
            href={homePath}
          >
            <Logo size={28} />
          </NextLink>
        </div>

        <nav
          className={clsx(
            "flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-4",
            isExpanded ? "items-stretch" : "items-center",
          )}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const link = (
              <NextLink
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={clsx(
                  "flex items-center rounded-lg py-2.5 text-xs font-medium transition-colors",
                  isExpanded ? "gap-2.5 px-3" : "justify-center px-2",
                  isActive
                    ? "bg-default/55 text-foreground"
                    : "text-muted hover:bg-default/35 hover:text-foreground",
                )}
                href={item.href}
              >
                <Icon
                  className={clsx(
                    "h-5 w-5 shrink-0 transition-all",
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

        <div
          className={clsx(
            "shrink-0 border-t border-separator p-3",
            isExpanded ? "items-stretch" : "flex justify-center",
          )}
        >
          <NextLink
            aria-current={isProfileActive ? "page" : undefined}
            aria-label="Profile"
            className={clsx(
              "flex items-center rounded-lg py-2 text-xs font-medium transition-colors",
              isExpanded ? "gap-2.5 px-2" : "justify-center px-2",
              isProfileActive
                ? "bg-default/55 text-foreground"
                : "text-muted hover:bg-default/35 hover:text-foreground",
            )}
            href={profilePath}
          >
            <Avatar size="sm">
              {viewer?.image ? (
                <Avatar.Image
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  src={viewer.image}
                />
              ) : null}
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
            {isExpanded ? (
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
            ) : null}
          </NextLink>
        </div>
      </aside>
    </div>
  );
};
