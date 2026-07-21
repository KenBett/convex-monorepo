import type { MarketplaceRole } from "@repo/types";

import {
  Package,
  ShoppingBag,
  Tractor,
  Truck,
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
  { label: "Track orders", href: "/buyer/orders", icon: ClipboardList },
  { label: "Profile", href: "/buyer/profile", icon: User },
] as const;

export const DRIVER_NAV_ITEMS = [
  { label: "Deliveries", href: "/driver", icon: Truck },
] as const;

export type FarmerNavItem = (typeof FARMER_NAV_ITEMS)[number];
export type BuyerNavItem = (typeof BUYER_NAV_ITEMS)[number];
export type DriverNavItem = (typeof DRIVER_NAV_ITEMS)[number];
export type AnyNavItem = FarmerNavItem | BuyerNavItem | DriverNavItem;

export function getNavItemsForRole(role: MarketplaceRole | undefined) {
  if (role === "buyer") return BUYER_NAV_ITEMS;
  if (role === "driver") return DRIVER_NAV_ITEMS;

  return FARMER_NAV_ITEMS;
}

export function getRoleHomePath(role: MarketplaceRole): string {
  return `/${roleHomeSegment(role)}`;
}

export function getOrdersPathForRole(
  role: MarketplaceRole | undefined,
): string | null {
  if (role === "farmer") return "/farmer/orders";
  if (role === "buyer") return "/buyer/orders";

  return null;
}

export function getPageTitle(pathname: string): string {
  if (pathname === "/demo/listings" || pathname.startsWith("/demo/listings/")) {
    return "Demo listings";
  }

  const farmerItem = FARMER_NAV_ITEMS.find((item) => item.href === pathname);

  if (farmerItem) return farmerItem.label;
  const buyerItem = BUYER_NAV_ITEMS.find((item) => item.href === pathname);

  if (buyerItem) return buyerItem.label;
  const driverItem = DRIVER_NAV_ITEMS.find((item) => item.href === pathname);

  if (driverItem) return driverItem.label;

  return "Dashboard";
}

/** Routes that render their own page title block — hide the navbar duplicate. */
export const ROUTES_WITH_PAGE_HEADER = new Set([
  "/farmer/my-products",
  "/farmer/orders",
  "/buyer/orders",
  "/demo/listings",
]);
