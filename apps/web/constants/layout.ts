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

export const NAVBAR_HEIGHT_CLASSES =
  "h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-14";

export const NAVBAR_OFFSET_CLASSES =
  "pt-[calc(3rem+env(safe-area-inset-top,0px))] md:pt-14";

/** Viewport frame under the fixed navbar (mobile uses main pb-6 = 1.5rem). */
export const PAGE_FRAME_HEIGHT_CLASSES =
  "h-[calc(100svh-3rem-1.5rem-env(safe-area-inset-top,0px))] md:h-[calc(100dvh-3.5rem-2rem)]";

export const CONTENT_CONTAINER_CLASSES =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
