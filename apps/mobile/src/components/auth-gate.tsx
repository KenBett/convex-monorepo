import { useConvexAuth } from "convex/react";
import { useRouter, useSegments } from "expo-router";
import { useEffect, type JSX, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps): JSX.Element {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [inAuthGroup, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
