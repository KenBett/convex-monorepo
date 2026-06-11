import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { JSX } from "react";
import { Image, Text, View } from "react-native";

type UserAvatarVariant = "header" | "profile";

type UserAvatarProps = {
  variant?: UserAvatarVariant;
};

function getInitials(name: string | undefined, email: string | undefined) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

const variantStyles = {
  header: {
    container: "size-10 items-center justify-center rounded-avatar bg-surface shadow-elevated",
    image: "size-10 rounded-avatar",
    text: "text-foreground text-xs font-medium",
  },
  profile: {
    container: "size-14 items-center justify-center rounded-full bg-default",
    image: "size-14 rounded-full",
    text: "text-lg font-semibold text-foreground",
  },
} as const;

export function UserAvatar({ variant = "header" }: UserAvatarProps): JSX.Element {
  const viewer = useQuery(api.users.viewer);
  const styles = variantStyles[variant];
  const initials = getInitials(viewer?.name, viewer?.email);

  if (viewer?.image) {
    return (
      <Image
        accessibilityLabel="Profile picture"
        className={styles.image}
        source={{ uri: viewer.image }}
      />
    );
  }

  return (
    <View className={styles.container}>
      <Text className={styles.text}>{initials}</Text>
    </View>
  );
}
