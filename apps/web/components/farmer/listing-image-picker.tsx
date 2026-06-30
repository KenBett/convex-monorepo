"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { LISTING_IMAGE_ACCEPT, uploadListingImageToStorage } from "@repo/utils";
import { Button, Label } from "@heroui/react";
import clsx from "clsx";
import { useMutation } from "convex/react";
import { Camera, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type ListingImagePickerProps = {
  error?: string;
  initialPreviewUrl?: string | null;
  onChange: (storageId: Id<"_storage"> | null, previewUrl: string | null) => void;
  value: Id<"_storage"> | null;
};

export function ListingImagePicker({
  error,
  initialPreviewUrl = null,
  onChange,
  value,
}: ListingImagePickerProps) {
  const generateUploadUrl = useMutation(api.listings.generateListingImageUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const storageId = await uploadListingImageToStorage(
        () => generateUploadUrl(),
        file,
        file.type || "image/jpeg",
      );
      const nextPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(nextPreviewUrl);
      onChange(storageId as Id<"_storage">, nextPreviewUrl);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : "Could not upload listing photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const displayError = uploadError ?? error;

  return (
    <div className="flex flex-col gap-2">
      <Label>Listing photo</Label>
      <input
        ref={inputRef}
        accept={LISTING_IMAGE_ACCEPT}
        className="sr-only"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-separator">
          <div className="relative aspect-[4/3] w-full">
            <Image
              alt="Listing preview"
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              src={previewUrl}
              unoptimized
            />
          </div>
          <div className="flex gap-2 border-t border-separator bg-surface p-3">
            <Button
              isDisabled={isUploading}
              size="sm"
              type="button"
              variant="secondary"
              onPress={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" strokeWidth={1.75} />
              {isUploading ? "Uploading..." : "Replace photo"}
            </Button>
            {!value ? (
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onPress={() => {
                  setPreviewUrl(null);
                  onChange(null, null);
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          className={clsx(
            "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-separator bg-surface px-4 text-center transition-colors",
            "hover:border-accent/40 hover:bg-accent/5",
            isUploading && "pointer-events-none opacity-70",
          )}
          disabled={isUploading}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-default/45">
            <ImagePlus className="h-5 w-5 text-muted" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {isUploading ? "Uploading photo..." : "Add a crop photo"}
            </span>
            <span className="text-xs text-muted">JPEG, PNG, or WebP up to 5 MB</span>
          </div>
        </button>
      )}

      {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}
    </div>
  );
}
