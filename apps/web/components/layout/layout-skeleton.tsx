import {
  CONTENT_CONTAINER_CLASSES,
  MAIN_MARGIN_CLASSES,
  MOBILE_TAB_BAR_HEIGHT_CLASSES,
  MOBILE_TAB_BAR_OFFSET_CLASSES,
  NAVBAR_HEIGHT_CLASSES,
  NAVBAR_LEFT_CLASSES,
  NAVBAR_OFFSET_CLASSES,
  SIDEBAR_WIDTH_CLASSES,
} from "@/constants/layout";

export const LayoutSkeleton = () => (
  <>
    <div
      className={`fixed left-0 top-0 z-30 hidden h-screen border-r border-separator bg-background md:block ${SIDEBAR_WIDTH_CLASSES.collapsed}`}
    />
    <div
      className={`fixed top-0 right-0 z-40 ${NAVBAR_HEIGHT_CLASSES} ${NAVBAR_LEFT_CLASSES.collapsed} bg-background/70`}
    />
    <div
      className={`fixed inset-x-0 bottom-0 z-40 md:hidden ${MOBILE_TAB_BAR_HEIGHT_CLASSES} bg-background pb-[env(safe-area-inset-bottom)]`}
    />
    <div className={MAIN_MARGIN_CLASSES.collapsed}>
      <div
        className={`min-h-dvh pb-6 md:pb-8 ${NAVBAR_OFFSET_CLASSES} ${MOBILE_TAB_BAR_OFFSET_CLASSES} ${CONTENT_CONTAINER_CLASSES}`}
      >
        <div className="h-96 animate-pulse rounded-lg bg-default/20" />
      </div>
    </div>
  </>
);
