import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from "@expo-google-fonts/geist";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useThemeColor } from "heroui-native";
import { useEffect, useMemo, type JSX } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";

import { AppHeroUIProvider } from "@/components/app-hero-ui-provider";
import { AuthGate } from "@/components/auth-gate";
import { RoleGate } from "@/components/role-gate";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/contexts/theme-preference-context";

import { ConvexClientProvider } from "../../lib/convex";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

function RootNavigation(): JSX.Element {
  const { theme } = useUniwind();
  const backgroundColor = useThemeColor("background");
  const navigationTheme = useMemo(
    () => ({
      ...(theme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(theme === "dark" ? DarkTheme : DefaultTheme).colors,
        background: backgroundColor,
        card: backgroundColor,
      },
    }),
    [backgroundColor, theme],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <View className="bg-background flex-1">
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(farmer)" />
          <Stack.Screen name="(buyer)" />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

function AppBootstrap(): JSX.Element | null {
  const { isLoading } = useThemePreference();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <ConvexClientProvider>
      <AppHeroUIProvider
        config={{ devInfo: { stylingPrinciples: false } }}
      >
        <AuthGate>
          <RoleGate>
            <RootNavigation />
          </RoleGate>
        </AuthGate>
      </AppHeroUIProvider>
    </ConvexClientProvider>
  );
}

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    "Geist-Regular": Geist_400Regular,
    "Geist-Medium": Geist_500Medium,
    "Geist-SemiBold": Geist_600SemiBold,
    "Geist-Bold": Geist_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemePreferenceProvider>
          <AppBootstrap />
        </ThemePreferenceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
