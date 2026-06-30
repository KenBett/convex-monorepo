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

export type BusinessType = "hotel" | "supermarket" | "exporter" | "individual";

export type ListingStatus = "active" | "sold_out" | "expired";

export type OrderStatus =
  | "pending"
  | "escrowed"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled";
