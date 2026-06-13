"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { Avatar } from "@heroui/react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import { Search } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { getPageTitle } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  CONTENT_CONTAINER_CLASSES,
  getSidebarLayoutClasses,
  NAVBAR_HEIGHT_CLASSES,
} from "@/constants/layout";

import { useSidebar } from "./sidebar-context";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

function getInitials(name: string | undefined, email: string | undefined) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return avatarInitials;
}

export const Navbar = () => {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { isExpanded } = useSidebar();
  const { navbarLeft } = getSidebarLayoutClasses(isExpanded);
  const viewer = useQuery(api.users.viewer);
  const displayName = viewer?.name ?? viewer?.email ?? "Account";
  const initials = viewer
    ? getInitials(viewer.name, viewer.email)
    : avatarInitials;

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
          "flex h-full items-center justify-between gap-4",
          CONTENT_CONTAINER_CLASSES,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <NextLink
            aria-label="Go to profile"
            className="hidden shrink-0 rounded-full transition-opacity hover:opacity-80 md:inline-flex"
            href="/profile"
          >
            <Avatar size="md">
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
          <div
            aria-hidden="true"
            className="hidden h-6 w-px shrink-0 bg-separator md:block"
          />
          <h1 className="truncate text-base font-semibold text-foreground md:text-lg">
            {pageTitle}
          </h1>
        </div>

        <NextLink
          aria-label="Explore"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default/40 hover:text-foreground"
          href="/explore"
        >
          <Search className="h-5 w-5" />
        </NextLink>
      </header>
    </nav>
  );
};
