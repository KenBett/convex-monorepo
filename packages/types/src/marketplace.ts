export const CROP_TYPES = [
  "maize",
  "beans",
  "potatoes",
  "tomatoes",
  "onions",
  "cabbage",
  "avocado",
  "bananas",
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
export type MarketplaceRole = "farmer" | "buyer" | "driver";

export type DriveStatus = "assigned" | "picked_up" | "delivered" | "cancelled";

export interface DriveSummary {
  _id: string;
  _creationTime: number;
  assignedDriverUserId: string;
  countyA: string;
  countyB: string;
  createdAt: number;
  crop: string;
  deliveredAt?: number;
  grade?: string;
  imageUrl?: string | null;
  neededByLabel?: string;
  neededByMs?: number;
  orderId: string;
  pickedUpAt?: number;
  pointALabel: string;
  pointBLabel: string;
  quantityKg: number;
  status: DriveStatus;
}

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

export type OrderCancelledReason =
  | "user_cancelled"
  | "timeout"
  | "phone_unreachable"
  | "payment_failed"
  | "insufficient_stock_at_escrow"
  | "buyer_cancelled";

export interface OrderSummary {
  _id: string;
  _creationTime: number;
  agreedPricePerKg: number;
  buyerBusinessName: string;
  cancelledReason?: string;
  county: string;
  createdAt: number;
  crop: string;
  farmerId: string;
  listingId: string;
  mpesaCheckoutRequestId?: string;
  mpesaPhoneNumber?: string;
  mpesaReceiptNumber?: string;
  quantityKg: number;
  status: OrderStatus;
  totalKes: number;
}
