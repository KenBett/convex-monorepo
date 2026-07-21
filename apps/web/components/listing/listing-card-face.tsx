"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  buildListingCardFace,
  formatListingStatus,
  type ListingCardFaceInput,
  type ListingStatus,
} from "@repo/types";
import clsx from "clsx";
import { CalendarDays, MapPin, Package } from "lucide-react";

type ListingCardFaceProps = {
  className?: string;
  compact?: boolean;
  /**
   * Larger type that claims unused padding — for zoomed chat cards where
   * default sizes read too small after uniform scale-down.
   */
  emphasized?: boolean;
  cropLabel: string;
  cropBadge: ReactNode;
  forceLight?: boolean;
  listing: ListingCardFaceInput;
  status?: ListingStatus;
};

/** Type/spacing tokens: compact < default < emphasized. */
function faceScale(compact: boolean, emphasized: boolean) {
  if (compact) {
    return {
      chip: "px-1 py-px text-[9px]",
      chipGap: "gap-0.5",
      description: "text-[9px]",
      factHint: "text-[7px]",
      factIcon: "h-2.5 w-2.5",
      factLabel: "text-[7px]",
      factPad: "gap-px px-1.5 py-1",
      factValue: "text-xs",
      gap: "gap-1 px-2 pb-1.5 pt-1",
      kes: "text-[8px]",
      price: "text-sm",
      specGap: "gap-1 px-1.5 py-1",
      specLabel: "text-[7px]",
      status: "text-[9px]",
      title: "text-[11px]",
      variety: "text-[8px]",
    } as const;
  }
  if (emphasized) {
    return {
      chip: "px-2 py-0.5 text-xs",
      chipGap: "gap-1",
      description: "text-xs",
      factHint: "text-[10px]",
      factIcon: "h-3.5 w-3.5",
      factLabel: "text-[10px]",
      factPad: "gap-0.5 px-2 py-1.5",
      factValue: "text-base",
      gap: "gap-1.5 px-2.5 pb-2 pt-1.5",
      kes: "text-[11px]",
      price: "text-xl",
      specGap: "gap-1.5 px-2 py-1.5",
      specLabel: "text-[10px]",
      status: "text-xs",
      title: "text-sm",
      variety: "text-[11px]",
    } as const;
  }

  return {
    chip: "px-1.5 py-0.5 text-[10px]",
    chipGap: "gap-1",
    description: "text-[10px]",
    factHint: "text-[8px]",
    factIcon: "h-3 w-3",
    factLabel: "text-[8px]",
    factPad: "gap-0.5 px-2 py-1.5",
    factValue: "text-[13px]",
    gap: "gap-1.5 px-2.5 pb-2 pt-1.5",
    kes: "text-[9px]",
    price: "text-base",
    specGap: "gap-1.5 px-2 py-1.5",
    specLabel: "text-[8px]",
    status: "text-[10px]",
    title: "text-xs",
    variety: "text-[9px]",
  } as const;
}

type FaceScale = ReturnType<typeof faceScale>;

type FactTone = "default" | "ready" | "supply";

type FactCell = {
  hint?: string | null;
  icon: LucideIcon;
  key: string;
  label: string;
  tone: FactTone;
  value: string;
};

/** Keep chip wrap from blowing up card height in dense grids. */
function visibleChips(chips: string[], max: number): string[] {
  if (chips.length <= max) {
    return chips;
  }
  const shown = chips.slice(0, max - 1);

  return [...shown, `+${chips.length - shown.length}`];
}

function ListingStatusMark({
  forceLight = false,
  scale,
  status,
}: {
  forceLight?: boolean;
  scale: FaceScale;
  status: ListingStatus;
}) {
  const isActive = status === "active";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 font-medium leading-none",
        scale.status,
        isActive
          ? clsx("text-emerald-700", !forceLight && "dark:text-emerald-400")
          : clsx("text-neutral-500", !forceLight && "dark:text-neutral-400"),
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isActive
            ? clsx("bg-emerald-600", !forceLight && "dark:bg-emerald-400")
            : "bg-neutral-400",
        )}
      />
      {formatListingStatus(status)}
    </span>
  );
}

