import type { JSX, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { AppHeader } from "@/components/app-header";

const SafeAreaView = withUniwind(RNSafeAreaView);

type ScreenShellProps = {
  title: string;
  children?: ReactNode;
  scrollable?: boolean;
};

export function ScreenShell({ title, children, scrollable = true }: ScreenShellProps): JSX.Element {
  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <AppHeader title={title} />
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="grow gap-section px-screen-x pt-screen-top pb-screen-bottom">
            {children}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-screen-x pt-screen-top">{children}</View>
      )}
    </SafeAreaView>
  );
}
