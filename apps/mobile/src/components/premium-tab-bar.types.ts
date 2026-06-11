export type PremiumTabRoute = {
  key: string;
  name: string;
  params?: object;
};

export type PremiumTabBarProps = {
  state: {
    index: number;
    routes: PremiumTabRoute[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarLabel?: unknown;
        tabBarAccessibilityLabel?: string;
        tabBarStyle?: {
          display?: "none" | "flex";
        };
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};
