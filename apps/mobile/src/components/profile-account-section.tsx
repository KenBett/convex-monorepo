import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import { Button, Surface } from "heroui-native";
import { useQuery } from "convex/react";
import type { JSX } from "react";
import { useState } from "react";
import { Text, View } from "react-native";

import { UserAvatar } from "@/components/user-avatar";

export function ProfileAccountSection(): JSX.Element {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = viewer?.name ?? viewer?.email ?? "Account";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Surface variant="default" className="gap-4 rounded-card p-card shadow-elevated">
      <View className="flex-row items-center gap-4">
        <UserAvatar variant="profile" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {displayName}
          </Text>
          {viewer?.email ? (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {viewer.email}
            </Text>
          ) : null}
        </View>
      </View>
      <Button
        className="rounded-full font-semibold mx-auto p-2"
        isDisabled={isSigningOut}
        onPress={() => void handleSignOut()}
        size="lg"
        variant="primary"
      >
          {isSigningOut ? "Signing out…" : "Sign out"}
      </Button>
    </Surface>
  );
}
