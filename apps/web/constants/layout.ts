export const SIDEBAR_WIDTH_CLASSES = {
  collapsed: "w-16",
  expanded: "w-44",
} as const;

export const MAIN_MARGIN_CLASSES = {
  collapsed: "ml-0 md:ml-16",
  expanded: "ml-0 md:ml-44",
} as const;

export const NAVBAR_LEFT_CLASSES = {
  collapsed: "left-0 md:left-16",
  expanded: "left-0 md:left-44",
} as const;

export function getSidebarLayoutClasses(isExpanded: boolean) {
  return {
    sidebarWidth: isExpanded
      ? SIDEBAR_WIDTH_CLASSES.expanded
      : SIDEBAR_WIDTH_CLASSES.collapsed,
    mainMargin: isExpanded
      ? MAIN_MARGIN_CLASSES.expanded
      : MAIN_MARGIN_CLASSES.collapsed,
    navbarLeft: isExpanded
      ? NAVBAR_LEFT_CLASSES.expanded
      : NAVBAR_LEFT_CLASSES.collapsed,
  };
}

export const NAVBAR_HEIGHT_CLASSES = "h-12 md:h-14";

export const NAVBAR_OFFSET_CLASSES = "pt-12 md:pt-14";

export const MOBILE_TAB_BAR_HEIGHT_CLASSES = "h-16";

export const MOBILE_TAB_BAR_OFFSET_CLASSES =
  "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0";

export const CONTENT_CONTAINER_CLASSES =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
