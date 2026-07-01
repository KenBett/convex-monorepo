import type { MarketplaceRole } from "@repo/types";

import {
  Package,
  ShoppingBag,
  Tractor,
  User,
  ClipboardList,
} from "lucide-react";
import { roleHomeSegment } from "@repo/utils";

export const FARMER_NAV_ITEMS = [
  { label: "Dashboard", href: "/farmer", icon: Tractor },
  { label: "My Products", href: "/farmer/my-products", icon: Package },
  { label: "Orders", href: "/farmer/orders", icon: ClipboardList },
  { label: "Profile", href: "/farmer/profile", icon: User },
] as const;

export const BUYER_NAV_ITEMS = [
  { label: "Find produce", href: "/buyer", icon: ShoppingBag },
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

export function getOrdersPathForRole(
  role: MarketplaceRole | undefined,
): string | null {
  if (role === "farmer") return "/farmer/orders";

  return null;
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
  "/farmer/orders",
]);
