import { Package, ShoppingBag, Tractor, User } from "lucide-react";

import type { MarketplaceRole } from "@repo/types";
import { roleHomeSegment } from "@repo/utils";

export const FARMER_NAV_ITEMS = [
  { label: "Dashboard", href: "/farmer", icon: Tractor },
  { label: "My Products", href: "/farmer/my-products", icon: Package },
  { label: "Profile", href: "/farmer/profile", icon: User },
] as const;

export const BUYER_NAV_ITEMS = [
  { label: "Dashboard", href: "/buyer", icon: ShoppingBag },
  { label: "Profile", href: "/buyer/profile", icon: User },
] as const;

export type FarmerNavItem = (typeof FARMER_NAV_ITEMS)[number];
export type BuyerNavItem = (typeof BUYER_NAV_ITEMS)[number];
export type AnyNavItem = FarmerNavItem | BuyerNavItem;

export function getNavItemsForRole(role: MarketplaceRole | undefined) {
  if (role === "buyer") return BUYER_NAV_ITEMS;
  return FARMER_NAV_ITEMS;
}

export function getRoleHomePath(role: MarketplaceRole): string {
  return `/${roleHomeSegment(role)}`;
}

export function getPageTitle(pathname: string): string {
  const farmerItem = FARMER_NAV_ITEMS.find((item) => item.href === pathname);
  if (farmerItem) return farmerItem.label;
  const buyerItem = BUYER_NAV_ITEMS.find((item) => item.href === pathname);
  if (buyerItem) return buyerItem.label;
  return "Dashboard";
}

/** Routes that render their own page title block — hide the navbar duplicate. */
export const ROUTES_WITH_PAGE_HEADER = new Set([
  "/farmer/my-products",
]);
