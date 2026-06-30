const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;

export const LISTING_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export async function uploadListingImageToStorage(
  generateUploadUrl: () => Promise<string>,
  file: Blob,
  contentType: string,
): Promise<string> {
  if (!contentType.startsWith("image/")) {
    throw new Error("Listing photo must be an image");
  }

  if (file.size > MAX_LISTING_IMAGE_BYTES) {
    throw new Error("Listing photo must be 5 MB or smaller");
  }

  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Could not upload listing photo");
  }

  const payload = (await response.json()) as { storageId?: string };
  if (!payload.storageId) {
    throw new Error("Upload did not return a storage id");
  }

  return payload.storageId;
}
