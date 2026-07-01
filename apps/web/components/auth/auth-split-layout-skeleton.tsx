import { Skeleton } from "@heroui/react";

const BRAND_SKELETON = "bg-white/15";

function AuthBrandPanelSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative overflow-hidden bg-brand-deep px-5 py-6 sm:px-8">
        <div
          aria-hidden
          className="vunr-noise pointer-events-none absolute inset-0 opacity-40"
        />
        <div className="relative flex items-center gap-3 skeleton--shimmer">
          <Skeleton
            animationType="none"
            className={`size-8 shrink-0 rounded-lg ${BRAND_SKELETON}`}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              animationType="none"
              className={`h-5 w-28 rounded-md ${BRAND_SKELETON}`}
            />
            <Skeleton
              animationType="none"
              className={`h-4 w-44 max-w-full rounded-md ${BRAND_SKELETON}`}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-dvh flex-col justify-between overflow-hidden bg-brand-deep p-10 lg:min-h-0 lg:p-14">
      <div
        aria-hidden
        className="vunr-noise pointer-events-none absolute inset-0 opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-brand-accent-highlight/10 blur-3xl"
      />

      <div className="relative skeleton--shimmer">
        <div className="flex items-center gap-3">
          <Skeleton
            animationType="none"
            className={`size-10 shrink-0 rounded-lg ${BRAND_SKELETON}`}
          />
          <Skeleton
            animationType="none"
            className={`h-7 w-36 rounded-md ${BRAND_SKELETON}`}
          />
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-2 py-8">
        <Skeleton
          animationType="none"
          className={`size-[220px] shrink-0 rounded-2xl ${BRAND_SKELETON} skeleton--shimmer`}
        />
        <div className="mt-8 w-full max-w-md skeleton--shimmer">
          <Skeleton
            animationType="none"
            className={`mx-auto h-3 w-48 rounded-md ${BRAND_SKELETON}`}
          />
          <Skeleton
            animationType="none"
            className={`mx-auto mt-3 h-9 w-full max-w-sm rounded-md ${BRAND_SKELETON}`}
          />
          <Skeleton
            animationType="none"
            className={`mx-auto mt-2 h-9 w-4/5 max-w-xs rounded-md ${BRAND_SKELETON}`}
          />
        </div>
      </div>

      <Skeleton
        animationType="none"
        className={`relative h-3 w-24 rounded-md ${BRAND_SKELETON}`}
      />
    </div>
  );
}

function AuthFormCardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-[0.875rem] bg-surface p-6 shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-2 skeleton--shimmer">
        <Skeleton animationType="none" className="h-8 w-44 rounded-md" />
        <Skeleton
          animationType="none"
          className="h-4 w-full max-w-xs rounded-md"
        />
      </div>

      <Skeleton animationType="none" className="h-10 w-full rounded-full" />

      <div className="flex items-center gap-2 skeleton--shimmer">
        <Skeleton animationType="none" className="h-4 w-36 rounded-md" />
        <Skeleton animationType="none" className="h-4 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function AuthSplitLayoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading authentication"
      className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div className="lg:hidden">
        <AuthBrandPanelSkeleton compact />
      </div>

      <div className="hidden lg:block">
        <AuthBrandPanelSkeleton />
      </div>

      <div className="flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <AuthFormCardSkeleton />
        </div>
      </div>
    </div>
  );
}
