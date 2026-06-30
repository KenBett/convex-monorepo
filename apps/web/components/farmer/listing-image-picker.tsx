"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { LISTING_IMAGE_ACCEPT, uploadListingImageToStorage } from "@repo/utils";
import { Button, Label } from "@heroui/react";
import clsx from "clsx";
import { useMutation } from "convex/react";
import { Camera, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type ListingImagePickerProps = {
  error?: string;
  hideLabel?: boolean;
  initialPreviewUrl?: string | null;
  onChange: (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ) => void;
  value: Id<"_storage"> | null;
  variant?: "default" | "compact";
};

export function ListingImagePicker({
  error,
  hideLabel = false,
  initialPreviewUrl = null,
  onChange,
  value,
  variant = "default",
}: ListingImagePickerProps) {
  const generateUploadUrl = useMutation(
    api.listings.generateListingImageUploadUrl,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPreviewUrl,
  );
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
  const compact = variant === "compact";

  return (
    <div className={clsx("flex flex-col gap-2", compact && "min-w-0")}>
      {!hideLabel ? <Label>{compact ? "Photo" : "Listing photo"}</Label> : null}
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
        compact ? (
          <button
            aria-label={isUploading ? "Uploading photo" : "Replace photo"}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-separator disabled:opacity-70"
            disabled={isUploading}
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <Image
              fill
              unoptimized
              alt="Listing preview"
              className="object-cover"
              sizes="64px"
              src={previewUrl}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="h-4 w-4 text-white" strokeWidth={1.75} />
            </span>
            {isUploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
                …
              </span>
            ) : null}
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-separator">
            <div className="relative h-40 w-full">
              <Image
                fill
                unoptimized
                alt="Listing preview"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
                src={previewUrl}
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
        )
      ) : (
        <button
          className={clsx(
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-separator bg-surface text-center transition-colors",
            compact ? "h-16 w-16 gap-1" : "h-40 w-full gap-2 px-4",
            "hover:border-accent/40 hover:bg-accent/5",
            isUploading && "pointer-events-none opacity-70",
          )}
          disabled={isUploading}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <div
            className={clsx(
              "flex items-center justify-center rounded-full bg-default/45",
              compact ? "h-8 w-8" : "h-10 w-10",
            )}
          >
            <ImagePlus
              className={compact ? "h-4 w-4 text-muted" : "h-5 w-5 text-muted"}
              strokeWidth={1.75}
            />
          </div>
          {!compact ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {isUploading ? "Uploading photo..." : "Add a crop photo"}
              </span>
              <span className="text-xs text-muted">
                JPEG, PNG, or WebP up to 5 MB
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted">
              {isUploading ? "…" : "Add"}
            </span>
          )}
        </button>
      )}

      {displayError ? (
        <p className="text-sm text-danger">{displayError}</p>
      ) : null}
    </div>
  );
}
