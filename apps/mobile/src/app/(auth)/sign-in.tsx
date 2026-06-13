import { Link } from "expo-router";
import { Surface } from "heroui-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function SignInScreen(): JSX.Element {
  return (
    <View className="bg-background flex-1 items-center justify-center px-6">
      <Surface variant="default" className="w-full max-w-sm gap-6 rounded-card p-8 shadow-elevated">
        <Text className="text-center text-2xl font-semibold text-foreground">
          Welcome back
        </Text>

        <GoogleSignInButton />

        <Text className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link className="font-medium text-foreground" href="/(auth)/sign-up">
            Sign up
          </Link>
        </Text>
      </Surface>
    </View>
  );
}
