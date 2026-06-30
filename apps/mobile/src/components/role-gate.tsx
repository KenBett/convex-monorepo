import { api } from "@repo/backend/convex/_generated/api";
import type { MarketplaceRole } from "@repo/types";
import { useConvexAuth, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { useRouter, useSegments } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, type JSX, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

interface RoleGateProps {
  children: ReactNode;
}

function getRoleHomePath(role: MarketplaceRole): "/(farmer)" | "/(buyer)" {
  return role === "farmer" ? "/(farmer)" : "/(buyer)";
}

function isOnRoleGroup(segments: string[], role: MarketplaceRole): boolean {
  const group = role === "farmer" ? "(farmer)" : "(buyer)";
  return segments[0] === group;
}

export function RoleGate({ children }: RoleGateProps): JSX.Element {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const segments = useSegments();
  const router = useRouter();
  const foregroundColor = useThemeColor("foreground");

  const inAuthGroup = segments[0] === "(auth)";
  const viewerLoading = isAuthenticated && viewer === undefined;

  useEffect(() => {
    if (authLoading || viewerLoading || !isAuthenticated || inAuthGroup) {
      return;
    }

    const role = viewer?.role;
    if (role === undefined) {
      return;
    }

    if (!isOnRoleGroup(segments, role)) {
      router.replace(getRoleHomePath(role) as Href);
    }
  }, [
    authLoading,
    inAuthGroup,
    isAuthenticated,
    router,
    segments,
    viewer?.role,
    viewerLoading,
  ]);

  if (authLoading || viewerLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
