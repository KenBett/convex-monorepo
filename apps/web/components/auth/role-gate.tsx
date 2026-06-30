"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { LayoutSkeleton } from "@/components/layout/layout-skeleton";

interface RoleGateProps {
  children: ReactNode;
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

function getRoleHomePath(role: "farmer" | "buyer"): string {
  return role === "farmer" ? "/farmer" : "/buyer";
}

function isOnRoleRoute(pathname: string, role: "farmer" | "buyer"): boolean {
  return (
    pathname === getRoleHomePath(role) ||
    pathname.startsWith(`${getRoleHomePath(role)}/`)
  );
}

export function RoleGate({ children }: RoleGateProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const pathname = usePathname();
  const router = useRouter();

  const viewerLoading = isAuthenticated && viewer === undefined;

  useEffect(() => {
    if (authLoading || viewerLoading || !isAuthenticated) {
      return;
    }
    if (isAuthRoute(pathname)) {
      return;
    }

    const role = viewer?.role;
    if (role === undefined) {
      return;
    }

    const homePath = getRoleHomePath(role);
    if (!isOnRoleRoute(pathname, role)) {
      router.replace(homePath);
    }
  }, [
    authLoading,
    isAuthenticated,
    pathname,
    router,
    viewer?.role,
    viewerLoading,
  ]);

  if (authLoading || viewerLoading) {
    return <LayoutSkeleton />;
  }

  return <>{children}</>;
}
