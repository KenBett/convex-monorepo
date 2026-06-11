import { Home, Search, User } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Search },
  { label: "Profile", href: "/profile", icon: User },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export function getNavItem(href: NavItem["href"]): NavItem {
  const item = NAV_ITEMS.find((navItem) => navItem.href === href);

  if (!item) {
    throw new Error(`No nav item found for href: ${href}`);
  }

  return item;
}

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find((navItem) => navItem.href === pathname);

  return item?.label ?? "Home";
}
