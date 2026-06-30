import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { MarketplaceRole } from "@repo/types";
import { useConvexAuth, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { useRouter, useSegments } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

interface RoleGateProps {
  children: ReactNode;
}

function getRoleHomePath(role: MarketplaceRole): Href {
  return (role === "farmer" ? "/(farmer)" : "/(buyer)") as Href;
}

function isOnRoleGroup(segments: string[], role: MarketplaceRole): boolean {
  const group = role === "farmer" ? "(farmer)" : "(buyer)";
  return segments[0] === group;
}

function needsOnboarding(viewer: {
  role?: MarketplaceRole;
  onboardingComplete: boolean;
} | null): boolean {
  return !viewer?.role || !viewer.onboardingComplete;
}

export function RoleGate({ children }: RoleGateProps): JSX.Element {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const segments = useSegments();
  const router = useRouter();
  const foregroundColor = useThemeColor("foreground");

  const inAuthGroup = segments[0] === "(auth)";
  const inOnboardingGroup = (segments[0] as string) === "(onboarding)";
  const viewerLoading = isAuthenticated && viewer === undefined;
  const onboardingRequired =
    isAuthenticated && viewer !== undefined && needsOnboarding(viewer);

  useEffect(() => {
    if (authLoading || viewerLoading || !isAuthenticated) {
      return;
    }

    if (inAuthGroup) {
      if (onboardingRequired) {
        router.replace("/(onboarding)" as Href);
      } else if (viewer?.role) {
        router.replace(getRoleHomePath(viewer.role));
      }
      return;
    }

    if (onboardingRequired) {
      if (!inOnboardingGroup) {
        router.replace("/(onboarding)" as Href);
      }
      return;
    }

    const role = viewer?.role;
    if (!role) {
      return;
    }

    if (inOnboardingGroup) {
      router.replace(getRoleHomePath(role));
      return;
    }

    if (!isOnRoleGroup(segments, role)) {
      router.replace(getRoleHomePath(role));
    }
  }, [
    authLoading,
    inAuthGroup,
    inOnboardingGroup,
    isAuthenticated,
    onboardingRequired,
    router,
    segments,
    viewer,
    viewerLoading,
  ]);

  if (authLoading || viewerLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  if (isAuthenticated && onboardingRequired && !inOnboardingGroup && !inAuthGroup) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  if (
    isAuthenticated &&
    viewer?.role &&
    viewer.onboardingComplete &&
    !isOnRoleGroup(segments, viewer.role) &&
    !inOnboardingGroup &&
    !inAuthGroup
  ) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
