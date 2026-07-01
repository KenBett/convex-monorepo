import type { ListingStatus, MarketplaceRole } from "./marketplace";

export {
  BUSINESS_TYPES,
  COUNTIES,
  CROP_TYPES,
  type BusinessType,
  type County,
  type CropType,
  type ListingStatus,
  type MarketplaceRole,
  type OrderStatus,
} from "./marketplace";

export {
  CROP_THEMES,
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  isCropType,
  type CropTheme,
} from "./crop-theme";

export {
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "./listing-card-texture";

export {
  CROP_ICON_DEFINITIONS,
  getCropIconDefinition,
  type CropIconDefinition,
} from "./crop-icons";

export {
  LISTING_FORM_STEP_COUNT,
  LISTING_FORM_STEP_LABELS,
  listingFormDefaults,
  listingFormSchema,
  parseListingForm,
  validateListingFormStep,
  type ListingFormFieldErrors,
  type ListingFormInput,
  type ListingFormStep,
} from "./listing-form";

export {
  calculateOrderTotal,
  formatOrderCancelledReason,
  formatOrderStatus,
  normalizeMpesaPhone,
  orderFormSchema,
  parseOrderForm,
  type OrderCancelledReason,
  type OrderFormFieldErrors,
  type OrderFormInput,
} from "./order-form";

export type { OrderSummary } from "./marketplace";

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  emailVerificationTime?: number;
  isAnonymous?: boolean;
  onboardingComplete?: boolean;
  role?: MarketplaceRole;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export type DocumentStatus = "processing" | "ready" | "error";

export type DocumentSourceType = "text" | "file";

export interface DocumentSummary {
  _id: string;
  _creationTime: number;
  createdAt: number;
  error?: string;
  filename?: string;
  ragEntryId?: string;
  sourceType: DocumentSourceType;
  status: DocumentStatus;
  storageId?: string;
  title: string;
  uploadedBy: string;
}

export interface KnowledgeSearchResult {
  entryId: string;
  score: number;
  text: string;
  title?: string;
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

export interface KnowledgeAskResponse {
  answer: string;
  sources: KnowledgeSearchResult[];
}

export interface ListingSearchResult {
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageUrl?: string | null;
  listingId: string;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  snippet: string;
  status: ListingStatus;
  title?: string;
}

export interface ListingSearchResponse {
  results: ListingSearchResult[];
}

export {
  buyerSearchIntentSchema,
  fromParsedBuyerSearchIntent,
  type BuyerOrderDraft,
  type BuyerOrderDraftIssue,
  type BuyerOrderDraftLine,
  type BuyerOrderDraftStreamData,
  type BuyerChatStatusPhase,
  type BuyerChatStatusStreamData,
  type BuyerOrderLineRequest,
  type BuyerSearchIntent,
  type BuyerSourcingListingResult,
  type BuyerSourcingMeta,
  type BuyerSourcingSearchResponse,
  type BuyerSourcingStreamData,
  type ChatListingAvailability,
  type ChatListingLiveStatus,
} from "./buyer-sourcing";

export {
  getBuyerListingDescription,
  getBuyerListingSnippet,
  isDebugListingDescription,
} from "./listing-display";
