import type { CropType } from "./marketplace";

export type CropIconDefinition = {
  viewBox: string;
  paths: readonly string[];
};

/** Minimal flat SVG paths — one icon per crop, rendered with theme icon color. */
export const CROP_ICON_DEFINITIONS: Record<CropType, CropIconDefinition> = {
  maize: {
    viewBox: "0 0 24 24",
    paths: [
      "M9 2h6a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-1.5v-2h-3v2H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm1 5h4v1.5h-4V7Zm0 3.5h4V12h-4v-1.5Zm0 3.5h4V16h-4v-1.5Z",
    ],
  },
  beans: {
    viewBox: "0 0 24 24",
    paths: [
      "M8.5 6.5c-1.8 2.2-1.5 5.3.8 6.8 2.3 1.5 5.4.8 6.9-1.5 1.5-2.3.8-5.4-1.5-6.9-2.3-1.5-5.4-.8-6.2 1.6Z",
      "M11 14.5c-1.4 1.8-1.2 4.3.6 5.7 1.8 1.4 4.3 1.2 5.7-.6 1.4-1.8 1.2-4.3-.6-5.7-1.8-1.4-4.3-1.2-5.7.6Z",
    ],
  },
  potatoes: {
    viewBox: "0 0 24 24",
    paths: [
      "M7.5 8.5c-2.5 1.2-3.8 4.2-2.8 7 1 2.8 3.8 4.5 6.8 4 3-.5 5.2-3 5.5-6 .3-3-1.5-5.8-4.3-6.8-2.8-1-5.8.2-7.2 1.8Z",
      "M10 10.5h1v1h-1v-1Zm4 1.5h1v1h-1v-1Zm-5 3h1v1h-1v-1Z",
    ],
  },
  tomatoes: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 4.5c-.8-1.2-2.2-1.8-3.5-1.2-.5.2-.8.8-.5 1.3.3.5.9.6 1.4.4.8-.3 1.6-.1 2.1.5.5-.6 1.3-.8 2.1-.5.5.2 1.1.1 1.4-.4.3-.5 0-1.1-.5-1.3-1.3-.6-2.7 0-3.5 1.2Z",
      "M8 11a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z",
    ],
  },
  onions: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 3c-1 .8-1.5 2-1.2 3.2.3 1.2 1.2 2 2.4 2.1-1.2.1-2.1.9-2.4 2.1-.3 1.2.2 2.4 1.2 3.2 1 .8 2.4.8 3.4 0 .5-.4.8-1 .8-1.6 0-.6-.3-1.2-.8-1.6-1-.8-1.5-2-1.2-3.2.3-1.2 1.2-2 2.4-2.1-1.2-.1-2.1-.9-2.4-2.1C13.5 5 13 3.8 12 3Z",
      "M12 20v1.5M10 19.5h4",
    ],
  },
  cabbage: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 4c-4.2 1.2-6.5 4.8-6 8.8.5 4 3.8 7 7.8 7.2 4 .2 7.5-2.5 8.2-6.5.7-4-1.8-7.8-6-9.5-1-.4-2.2-.4-3.2 0Z",
      "M12 8c-2 1.5-3 3.5-2.8 5.8M9 10.5c1.2.8 2.5 1 3.8.5M15 10.5c-1.2.8-2.5 1-3.8.5",
    ],
  },
  avocado: {
    viewBox: "0 0 24 24",
    paths: [
      "M14.5 4.5c3 2.5 4.2 6.5 3 10.2-1.2 3.7-4.5 6.3-8.4 6.3-1.8 0-3.2-1.5-2.8-3.3.8-3.5 3.5-7.2 6.8-9.5 1-.7 2.2-.9 3.4-.7Z",
      "M11.5 14.5a2 2 0 1 0 0 .1 2 2 0 0 0 0-.1Z",
    ],
  },
  coffee: {
    viewBox: "0 0 24 24",
    paths: [
      "M6 8h10v8.5c0 1.4-1.1 2.5-2.5 2.5H8.5C7.1 19 6 17.9 6 16.5V8Z",
      "M16 10h1.5c1.1 0 2 .9 2 2s-.9 2-2 2H16v-4ZM5 20h12",
    ],
  },
  tea: {
    viewBox: "0 0 24 24",
    paths: [
      "M6 10c0-2.8 2.2-5 5-5h2c2.8 0 5 2.2 5 5v1H6v-1Z",
      "M5 12h14v2.5c0 2.5-2 4.5-4.5 4.5h-5C7 19 5 17 5 14.5V12Z",
      "M12 5V3M9.5 5.5l-1-1.5M14.5 5.5l1-1.5",
    ],
  },
  wheat: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 3v18M9.5 7c1.5-1 3.5-.5 4 1.5M14.5 7c-1.5-1-3.5-.5-4 1.5M8.5 11c1.8-1 4-.5 4.5 1.8M15.5 11c-1.8-1-4-.5-4.5 1.8M9 15.5c1.5-.8 3.5-.3 4 1.2M15 15.5c-1.5-.8-3.5-.3-4 1.2",
    ],
  },
};

export function getCropIconDefinition(crop: string): CropIconDefinition {
  if (crop in CROP_ICON_DEFINITIONS) {
    return CROP_ICON_DEFINITIONS[crop as CropType];
  }

  return CROP_ICON_DEFINITIONS.wheat;
}
