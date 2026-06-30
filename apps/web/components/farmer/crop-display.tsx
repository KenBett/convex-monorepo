import {
  CROP_TYPES,
  getCropIconDefinition,
  getCropTheme,
  getListingCardBgClass,
  type CropType,
} from "@repo/types";
import { Label } from "@heroui/react";
import clsx from "clsx";
import { Check } from "lucide-react";

const BADGE_SIZE_CLASS = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
} as const;

const ICON_SIZE_CLASS = {
  sm: "h-[18px] w-[18px]",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

type CropBadgeProps = {
  crop: string;
  size?: "sm" | "md" | "lg";
};

export function CropIcon({
  crop,
  className,
}: {
  crop: string;
  className?: string;
}) {
  const icon = getCropIconDefinition(crop);

  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox={icon.viewBox}
    >
      {icon.paths.map((path) => (
        <path key={path.slice(0, 24)} d={path} />
      ))}
    </svg>
  );
}

export function CropBadge({ crop, size = "md" }: CropBadgeProps) {
  const theme = getCropTheme(crop);

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-[0.65rem] ${BADGE_SIZE_CLASS[size]} ${theme.iconBadgeClass}`}
    >
      <CropIcon
        crop={crop}
        className={`${ICON_SIZE_CLASS[size]} ${theme.iconColorClass}`}
      />
    </span>
  );
}

export function CropLabel({ crop }: { crop: string }) {
  const theme = getCropTheme(crop);

  return (
    <span className="inline-flex items-center gap-2">
      <CropBadge crop={crop} size="sm" />
      <span>{theme.label}</span>
    </span>
  );
}

export function cropCardClassName(crop: string): string {
  return getCropTheme(crop).cardClass;
}

type CropPickerGridProps = {
  error?: string;
  onChange: (crop: CropType) => void;
  value: CropType;
  variant?: "compact" | "expanded";
};

export function CropPickerGrid({
  error,
  onChange,
  value,
  variant = "compact",
}: CropPickerGridProps) {
  const expanded = variant === "expanded";

  return (
    <div className={clsx("flex flex-col", expanded ? "gap-3" : "gap-2")}>
      {!expanded ? <Label>Crop</Label> : null}
      <div
        aria-label="Crop"
        className={clsx(
          "grid",
          expanded ? "grid-cols-3 gap-3 sm:grid-cols-4" : "grid-cols-4 gap-2",
        )}
        role="radiogroup"
      >
        {CROP_TYPES.map((crop) => {
          const theme = getCropTheme(crop);
          const selected = value === crop;

          return (
            <button
              key={crop}
              aria-checked={selected}
              className={clsx(
                "relative flex flex-col items-center text-center transition-all duration-150",
                expanded
                  ? "gap-2.5 rounded-xl border p-4 hover:scale-[1.02]"
                  : "gap-1.5 rounded-lg border p-2.5 hover:opacity-90",
                cropCardClassName(crop),
                selected
                  ? clsx(
                      getListingCardBgClass(crop),
                      "border-transparent shadow-sm",
                      expanded && "scale-[1.02]",
                    )
                  : expanded
                    ? "opacity-85 hover:opacity-100"
                    : "",
              )}
              role="radio"
              type="button"
              onClick={() => {
                onChange(crop);
              }}
            >
              {selected ? (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/90 text-background shadow-sm"
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
              ) : null}
              <CropBadge crop={crop} size={expanded ? "lg" : "sm"} />
              <span
                className={clsx(
                  "font-medium leading-tight",
                  expanded ? "text-sm" : "text-xs",
                )}
              >
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
