"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { MarketplaceRole } from "@repo/types";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface AuthRedirectProps {
  children: ReactNode;
}

function getRoleHomePath(role: MarketplaceRole): string {
  return role === "farmer" ? "/farmer" : "/buyer";
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const router = useRouter();

  const viewerLoading = isAuthenticated && viewer === undefined;

  useEffect(() => {
    if (isLoading || viewerLoading || !isAuthenticated) {
      return;
    }

    if (!viewer?.role || !viewer.onboardingComplete) {
      router.replace("/onboarding");
      return;
    }

    router.replace(getRoleHomePath(viewer.role));
  }, [isAuthenticated, isLoading, router, viewer, viewerLoading]);

  if (isLoading || viewerLoading || isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
