import { Fragment } from "react";
import type { JSX } from "react";
import { ListGroup, Radio, Separator, Surface, useThemeColor } from "heroui-native";
import { Moon, Smartphone, Sun } from "lucide-react-native";
import { Text, View } from "react-native";

import { ProfileAccountSection } from "@/components/profile-account-section";
import { ScreenShell } from "@/components/screen-shell";
import type { ThemePreference } from "@/hooks/use-app-theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type ThemeOption = {
  label: string;
  description: string;
  value: ThemePreference;
  icon: typeof Sun;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    label: "System",
    description: "Match device settings",
    value: "system",
    icon: Smartphone,
  },
  {
    label: "Light",
    description: "Always use light mode",
    value: "light",
    icon: Sun,
  },
  {
    label: "Dark",
    description: "Always use dark mode",
    value: "dark",
    icon: Moon,
  },
];

export default function ProfileScreen(): JSX.Element {
  const { preference, setPreference } = useAppTheme();
  const foregroundColor = useThemeColor("foreground");

  const selectTheme = (value: ThemePreference): void => {
    void setPreference(value);
  };

  return (
    <ScreenShell title="Profile">
      <ProfileAccountSection />
      <View className="gap-section-title">
        <Text className="text-section-title">Appearance</Text>
        <Surface variant="default" className="overflow-hidden rounded-card shadow-elevated">
          <ListGroup>
          {THEME_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = preference === option.value;

            return (
              <Fragment key={option.value}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  className="min-h-touch gap-4 py-4"
                  onPress={() => selectTheme(option.value)}
                >
                  <ListGroup.ItemPrefix>
                    <View className="bg-default size-10 items-center justify-center rounded-control">
                      <Icon color={foregroundColor} size={20} strokeWidth={2} />
                    </View>
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent className="gap-1">
                    <ListGroup.ItemTitle>{option.label}</ListGroup.ItemTitle>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix className="min-h-touch min-w-touch items-center justify-center">
                    <Radio
                      hitSlop={10}
                      isSelected={isSelected}
                      onSelectedChange={() => selectTheme(option.value)}
                      variant="secondary"
                    >
                      {({ isSelected: selected }) => (
                        <Radio.Indicator
                          className={
                            selected
                              ? "size-3 border-2 border-accent bg-accent"
                              : "size-3 border-2 border-foreground/35 bg-background"
                          }
                        >
                          {selected ? (
                            <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                          ) : null}
                        </Radio.Indicator>
                      )}
                    </Radio>
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </Fragment>
            );
          })}
          </ListGroup>
        </Surface>
      </View>
    </ScreenShell>
  );
}
