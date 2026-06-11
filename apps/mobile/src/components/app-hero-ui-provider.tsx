import { PortalHost, ToastProvider, type HeroUINativeConfig } from "heroui-native";
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

const GlobalAnimationSettingsProvider = (
  require("heroui-native/lib/module/providers/animation-settings/provider") as {
    default: ComponentType<{
      animation?: HeroUINativeConfig["animation"];
      children: ReactNode;
    }>;
  }
).default;

const { TextComponentProvider } =
  require("heroui-native/lib/module/providers/text-component/provider") as {
    TextComponentProvider: ComponentType<{
      value: Pick<HeroUINativeConfig, "textProps">;
      children: ReactNode;
    }>;
  };

type AppHeroUIProviderProps = {
  children: ReactNode;
  config?: HeroUINativeConfig;
};

function useSyncUniwindInsets(): void {
  const insets = useSafeAreaInsets();
  const lastInsetsRef = useRef(insets);

  useEffect(() => {
    const previous = lastInsetsRef.current;
    if (
      previous.top === insets.top &&
      previous.bottom === insets.bottom &&
      previous.left === insets.left &&
      previous.right === insets.right
    ) {
      return;
    }

    lastInsetsRef.current = insets;
    Uniwind.updateInsets(insets);
  }, [insets]);
}

/**
 * HeroUI provider without SafeAreaListener.
 *
 * HeroUINativeProvider nests SafeAreaListener, which breaks on Windows/web
 * because CompatNativeSafeAreaProvider re-fires when onInsetsChange changes
 * identity each render, causing an infinite Uniwind update loop.
 */
export function AppHeroUIProvider({
  children,
  config = {},
}: AppHeroUIProviderProps): ReactNode {
  const { textProps, toast, animation } = config;

  useSyncUniwindInsets();

  const isToastEnabled = toast !== false && toast !== "disabled";
  const toastProps = typeof toast === "object" ? toast : {};

  return (
    <GlobalAnimationSettingsProvider animation={animation}>
      <TextComponentProvider value={{ textProps }}>
        {isToastEnabled ? (
          <ToastProvider {...toastProps}>
            {children}
            <PortalHost />
          </ToastProvider>
        ) : (
          <>
            {children}
            <PortalHost />
          </>
        )}
      </TextComponentProvider>
    </GlobalAnimationSettingsProvider>
  );
}
