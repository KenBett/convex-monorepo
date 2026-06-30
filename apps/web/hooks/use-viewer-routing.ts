"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { MarketplaceRole } from "@repo/types";
import { useConvexAuth, useQuery } from "convex/react";
import { useMemo } from "react";

import { getRoleHomePath } from "@/config/navigation";

export const SIGN_IN_PATH = "/sign-in";
export const ONBOARDING_PATH = "/onboarding";

/**
 * Declarative access policy for a route subtree.
 * - `guest`: auth screens; authenticated users are bounced to their home.
 * - `onboarding`: the onboarding screen; already-onboarded users go home.
 * - `role`: a role dashboard; requires auth + onboarding + a matching role.
 * - `index`: the `/` entry; always routes the viewer to their correct place.
 */
export type RoutePolicy =
  | { mode: "guest" }
  | { mode: "onboarding" }
  | { mode: "role"; requiredRole: MarketplaceRole }
  | { mode: "index" };

export type RoutingPhase = "loading" | "redirect" | "ready";

export interface ViewerRouting {
  phase: RoutingPhase;
  redirectTo: string | null;
}

interface Viewer {
  role?: MarketplaceRole;
  onboardingComplete: boolean;
}

function needsOnboarding(viewer: Viewer): boolean {
  return !viewer.role || !viewer.onboardingComplete;
}

/**
 * Single source of truth for auth/role/onboarding routing decisions.
 * Every guarded route subtree consumes this via `RouteGuard`.
 */
export function useViewerRouting(policy: RoutePolicy): ViewerRouting {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const viewerLoading = isAuthenticated && viewer === undefined;

  return useMemo<ViewerRouting>(() => {
    if (authLoading || viewerLoading) {
      return { phase: "loading", redirectTo: null };
    }

    if (!isAuthenticated || viewer === null || viewer === undefined) {
      if (policy.mode === "guest") {
        return { phase: "ready", redirectTo: null };
      }
      return { phase: "redirect", redirectTo: SIGN_IN_PATH };
    }

    const onboardingRequired = needsOnboarding(viewer);
    const home = viewer.role ? getRoleHomePath(viewer.role) : ONBOARDING_PATH;

    switch (policy.mode) {
      case "guest":
        return {
          phase: "redirect",
          redirectTo: onboardingRequired ? ONBOARDING_PATH : home,
        };
      case "index":
        return {
          phase: "redirect",
          redirectTo: onboardingRequired ? ONBOARDING_PATH : home,
        };
      case "onboarding":
        if (onboardingRequired) {
          return { phase: "ready", redirectTo: null };
        }
        return { phase: "redirect", redirectTo: home };
      case "role":
        if (onboardingRequired) {
          return { phase: "redirect", redirectTo: ONBOARDING_PATH };
        }
        if (viewer.role !== policy.requiredRole) {
          return { phase: "redirect", redirectTo: home };
        }
        return { phase: "ready", redirectTo: null };
    }
  }, [authLoading, isAuthenticated, policy, viewer, viewerLoading]);
}
