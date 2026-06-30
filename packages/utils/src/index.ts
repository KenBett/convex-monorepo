// TODO: Add clsx and tailwind-merge for proper class merging
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  MARKETPLACE_ROLES,
  farmerListingDetailHref,
  farmerListingDetailPath,
  getInitials,
  roleHomeSegment,
} from "./marketplace-routing";
export {
  LISTING_IMAGE_ACCEPT,
  uploadListingImageToStorage,
} from "./listing-image-upload";
