"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { LayoutSkeleton } from "@/components/layout/layout-skeleton";
import { type RoutePolicy, useViewerRouting } from "@/hooks/use-viewer-routing";

type RouteGuardProps = RoutePolicy & {
  children?: ReactNode;
  fallback?: ReactNode;
};

/**
 * Thin declarative wrapper over `useViewerRouting`. Renders children only when
 * the viewer is allowed on the current route; otherwise redirects and shows a
 * fallback while the navigation settles.
 */
export function RouteGuard({
  children,
  fallback = <LayoutSkeleton />,
  ...policy
}: RouteGuardProps) {
  const router = useRouter();
  const { phase, redirectTo } = useViewerRouting(policy);

  useEffect(() => {
    if (phase === "redirect" && redirectTo) {
      router.replace(redirectTo);
    }
  }, [phase, redirectTo, router]);

  if (phase === "ready") {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
