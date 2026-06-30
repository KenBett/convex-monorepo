import { CROP_TYPES, getCropIconDefinition, getCropTheme, type CropType } from "@repo/types";
import { Label } from "@heroui/react";

const BADGE_SIZE_CLASS = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const;

const ICON_SIZE_CLASS = {
  sm: "h-[18px] w-[18px]",
  md: "h-5 w-5",
} as const;

type CropBadgeProps = {
  crop: string;
  size?: "sm" | "md";
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
};

export function CropPickerGrid({ error, onChange, value }: CropPickerGridProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Crop</Label>
      <div
        aria-label="Crop"
        className="grid grid-cols-4 gap-2"
        role="radiogroup"
      >
        {CROP_TYPES.map((crop) => {
          const theme = getCropTheme(crop);
          const selected = value === crop;

          return (
            <button
              key={crop}
              aria-checked={selected}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition hover:opacity-90 ${cropCardClassName(crop)} ${
                selected
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : ""
              }`}
              role="radio"
              type="button"
              onClick={() => {
                onChange(crop);
              }}
            >
              <CropBadge crop={crop} size="sm" />
              <span className="text-xs font-medium leading-tight">{theme.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
