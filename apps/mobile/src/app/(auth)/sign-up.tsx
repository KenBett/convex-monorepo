import { Link } from "expo-router";
import { Surface } from "heroui-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function SignUpScreen(): JSX.Element {
  return (
    <View className="bg-background flex-1 items-center justify-center px-6">
      <Surface variant="default" className="w-full max-w-sm gap-6 rounded-card p-8 shadow-elevated">
        <View className="gap-1">
          <Text className="text-center text-2xl font-semibold text-foreground">
            Create your account
          </Text>
          <Text className="text-center text-sm text-muted">
            Get started with Google
          </Text>
        </View>

        <GoogleSignInButton label="Sign up with Google" />

        <Text className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link className="font-medium text-foreground" href="/(auth)/sign-in">
            Sign in
          </Link>
        </Text>
      </Surface>
    </View>
  );
}
