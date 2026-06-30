import { CROP_TYPES, type CropType } from "./marketplace";

export type CropTheme = {
  label: string;
  /** Soft tinted badge behind the crop icon */
  iconBadgeClass: string;
  /** Icon fill / stroke color (Tailwind utility) */
  iconColorClass: string;
  /** Solid icon fill for React Native SVG */
  iconFill: string;
  iconFillDark: string;
  /** Tinted card background for crop picker tiles */
  cardClass: string;
  /** Full-card background tint for listing cards (no border) */
  listingCardBgClass: string;
};

export const CROP_THEMES: Record<CropType, CropTheme> = {
  maize: {
    label: "Maize",
    iconBadgeClass:
      "bg-amber-100/90 dark:bg-amber-950/70",
    iconColorClass: "text-amber-700 dark:text-amber-300",
    iconFill: "#b45309",
    iconFillDark: "#fcd34d",
    cardClass:
      "border-amber-200/80 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/40",
    listingCardBgClass: "bg-amber-50 dark:bg-amber-950/40",
  },
  beans: {
    label: "Beans",
    iconBadgeClass:
      "bg-orange-100/90 dark:bg-orange-950/70",
    iconColorClass: "text-orange-700 dark:text-orange-300",
    iconFill: "#c2410c",
    iconFillDark: "#fdba74",
    cardClass:
      "border-orange-200/80 bg-orange-50/80 dark:border-orange-800/50 dark:bg-orange-950/40",
    listingCardBgClass: "bg-lime-50 dark:bg-lime-950/40",
  },
  potatoes: {
    label: "Potatoes",
    iconBadgeClass:
      "bg-stone-200/90 dark:bg-stone-900/70",
    iconColorClass: "text-stone-600 dark:text-stone-300",
    iconFill: "#57534e",
    iconFillDark: "#d6d3d1",
    cardClass:
      "border-stone-300/80 bg-stone-100/80 dark:border-stone-600/50 dark:bg-stone-900/50",
    listingCardBgClass: "bg-stone-100 dark:bg-stone-900/50",
  },
  tomatoes: {
    label: "Tomatoes",
    iconBadgeClass:
      "bg-rose-100/90 dark:bg-rose-950/70",
    iconColorClass: "text-rose-700 dark:text-rose-300",
    iconFill: "#be123c",
    iconFillDark: "#fda4af",
    cardClass:
      "border-rose-200/80 bg-rose-50/80 dark:border-rose-800/50 dark:bg-rose-950/40",
    listingCardBgClass: "bg-red-50 dark:bg-rose-950/40",
  },
  onions: {
    label: "Onions",
    iconBadgeClass:
      "bg-violet-100/90 dark:bg-violet-950/70",
    iconColorClass: "text-violet-700 dark:text-violet-300",
    iconFill: "#6d28d9",
    iconFillDark: "#c4b5fd",
    cardClass:
      "border-violet-200/80 bg-violet-50/80 dark:border-violet-800/50 dark:bg-violet-950/40",
    listingCardBgClass: "bg-purple-50 dark:bg-violet-950/40",
  },
  cabbage: {
    label: "Cabbage",
    iconBadgeClass:
      "bg-emerald-100/90 dark:bg-emerald-950/70",
    iconColorClass: "text-emerald-700 dark:text-emerald-300",
    iconFill: "#047857",
    iconFillDark: "#6ee7b7",
    cardClass:
      "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/40",
    listingCardBgClass: "bg-green-50 dark:bg-emerald-950/40",
  },
  avocado: {
    label: "Avocado",
    iconBadgeClass:
      "bg-lime-100/90 dark:bg-lime-950/70",
    iconColorClass: "text-lime-700 dark:text-lime-300",
    iconFill: "#4d7c0f",
    iconFillDark: "#bef264",
    cardClass:
      "border-lime-200/80 bg-lime-50/80 dark:border-lime-800/50 dark:bg-lime-950/40",
    listingCardBgClass: "bg-lime-50 dark:bg-lime-950/40",
  },
  coffee: {
    label: "Coffee",
    iconBadgeClass:
      "bg-amber-200/90 dark:bg-amber-950/70",
    iconColorClass: "text-amber-900 dark:text-amber-200",
    iconFill: "#78350f",
    iconFillDark: "#fde68a",
    cardClass:
      "border-amber-300/80 bg-amber-100/70 dark:border-amber-700/50 dark:bg-amber-950/45",
    listingCardBgClass: "bg-amber-100 dark:bg-amber-950/45",
  },
  tea: {
    label: "Tea",
    iconBadgeClass:
      "bg-teal-100/90 dark:bg-teal-950/70",
    iconColorClass: "text-teal-700 dark:text-teal-300",
    iconFill: "#0f766e",
    iconFillDark: "#5eead4",
    cardClass:
      "border-teal-200/80 bg-teal-50/80 dark:border-teal-800/50 dark:bg-teal-950/40",
    listingCardBgClass: "bg-teal-50 dark:bg-teal-950/40",
  },
  wheat: {
    label: "Wheat",
    iconBadgeClass:
      "bg-yellow-100/90 dark:bg-yellow-950/70",
    iconColorClass: "text-yellow-700 dark:text-yellow-300",
    iconFill: "#a16207",
    iconFillDark: "#fde047",
    cardClass:
      "border-yellow-200/80 bg-yellow-50/80 dark:border-yellow-800/50 dark:bg-yellow-950/40",
    listingCardBgClass: "bg-yellow-50 dark:bg-yellow-950/40",
  },
};

const FALLBACK_THEME: CropTheme = {
  label: "Crop",
  iconBadgeClass: "bg-default",
  iconColorClass: "text-muted",
  iconFill: "#737373",
  iconFillDark: "#a3a3a3",
  cardClass: "border-separator bg-surface",
  listingCardBgClass: "bg-surface",
};

export function isCropType(crop: string): crop is CropType {
  return (CROP_TYPES as readonly string[]).includes(crop);
}

export function getCropTheme(crop: string): CropTheme {
  if (isCropType(crop)) {
    return CROP_THEMES[crop];
  }

  return {
    ...FALLBACK_THEME,
    label: crop.charAt(0).toUpperCase() + crop.slice(1),
  };
}

export function getListingCardBgClass(crop: string): string {
  return getCropTheme(crop).listingCardBgClass;
}

export function formatListingStatus(status: string): string {
  if (status === "sold_out") {
    return "Sold out";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}
