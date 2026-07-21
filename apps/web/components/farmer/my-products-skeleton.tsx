import { Skeleton } from "@heroui/react";
import clsx from "clsx";

const SURFACE_CARD = "rounded-[0.875rem] bg-surface shadow-sm dark:shadow-none";

/** Match MyProductsClient viewport frame so skeleton doesn't jump layout. */
const PAGE_FRAME_CLASSES = clsx(
  "mx-auto flex w-full max-w-4xl flex-col gap-4",
  "h-[calc(100dvh-3rem-4rem-env(safe-area-inset-bottom,0px))]",
  "md:h-[calc(100dvh-3.5rem-2rem)]",
);

function ListingStatCardSkeleton() {
  return (
    <div
      className={clsx(
        SURFACE_CARD,
        "flex flex-col gap-2 p-4 skeleton--shimmer",
      )}
    >
      <div className="flex items-center gap-2">
        <Skeleton animationType="none" className="size-3.5 rounded-sm" />
        <Skeleton animationType="none" className="h-3 w-24 rounded-md" />
      </div>
      <Skeleton animationType="none" className="h-7 w-12 rounded-md" />
    </div>
  );
}

function ListingCardSkeleton() {
  return (
    <div
      className={clsx(
        SURFACE_CARD,
        "flex flex-col overflow-hidden skeleton--shimmer",
      )}
    >
      <Skeleton
        animationType="none"
        className="aspect-[16/10] w-full rounded-none"
      />
      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Skeleton animationType="none" className="size-5 rounded-full" />
            <Skeleton animationType="none" className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton animationType="none" className="h-4 w-14 rounded-md" />
        </div>
        <Skeleton animationType="none" className="h-5 w-20 rounded-md" />
        <Skeleton animationType="none" className="h-5 w-24 rounded-md" />
        <Skeleton
          animationType="none"
          className="h-3 w-full max-w-36 rounded-md"
        />
      </div>
    </div>
  );
}

export function MyProductsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className={PAGE_FRAME_CLASSES}
    >
      <div className="flex shrink-0 flex-col gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Skeleton
            animationType="none"
            className="h-8 w-36 rounded-md skeleton--shimmer"
          />
          <Skeleton
            animationType="none"
            className="h-8 w-28 shrink-0 rounded-full skeleton--shimmer sm:mt-0.5"
          />
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ListingStatCardSkeleton />
          <ListingStatCardSkeleton />
          <ListingStatCardSkeleton />
        </div>
      </div>

      <section className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </section>
    </div>
  );
}
