"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import { getInitials } from "@repo/utils";
import { Avatar, Tooltip } from "@heroui/react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getPageTitle, ROUTES_WITH_PAGE_HEADER } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  CONTENT_CONTAINER_CLASSES,
  getSidebarLayoutClasses,
  NAVBAR_HEIGHT_CLASSES,
} from "@/constants/layout";

import { useSidebar } from "./sidebar-context";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

export const Navbar = () => {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const showPageTitle = !ROUTES_WITH_PAGE_HEADER.has(pathname);
  const { isExpanded } = useSidebar();
  const { navbarLeft } = getSidebarLayoutClasses(isExpanded);
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profilePath =
    viewer?.role === "farmer"
      ? "/farmer/profile"
      : viewer?.role === "buyer"
        ? "/buyer/profile"
        : "/onboarding";
  const displayName = viewer?.name ?? viewer?.email ?? "Account";
  const initials = getInitials(viewer?.name, viewer?.email, avatarInitials);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <nav
      suppressHydrationWarning
      className={clsx(
        "fixed top-0 right-0 z-30 bg-background transition-[left] duration-200 ease-in-out",
        NAVBAR_HEIGHT_CLASSES,
        navbarLeft,
      )}
    >
      <header
        className={clsx(
          "flex h-full items-center justify-between gap-3",
          CONTENT_CONTAINER_CLASSES,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <NextLink
            aria-label="Go to profile"
            className="hidden shrink-0 rounded-full transition-opacity hover:opacity-80 md:inline-flex"
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
          </NextLink>
          {showPageTitle ? (
            <>
              <div
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-separator md:block"
              />
              <h1 className="truncate text-sm font-semibold text-foreground md:text-base">
                {pageTitle}
              </h1>
            </>
          ) : null}
        </div>

        <Tooltip delay={0}>
          <button
            aria-label="Sign out"
            className={clsx(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              "border border-separator bg-background text-muted",
              "transition-colors hover:bg-default/40 hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            disabled={isSigningOut}
            type="button"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
          <Tooltip.Content showArrow placement="bottom">
            <Tooltip.Arrow />
            <p>{isSigningOut ? "Signing out…" : "Sign out"}</p>
          </Tooltip.Content>
        </Tooltip>
      </header>
    </nav>
  );
};
