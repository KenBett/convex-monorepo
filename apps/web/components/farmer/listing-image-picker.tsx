"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { LISTING_IMAGE_ACCEPT, uploadListingImageToStorage } from "@repo/utils";
import { Button, Label } from "@heroui/react";
import clsx from "clsx";
import { useMutation } from "convex/react";
import {
  Camera,
  Check,
  CloudUpload,
  FileImage,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";

type ListingImagePickerProps = {
  error?: string;
  hideLabel?: boolean;
  initialPreviewUrl?: string | null;
  /** Temporary demo inventory console — uses demo upload URL mutation. */
  mode?: "farmer" | "demo";
  onChange: (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ) => void;
  value: Id<"_storage"> | null;
  variant?: "default" | "compact" | "cover";
};

type UploadStatus = "idle" | "uploading" | "complete" | "failed";

type PendingFile = {
  name: string;
  size: number;
  type: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtensionLabel(file: PendingFile): string {
  const fromName = file.name.split(".").pop()?.toUpperCase();

  if (fromName && fromName.length <= 4) {
    return fromName;
  }

  if (file.type === "image/jpeg") {
    return "JPEG";
  }

  if (file.type === "image/png") {
    return "PNG";
  }

  if (file.type === "image/webp") {
    return "WEBP";
  }

  return "IMG";
}

function getExtensionBadgeClass(label: string): string {
  switch (label) {
    case "PNG":
      return "bg-emerald-600";
    case "JPEG":
    case "JPG":
      return "bg-amber-600";
    case "WEBP":
      return "bg-sky-600";
    default:
      return "bg-neutral-500";
  }
}

function FileTypeIcon({ label }: { label: string }) {
  return (
    <div className="relative h-7 w-7 shrink-0">
      <div className="flex h-full w-full items-center justify-center rounded-md bg-default/60">
        <FileImage className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
      </div>
      <span
        className={clsx(
          "absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded px-0.5 py-px text-[8px] font-bold leading-none text-white",
          getExtensionBadgeClass(label),
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ListingImagePicker({
  error,
  hideLabel = false,
  initialPreviewUrl = null,
  mode = "farmer",
  onChange,
  value,
  variant = "default",
}: ListingImagePickerProps) {
  const generateFarmerUploadUrl = useMutation(
    api.listings.generateListingImageUploadUrl,
  );
  const generateDemoUploadUrl = useMutation(
    api.listings.demoInventory.generateUploadUrl,
  );
  const generateUploadUrl =
    mode === "demo" ? generateDemoUploadUrl : generateFarmerUploadUrl;
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPreviewUrl,
  );
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    value ? "complete" : "idle",
  );
  const [uploadProgress, setUploadProgress] = useState(value ? 100 : 0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => clearProgressTimer, []);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setFailedFile(null);
    setPendingFile({
      name: file.name,
      size: file.size,
      type: file.type || "image/jpeg",
    });
    setUploadStatus("uploading");
    setUploadProgress(8);
    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      setUploadProgress((current) => (current >= 92 ? current : current + 7));
    }, 180);

    try {
      const storageId = await uploadListingImageToStorage(
        () => generateUploadUrl(),
        file,
        file.type || "image/jpeg",
      );
      const nextPreviewUrl = URL.createObjectURL(file);

      clearProgressTimer();
      setUploadProgress(100);
      setUploadStatus("complete");
      setPreviewUrl(nextPreviewUrl);
      onChange(storageId as Id<"_storage">, nextPreviewUrl);
    } catch (uploadFailure) {
      clearProgressTimer();
      setUploadProgress(0);
      setUploadStatus("failed");
      setFailedFile(file);
      setUploadError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : "Could not upload listing photo",
      );
    }
  };

  const handleRemove = () => {
    clearProgressTimer();
    setPendingFile(null);
    setFailedFile(null);
    setPreviewUrl(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError(null);
    onChange(null, null);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleFile(file);
    }
  };

  const displayError = uploadError ?? error;
  const compact = variant === "compact";
  const cover = variant === "cover";
  const showFileCard =
    pendingFile !== null ||
    uploadStatus === "complete" ||
    uploadStatus === "failed" ||
    uploadStatus === "uploading";
  const fileMeta = pendingFile ?? {
    name: previewUrl ? "Listing photo" : "Photo",
    size: 0,
    type: "image/jpeg",
  };
  const extensionLabel = getFileExtensionLabel(fileMeta);

  if (cover) {
    return (
      <div className="relative">
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

        <button
          aria-label={previewUrl ? "Replace photo" : "Add photo"}
          className={clsx(
            "group relative block h-40 w-full overflow-hidden bg-surface-secondary sm:h-48",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
            uploadStatus === "uploading" && "pointer-events-none",
          )}
          disabled={uploadStatus === "uploading"}
          type="button"
          onClick={openFilePicker}
        >
          {previewUrl ? (
            <Image
              fill
              unoptimized
              alt="Listing preview"
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 720px"
              src={previewUrl}
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
              <ImagePlus className="h-7 w-7" strokeWidth={1.5} />
              <span className="text-sm font-medium">Add listing photo</span>
            </span>
          )}
          <span
            className={clsx(
              "absolute inset-0 flex items-end justify-end bg-linear-to-t from-black/45 via-transparent to-transparent p-3",
              "opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100",
            )}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm dark:bg-stone-900/95 dark:text-neutral-50">
              <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
              {uploadStatus === "uploading"
                ? "Uploading…"
                : previewUrl
                  ? "Change"
                  : "Add photo"}
            </span>
          </span>
        </button>

        {displayError ? (
          <p className="px-4 py-2 text-sm text-danger">{displayError}</p>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={clsx("flex flex-col gap-2", "min-w-0")}>
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

        {previewUrl && uploadStatus !== "uploading" ? (
          <button
            aria-label="Replace photo"
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-separator"
            type="button"
            onClick={openFilePicker}
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
          </button>
        ) : (
          <button
            className={clsx(
              "flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-separator bg-surface text-center transition-colors",
              "hover:border-accent/40 hover:bg-accent/5",
              uploadStatus === "uploading" && "pointer-events-none opacity-70",
            )}
            disabled={uploadStatus === "uploading"}
            type="button"
            onClick={openFilePicker}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-default/45">
              <ImagePlus className="h-4 w-4 text-muted" strokeWidth={1.75} />
            </div>
            <span className="text-xs text-muted">
              {uploadStatus === "uploading" ? "…" : "Add"}
            </span>
          </button>
        )}

        {displayError ? (
          <p className="text-sm text-danger">{displayError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!hideLabel ? <Label>Listing photo</Label> : null}

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

      <div
        className={clsx(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-separator bg-surface px-6 py-8 text-center transition-colors",
          uploadStatus !== "uploading" &&
            "hover:border-accent/35 hover:bg-accent/5",
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-default/50">
          <CloudUpload className="h-5 w-5 text-muted" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            Add a crop photo
          </p>
          <p className="text-xs text-muted">JPEG, PNG, or WebP up to 5 MB</p>
        </div>

        <Button
          isDisabled={uploadStatus === "uploading"}
          size="sm"
          type="button"
          variant="secondary"
          onPress={openFilePicker}
        >
          Add files
        </Button>
      </div>

      {showFileCard ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <div
            className={clsx(
              "relative overflow-hidden rounded-lg border bg-default/25",
              uploadStatus === "failed" && "border-danger/30 bg-danger/5",
            )}
          >
            <div className="flex items-center gap-2 px-2.5 py-2 pr-8">
              <FileTypeIcon label={extensionLabel} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {fileMeta.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] leading-none text-muted">
                  {fileMeta.size > 0 ? (
                    <>
                      <span>{formatFileSize(fileMeta.size)}</span>
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    {uploadStatus === "complete" ? (
                      <>
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-success text-success-foreground">
                          <Check className="h-2 w-2" strokeWidth={2.5} />
                        </span>
                        Complete
                      </>
                    ) : null}
                    {uploadStatus === "uploading" ? (
                      <>
                        <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-accent/20" />
                        Uploading
                      </>
                    ) : null}
                    {uploadStatus === "failed" ? (
                      <>
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-danger text-danger-foreground">
                          <X className="h-2 w-2" strokeWidth={2.5} />
                        </span>
                        Failed
                      </>
                    ) : null}
                  </span>
                </div>

                {uploadStatus === "failed" && failedFile ? (
                  <Button
                    className="mt-1.5 h-6 min-h-6 px-2 text-xs"
                    size="sm"
                    type="button"
                    variant="secondary"
                    onPress={() => {
                      void handleFile(failedFile);
                    }}
                  >
                    Try again
                  </Button>
                ) : null}
              </div>
            </div>

            <button
              aria-label="Remove photo"
              className="absolute right-1 top-1 rounded p-1 text-muted transition-colors hover:bg-default/60 hover:text-foreground"
              type="button"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>

            {uploadStatus !== "idle" ? (
              <div className="h-0.5 w-full bg-default/50">
                <div
                  className={clsx(
                    "h-full transition-[width] duration-200",
                    uploadStatus === "failed"
                      ? "bg-danger/70"
                      : uploadStatus === "complete"
                        ? "bg-success"
                        : "bg-accent",
                  )}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {displayError ? (
        <p className="text-sm text-danger">{displayError}</p>
      ) : null}
    </div>
  );
}
