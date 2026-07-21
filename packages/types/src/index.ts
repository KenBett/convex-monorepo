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
  type DriveStatus,
  type DriveSummary,
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
  LISTING_CERTIFICATIONS,
  LISTING_CERTIFICATION_LABELS,
  LISTING_GRADES,
  LISTING_HARD_FILTER_TAGS,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  LISTING_TAGS,
  LISTING_TAG_LABELS,
  formatListingCardMeta,
  formatHarvestWindowLabel,
  formatListingGradeLabel,
  listingCardMetaParts,
  buildListingCardFace,
  isListingCertification,
  isListingGrade,
  isListingHardFilterTag,
  isListingPackaging,
  isListingTag,
  listingGradeOptions,
  type ListingCardFaceInput,
  type ListingCardFaceModel,
  type ListingCertification,
  type ListingGrade,
  type ListingHardFilterTag,
  type ListingPackaging,
  type ListingTag,
} from "./listing-attributes";

export {
  COUNTY_CENTROIDS,
  KENYA_BOUNDS,
  getCountyCentroid,
  isValidKenyaLatLng,
  resolveProfileLocation,
  type ResolvedLocation,
} from "./geo";

export {
  calculateOrderTotal,
  formatOrderCancelledReason,
  formatOrderStatus,
  formatDriveStatus,
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
  certifications?: import("./listing-attributes").ListingCertification[];
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageUrl?: string | null;
  listingId: string;
  minOrderKg?: number;
  packaging?: import("./listing-attributes").ListingPackaging;
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  sizeOrCalibre?: string;
  snippet: string;
  status: ListingStatus;
  tags?: import("./listing-attributes").ListingTag[];
  title?: string;
  variety?: string;
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
  type BuyerChatTrailStep,
  type BuyerChatTrailStepId,
  type BuyerChatTrailStepState,
  type BuyerOrderLineRequest,
  type BuyerRetrievalMode,
  type BuyerSearchGroup,
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
  stripInternalListingMarkers,
  DEMO_HOTEL_SEED_MARKER,
  DEMO_INVENTORY_SEED_MARKER,
} from "./listing-display";
