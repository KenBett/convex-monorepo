import { router } from "expo-router";

import type { JSX } from "react";

import { Pressable, Text, View } from "react-native";



import { DEFAULT_AVATAR_INITIALS } from "@/constants/app-config";



type AppHeaderProps = {

  title: string;

};



export function AppHeader({ title }: AppHeaderProps): JSX.Element {

  return (

    <View className="min-h-touch flex-row items-center justify-between px-4 pb-3">

      <Text

        accessibilityRole="header"

        className="text-page-title flex-1"

        numberOfLines={1}

      >

        {title}

      </Text>



      <Pressable

        accessibilityLabel="Go to profile"

        accessibilityRole="button"

        className="min-h-touch min-w-touch items-center justify-center"

        onPress={() => router.push("/(tabs)/profile")}

      >

        <View className="size-10 items-center justify-center rounded-control bg-surface shadow-elevated">

          <Text className="text-foreground text-xs font-medium">

            {DEFAULT_AVATAR_INITIALS}

          </Text>

        </View>

      </Pressable>

    </View>

  );

}

