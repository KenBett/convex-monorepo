"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@heroui/react";
import clsx from "clsx";
import { Search } from "lucide-react";

import { getPageTitle } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  CONTENT_CONTAINER_CLASSES,
  NAVBAR_HEIGHT_CLASSES,
  NAVBAR_LEFT_CLASSES,
} from "@/constants/layout";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

export const Navbar = () => {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <nav
      suppressHydrationWarning
      className={clsx(
        "fixed top-0 right-0 z-30 bg-background",
        NAVBAR_HEIGHT_CLASSES,
        NAVBAR_LEFT_CLASSES.collapsed,
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
              <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
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
