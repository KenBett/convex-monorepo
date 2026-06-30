export const CROP_TYPES = [
  "maize",
  "beans",
  "potatoes",
  "tomatoes",
  "onions",
  "cabbage",
  "avocado",
  "coffee",
  "tea",
  "wheat",
] as const;

export const COUNTIES = [
  "Nairobi",
  "Kiambu",
  "Nakuru",
  "Uasin Gishu",
  "Meru",
  "Nyeri",
  "Kisumu",
  "Machakos",
  "Bungoma",
  "Kakamega",
] as const;

export type CropType = (typeof CROP_TYPES)[number];
export type County = (typeof COUNTIES)[number];
export type MarketplaceRole = "farmer" | "buyer";

export const BUSINESS_TYPES = [
  "hotel",
  "supermarket",
  "exporter",
  "individual",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type ListingStatus = "active" | "sold_out" | "expired";

export type OrderStatus =
  | "pending"
  | "escrowed"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled";
