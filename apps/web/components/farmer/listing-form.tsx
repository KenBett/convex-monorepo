"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import {
  COUNTIES,
  getCropTheme,
  getListingCardBgClass,
  LISTING_FORM_STEP_COUNT,
  LISTING_FORM_STEP_LABELS,
  listingFormDefaults,
  parseListingForm,
  validateListingFormStep,
  type CropType,
  type County,
  type ListingFormFieldErrors,
  type ListingFormInput,
  type ListingFormStep,
} from "@repo/types";
import { Button, Input, Label, ListBox, Select } from "@heroui/react";
import clsx from "clsx";
import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";

import { ListingImagePicker } from "@/components/farmer/listing-image-picker";
import { CropBadge, CropPickerGrid } from "@/components/farmer/crop-display";

type ListingFormProps = {
  embedded?: boolean;
  listingId?: Id<"listings">;
  initialValues?: ListingFormInput;
  initialImageUrl?: string | null;
  onCancel?: () => void;
  onSubmitted: () => void;
};

function StepIndicator({ step }: { step: ListingFormStep }) {
  return (
    <div
      aria-label={`Step ${step} of ${LISTING_FORM_STEP_COUNT}`}
      aria-valuemax={LISTING_FORM_STEP_COUNT}
      aria-valuemin={1}
      aria-valuenow={step}
      className="flex flex-col gap-2"
      role="progressbar"
    >
      <div className="flex gap-1.5">
        {Array.from({ length: LISTING_FORM_STEP_COUNT }, (_, index) => {
          const stepNumber = (index + 1) as ListingFormStep;

          return (
            <div
              key={stepNumber}
              className={clsx(
                "h-1 flex-1 rounded-full transition-colors duration-200",
                stepNumber <= step ? "bg-accent" : "bg-separator",
              )}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Step {step} of {LISTING_FORM_STEP_COUNT} ·{" "}
        {LISTING_FORM_STEP_LABELS[step - 1]}
      </p>
    </div>
  );
}

type ReviewSummaryProps = {
  county: string;
  crop: CropType;
  description: string;
  grade: string;
  imagePreviewUrl: string | null;
  pricePerKg: string;
  quantityKg: string;
};

function ListingReviewSummary({
  county,
  crop,
  description,
  grade,
  imagePreviewUrl,
  pricePerKg,
  quantityKg,
}: ReviewSummaryProps) {
  const theme = getCropTheme(crop);
  const bgClass = getListingCardBgClass(crop);
  const trimmedDescription = description.trim();
  const parsedQuantity = Number(quantityKg);
  const parsedPrice = Number(pricePerKg);

  return (
    <div className="flex flex-col gap-2">
      <Label>Review your listing</Label>
      <div
        className={clsx(
          "flex flex-col gap-3 overflow-hidden rounded-xl shadow-sm",
          bgClass,
        )}
      >
        {imagePreviewUrl ? (
          <div className="relative h-32 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${theme.label} preview`}
              className="h-full w-full object-cover"
              src={imagePreviewUrl}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 p-4 pt-0">
          <div className="flex items-center gap-2.5">
            <CropBadge crop={crop} size="md" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {theme.label}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {Number.isFinite(parsedPrice) && parsedPrice > 0
                ? `KES ${parsedPrice}`
                : "—"}
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                /kg
              </span>
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {Number.isFinite(parsedQuantity) && parsedQuantity > 0
                ? `${parsedQuantity} kg`
                : "—"}
            </p>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {county}
            {grade.trim() ? ` · ${grade.trim()}` : ""}
          </p>

          {trimmedDescription.length > 0 ? (
            <p className="border-l-2 border-neutral-300/60 pl-2.5 text-xs italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400">
              &ldquo;{trimmedDescription}&rdquo;
            </p>
          ) : (
            <p className="text-xs italic text-neutral-500 dark:text-neutral-500">
              No description yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type FormFieldsProps = {
  county: County;
  crop: CropType;
  description: string;
  fieldErrors: ListingFormFieldErrors;
  grade: string;
  imagePreviewUrl: string | null;
  imageStorageId: Id<"_storage"> | null;
  onCountyChange: (county: County) => void;
  onCropChange: (crop: CropType) => void;
  onDescriptionChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onImageChange: (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ) => void;
  onPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  pricePerKg: string;
  quantityKg: string;
  cropPickerVariant?: "compact" | "expanded";
  showReview?: boolean;
};

function ListingFormFields({
  county,
  crop,
  cropPickerVariant = "compact",
  description,
  fieldErrors,
  grade,
  imagePreviewUrl,
  imageStorageId,
  onCountyChange,
  onCropChange,
  onDescriptionChange,
  onGradeChange,
  onImageChange,
  onPriceChange,
  onQuantityChange,
  pricePerKg,
  quantityKg,
  showReview = false,
}: FormFieldsProps) {
  return (
    <>
      <CropPickerGrid
        error={fieldErrors.crop}
        value={crop}
        variant={cropPickerVariant}
        onChange={onCropChange}
      />

      <ListingImagePicker
        error={fieldErrors.imageStorageId}
        initialPreviewUrl={imagePreviewUrl}
        value={imageStorageId}
        onChange={onImageChange}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Input
            fullWidth
            required
            aria-label="Quantity in kg"
            placeholder="Quantity (kg)"
            type="number"
            value={quantityKg}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
          {fieldErrors.quantityKg ? (
            <p className="text-sm text-danger">{fieldErrors.quantityKg}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            fullWidth
            required
            aria-label="Price per kg"
            placeholder="Price per kg (KES)"
            type="number"
            value={pricePerKg}
            onChange={(event) => onPriceChange(event.target.value)}
          />
          {fieldErrors.pricePerKg ? (
            <p className="text-sm text-danger">{fieldErrors.pricePerKg}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Select
          aria-label="County"
          placeholder="Select county"
          selectedKey={county}
          onSelectionChange={(key) => {
            if (key) {
              onCountyChange(String(key) as County);
            }
          }}
        >
          <Label>County</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {COUNTIES.map((item) => (
                <ListBox.Item key={item} id={item} textValue={item}>
                  {item}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {fieldErrors.county ? (
          <p className="text-sm text-danger">{fieldErrors.county}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Input
          fullWidth
          aria-label="Grade"
          placeholder="Grade (optional, e.g. Grade 1)"
          value={grade}
          onChange={(event) => onGradeChange(event.target.value)}
        />
        {fieldErrors.grade ? (
          <p className="text-sm text-danger">{fieldErrors.grade}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Input
          fullWidth
          required
          aria-label="Description"
          placeholder="Description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        {fieldErrors.description ? (
          <p className="text-sm text-danger">{fieldErrors.description}</p>
        ) : null}
      </div>

      {showReview ? (
        <ListingReviewSummary
          county={county}
          crop={crop}
          description={description}
          grade={grade}
          imagePreviewUrl={imagePreviewUrl}
          pricePerKg={pricePerKg}
          quantityKg={quantityKg}
        />
      ) : null}
    </>
  );
}

export function ListingForm({
  embedded = false,
  initialValues,
  initialImageUrl = null,
  listingId,
  onCancel,
  onSubmitted,
}: ListingFormProps) {
  const createListing = useMutation(api.listings.createListing);
  const updateListing = useMutation(api.listings.updateListing);
  const useWizard = !listingId && embedded;

  const defaults = initialValues ?? listingFormDefaults();
  const [step, setStep] = useState<ListingFormStep>(1);
  const [crop, setCrop] = useState<CropType>(defaults.crop);
  const [county, setCounty] = useState(defaults.county);
  const [quantityKg, setQuantityKg] = useState(
    defaults.quantityKg > 0 ? String(defaults.quantityKg) : "",
  );
  const [pricePerKg, setPricePerKg] = useState(
    defaults.pricePerKg > 0 ? String(defaults.pricePerKg) : "",
  );
  const [description, setDescription] = useState(defaults.description);
  const [grade, setGrade] = useState(defaults.grade ?? "");
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(
    defaults.imageStorageId
      ? (defaults.imageStorageId as Id<"_storage">)
      : null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialImageUrl,
  );
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = {
    crop,
    county,
    description,
    grade,
    imageStorageId: imageStorageId ?? "",
    pricePerKg,
    quantityKg,
  };

  const handleImageChange = (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ) => {
    setImageStorageId(storageId);
    setImagePreviewUrl(previewUrl);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSubmitError(null);

    const parsed = parseListingForm(formValues);

    if (!parsed.success) {
      setFieldErrors(parsed.errors);

      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const gradeValue = parsed.data.grade?.trim() || undefined;

      if (listingId) {
        await updateListing({
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue ?? "",
          imageStorageId: imageStorageId ?? undefined,
          listingId,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
        });
      } else {
        if (!imageStorageId) {
          setFieldErrors({ imageStorageId: "Listing photo is required" });

          return;
        }

        await createListing({
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue,
          imageStorageId,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
        });
      }
      onSubmitted();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save listing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setSubmitError(null);
    const result = validateListingFormStep(step, formValues);

    if (!result.success) {
      setFieldErrors(result.errors);

      return;
    }

    setFieldErrors({});
    setStep((current) => Math.min(current + 1, 3) as ListingFormStep);
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 1) as ListingFormStep);
  };

  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col gap-5"
    : "flex flex-col gap-5 rounded-lg bg-surface p-6 text-surface-foreground shadow-sm dark:shadow-none";

  if (!useWizard) {
    return (
      <form
        className={shellClass}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <h2 className="text-lg font-semibold tracking-tight">
          {listingId ? "Edit listing" : "Create listing"}
        </h2>

        <ListingFormFields
          county={county}
          crop={crop}
          description={description}
          fieldErrors={fieldErrors}
          grade={grade}
          imagePreviewUrl={imagePreviewUrl}
          imageStorageId={imageStorageId}
          pricePerKg={pricePerKg}
          quantityKg={quantityKg}
          onCountyChange={setCounty}
          onCropChange={setCrop}
          onDescriptionChange={setDescription}
          onGradeChange={setGrade}
          onImageChange={handleImageChange}
          onPriceChange={setPricePerKg}
          onQuantityChange={setQuantityKg}
        />

        {submitError ? (
          <p className="text-sm text-danger">{submitError}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {onCancel ? (
            <Button type="button" variant="secondary" onPress={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button isDisabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Saving..."
              : listingId
                ? "Save changes"
                : "Create listing"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={shellClass}>
      <div className="shrink-0">
        <h2 className="text-lg font-semibold tracking-tight">Create listing</h2>
      </div>

      <div className="shrink-0">
        <StepIndicator step={step} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-medium text-foreground">
              What are you selling?
            </h3>
            <CropPickerGrid
              error={fieldErrors.crop}
              value={crop}
              variant="expanded"
              onChange={setCrop}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-medium text-foreground">
              Listing details
            </h3>

            <ListingImagePicker
              hideLabel
              error={fieldErrors.imageStorageId}
              initialPreviewUrl={imagePreviewUrl}
              value={imageStorageId}
              onChange={handleImageChange}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Input
                  fullWidth
                  required
                  aria-label="Quantity in kg"
                  placeholder="Quantity (kg)"
                  type="number"
                  value={quantityKg}
                  onChange={(event) => setQuantityKg(event.target.value)}
                />
                {fieldErrors.quantityKg ? (
                  <p className="text-sm text-danger">
                    {fieldErrors.quantityKg}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  fullWidth
                  required
                  aria-label="Price per kg"
                  placeholder="Price per kg (KES)"
                  type="number"
                  value={pricePerKg}
                  onChange={(event) => setPricePerKg(event.target.value)}
                />
                {fieldErrors.pricePerKg ? (
                  <p className="text-sm text-danger">
                    {fieldErrors.pricePerKg}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Select
                aria-label="County"
                placeholder="Select county"
                selectedKey={county}
                onSelectionChange={(key) => {
                  if (key) {
                    setCounty(String(key) as County);
                  }
                }}
              >
                <Label>County</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {COUNTIES.map((item) => (
                      <ListBox.Item key={item} id={item} textValue={item}>
                        {item}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {fieldErrors.county ? (
                <p className="text-sm text-danger">{fieldErrors.county}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-medium text-foreground">
                Final details
              </h3>
              <p className="text-sm text-muted">
                Add optional grade info and a description, then review before
                posting.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Input
                fullWidth
                aria-label="Grade"
                placeholder="Grade (optional, e.g. Grade 1)"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
              />
              {fieldErrors.grade ? (
                <p className="text-sm text-danger">{fieldErrors.grade}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Input
                fullWidth
                required
                aria-label="Description"
                placeholder="Describe quality, harvest timing, delivery options..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {fieldErrors.description ? (
                <p className="text-sm text-danger">{fieldErrors.description}</p>
              ) : null}
            </div>

            <ListingReviewSummary
              county={county}
              crop={crop}
              description={description}
              grade={grade}
              imagePreviewUrl={imagePreviewUrl}
              pricePerKg={pricePerKg}
              quantityKg={quantityKg}
            />
          </div>
        ) : null}

        {submitError ? (
          <p className="text-sm text-danger">{submitError}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-separator pt-4">
        {step === 1 ? (
          onCancel ? (
            <Button
              className="flex-1"
              type="button"
              variant="secondary"
              onPress={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <div className="flex-1" />
          )
        ) : (
          <Button
            className="flex-1"
            type="button"
            variant="secondary"
            onPress={handleBack}
          >
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button className="flex-1" type="button" onPress={handleNext}>
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1"
            isDisabled={isSubmitting}
            type="button"
            onPress={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Creating..." : "Create listing"}
          </Button>
        )}
      </div>
    </div>
  );
}
