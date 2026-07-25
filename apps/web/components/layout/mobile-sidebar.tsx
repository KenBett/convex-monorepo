"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { getInitials } from "@repo/utils";
import { Avatar } from "@heroui/react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import { X } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getNavItemsForRole, getRoleHomePath } from "@/config/navigation";
import { siteConfig } from "@/config/site";

import { Logo } from "./logo";
import { useSidebar } from "./sidebar-context";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

export const MobileSidebar = () => {
  const pathname = usePathname();
  const { isMobileNavOpen, closeMobileNav } = useSidebar();
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

  useEffect(() => {
    closeMobileNav();
  }, [closeMobileNav, pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileNav, isMobileNavOpen]);

  return (
    <div className="md:hidden" data-mobile-nav={isMobileNavOpen ? "open" : "closed"}>
      <button
        aria-hidden={!isMobileNavOpen}
        aria-label="Close menu"
        className={clsx(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200",
          isMobileNavOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        tabIndex={isMobileNavOpen ? 0 : -1}
        type="button"
        onClick={closeMobileNav}
      />

      <aside
        id="mobile-sidebar"
        aria-hidden={!isMobileNavOpen}
        aria-label="Primary"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18.5rem,86vw)] flex-col bg-background",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          "shadow-[2px_0_18px_-6px_rgba(0,0,0,0.18)]",
          "dark:shadow-[3px_0_22px_-6px_rgba(0,0,0,0.55)]",
          "transition-transform duration-200 ease-in-out",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          <NextLink
            aria-label="Home"
            className="flex items-center"
            href={homePath}
            onClick={closeMobileNav}
          >
            <Logo className="text-accent" size={26} />
          </NextLink>
          <button
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-default/40 hover:text-foreground"
            type="button"
            onClick={closeMobileNav}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="scrollbar-none flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <NextLink
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-default/35 hover:text-foreground",
                )}
                href={item.href}
                onClick={closeMobileNav}
              >
                <Icon
                  className={clsx(
                    "h-5 w-5 shrink-0",
                    isActive && "fill-current stroke-current",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </NextLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-separator p-3">
          <NextLink
            aria-current={isProfileActive ? "page" : undefined}
            aria-label="Profile"
            className={clsx(
              "flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
              isProfileActive
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-default/35 hover:text-foreground",
            )}
            href={profilePath}
            onClick={closeMobileNav}
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
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
          </NextLink>
        </div>
      </aside>
    </div>
  );
};