function QualityChipList({
  chips,
  forceLight = false,
  scale,
}: {
  chips: string[];
  forceLight?: boolean;
  scale: FaceScale;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <ul className={clsx("flex min-w-0 flex-wrap", scale.chipGap)}>
      {chips.map((chip, index) => (
        <li
          key={`${chip}-${index}`}
          className={clsx(
            "max-w-full truncate rounded-md font-medium",
            forceLight
              ? "bg-black text-white"
              : "bg-black text-white dark:bg-white dark:text-black",
            scale.chip,
          )}
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

function StandardsBadgeList({
  chips,
  forceLight = false,
  scale,
}: {
  chips: string[];
  forceLight?: boolean;
  scale: FaceScale;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <ul className={clsx("flex min-w-0 flex-wrap", scale.chipGap)}>
      {chips.map((chip, index) => (
        <li
          key={`${chip}-${index}`}
          className={clsx(
            "max-w-full truncate rounded-md font-medium",
            forceLight
              ? "bg-black text-white"
              : "bg-black text-white dark:bg-white dark:text-black",
            scale.chip,
          )}
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

function SpecRow({
  children,
  scale,
  title,
}: {
  children: ReactNode;
  scale: FaceScale;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span
        className={clsx(
          "w-16 shrink-0 pt-0.5 font-medium uppercase tracking-[0.12em] text-muted",
          scale.specLabel,
        )}
      >
        {title}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function factValueClass(tone: FactTone, forceLight: boolean): string {
  if (tone === "ready") {
    return clsx("text-emerald-800", !forceLight && "dark:text-emerald-300");
  }
  if (tone === "supply") {
    return clsx(
      "tabular-nums text-neutral-950",
      !forceLight && "dark:text-neutral-50",
    );
  }

  return clsx("text-neutral-900", !forceLight && "dark:text-neutral-100");
}

function factsGridClass(cells: FactCell[]): string {
  if (cells.length === 1) {
    return "grid-cols-1";
  }
  if (cells.length === 2) {
    return "grid-cols-2";
  }

  return "grid-cols-3";
}

/** Ticket fact strip — where / when / supply as equal cells, not a muted sentence. */
function FactsStrip({
  cells,
  forceLight = false,
  scale,
}: {
  cells: FactCell[];
  forceLight?: boolean;
  scale: FaceScale;
}) {
  if (cells.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Listing facts"
      className={clsx(
        "grid divide-x divide-black/8",
        !forceLight && "dark:divide-white/10",
        factsGridClass(cells),
      )}
      role="group"
    >
      {cells.map((cell) => {
        const Icon = cell.icon;

        return (
          <div
            key={cell.key}
            className={clsx(
              "flex min-w-0 flex-col items-center overflow-hidden text-center",
              scale.factPad,
            )}
          >
            <span
              className={clsx(
                "inline-flex w-full items-center justify-center gap-0.5 font-medium uppercase tracking-[0.14em] text-muted",
                scale.factLabel,
              )}
            >
              <Icon
                aria-hidden
                className={clsx("shrink-0", scale.factIcon)}
                strokeWidth={1.75}
              />
              {cell.label}
            </span>
            <span
              className={clsx(
                "w-full max-w-full font-semibold leading-tight tracking-tight text-balance break-words",
                scale.factValue,
                factValueClass(cell.tone, forceLight),
              )}
            >
              {cell.value}
            </span>
            {cell.hint ? (
              <span
                className={clsx(
                  "w-full max-w-full text-balance break-words text-muted",
                  scale.factHint,
                )}
              >
                {cell.hint}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Shared listing card body: shows only fields that are set. */
export function ListingCardFace({
  className,
  compact = false,
  emphasized = false,
  cropBadge,
  cropLabel,
  forceLight = false,
  listing,
  status,
}: ListingCardFaceProps) {
  const scale = faceScale(compact, emphasized && !compact);
  const face = buildListingCardFace(listing);
  const qualityChips = visibleChips(face.qualityChips, compact ? 3 : 4);
  const standardChips = visibleChips(face.attributeChips, compact ? 3 : 4);
  const hasSpecRows = qualityChips.length > 0 || standardChips.length > 0;

  const quantityLabel = face.commerceChips[0] ?? null;
  const secondarySupply = face.commerceChips.slice(1).join(" · ") || null;

  const factCells: FactCell[] = [
    {
      key: "where",
      icon: MapPin,
      label: "Where",
      value: face.county,
      tone: "default",
    },
    face.harvestLabel
      ? {
          key: "when",
          icon: CalendarDays,
          label: "When",
          value: face.harvestLabel,
          tone: "ready",
        }
      : null,
    quantityLabel
      ? {
          key: "supply",
          icon: Package,
          label: "Supply",
          value: quantityLabel,
          tone: "supply",
          hint: secondarySupply,
        }
      : null,
  ].filter((cell): cell is FactCell => cell !== null);

  return (
    <div
      className={clsx(
        "relative z-10 flex min-h-0 flex-col",
        scale.gap,
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-px">
          <div className="flex min-w-0 items-center gap-1.5">
            {cropBadge}
            <h2
              className={clsx(
                "min-w-0 flex-1 truncate font-semibold capitalize tracking-tight text-neutral-950",
                !forceLight && "dark:text-neutral-50",
                scale.title,
              )}
            >
              {cropLabel}
            </h2>
            {status ? (
              <ListingStatusMark
                forceLight={forceLight}
                scale={scale}
                status={status}
              />
            ) : null}
          </div>
          {face.variety ? (
            <p
              className={clsx(
                "truncate text-neutral-500",
                !forceLight && "dark:text-neutral-400",
                scale.variety,
              )}
            >
              {face.variety}
            </p>
          ) : null}
        </div>
        <p
          className={clsx(
            "shrink-0 font-semibold leading-none tracking-tight text-neutral-950 tabular-nums",
            !forceLight && "dark:text-neutral-50",
            scale.price,
          )}
        >
          <span
            className={clsx(
              "mr-0.5 font-medium text-neutral-500",
              !forceLight && "dark:text-neutral-400",
              scale.kes,
            )}
          >
            KES
          </span>
          {face.pricePerKg}
          <span
            className={clsx(
              "ml-0.5 font-medium text-neutral-500",
              !forceLight && "dark:text-neutral-400",
              scale.kes,
            )}
          >
            /kg
          </span>
        </p>
      </div>

      {factCells.length > 0 || hasSpecRows ? (
        <div className="rounded-md bg-surface">
          <FactsStrip cells={factCells} forceLight={forceLight} scale={scale} />
          {hasSpecRows ? (
            <div className={clsx("flex flex-col", scale.specGap)}>
              {qualityChips.length > 0 ? (
                <SpecRow scale={scale} title="Quality">
                  <QualityChipList
                    chips={qualityChips}
                    forceLight={forceLight}
                    scale={scale}
                  />
                </SpecRow>
              ) : null}
              {standardChips.length > 0 ? (
                <SpecRow scale={scale} title="Standards">
                  <StandardsBadgeList
                    chips={standardChips}
                    forceLight={forceLight}
                    scale={scale}
                  />
                </SpecRow>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
