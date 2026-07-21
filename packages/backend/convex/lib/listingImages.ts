import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function assertListingImageStorageId(
  ctx: MutationCtx,
  imageStorageId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.storage.getMetadata(imageStorageId);
  if (!metadata) {
    throw new Error("Listing photo is required");
  }

  if (!metadata.contentType?.startsWith("image/")) {
    throw new Error("Listing photo must be an image");
  }
}

export async function getListingImageUrl(
  ctx: QueryCtx,
  imageStorageId: Id<"_storage"> | undefined,
): Promise<string | null> {
  if (!imageStorageId) {
    return null;
  }

  return await ctx.storage.getUrl(imageStorageId);
}

/** Minimal 1×1 PNG for internal test listings. */
export const PLACEHOLDER_PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);
