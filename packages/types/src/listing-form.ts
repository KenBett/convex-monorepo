import { z } from "zod";

import {
  LISTING_CERTIFICATIONS,
  LISTING_PACKAGING,
  LISTING_TAGS,
} from "./listing-attributes";
import { COUNTIES, CROP_TYPES } from "./marketplace";

const optionalPositiveKg = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().positive("Must be a positive number").optional());

export const listingFormSchema = z.object({
  certifications: z.array(z.enum(LISTING_CERTIFICATIONS)).default([]),
  crop: z.enum(CROP_TYPES, { message: "Select a crop" }),
  county: z.enum(COUNTIES, { message: "Select a county" }),
  description: z.string().trim().min(1, "Description is required"),
  grade: z.string().trim().optional(),
  harvestWindowLabel: z.string().trim().optional(),
  imageStorageId: z.string().trim().min(1, "Listing photo is required"),
  minOrderKg: optionalPositiveKg,
  packaging: z.enum(LISTING_PACKAGING).optional(),
  packUnitKg: optionalPositiveKg,
  pricePerKg: z.coerce.number().positive("Price must be a positive number"),
  quantityKg: z.coerce.number().positive("Quantity must be a positive number"),
  sizeOrCalibre: z.string().trim().optional(),
  tags: z.array(z.enum(LISTING_TAGS)).default([]),
  variety: z.string().trim().optional(),
});

export type ListingFormInput = z.infer<typeof listingFormSchema>;

export type ListingFormFieldErrors = Partial<
  Record<keyof ListingFormInput, string>
>;

export function parseListingForm(
  input: Record<string, unknown>,
):
  | { success: true; data: ListingFormInput }
  | { success: false; errors: ListingFormFieldErrors } {
  const result = listingFormSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ListingFormFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      errors[field as keyof ListingFormInput] === undefined
    ) {
      errors[field as keyof ListingFormInput] = issue.message;
    }
  }

  return { success: false, errors };
}

export function listingFormDefaults(): ListingFormInput {
  return {
    certifications: [],
    crop: CROP_TYPES[0],
    county: COUNTIES[0],
    description: "",
    grade: "",
    harvestWindowLabel: "",
    imageStorageId: "",
    minOrderKg: undefined,
    packaging: undefined,
    packUnitKg: undefined,
    pricePerKg: 0,
    quantityKg: 0,
    sizeOrCalibre: "",
    tags: [],
    variety: "",
  };
}

export const LISTING_FORM_STEP_COUNT = 4 as const;

export type ListingFormStep = 1 | 2 | 3 | 4;

export const LISTING_FORM_STEP_LABELS = [
  "Choose crop",
  "Add photo",
  "Listing details",
  "Review & create",
] as const;

const listingFormStepSchemas = {
  1: listingFormSchema.pick({ crop: true }),
  2: listingFormSchema.pick({ imageStorageId: true }),
  3: listingFormSchema.pick({
    county: true,
    pricePerKg: true,
    quantityKg: true,
  }),
  4: listingFormSchema.pick({
    certifications: true,
    description: true,
    grade: true,
    harvestWindowLabel: true,
    minOrderKg: true,
    packaging: true,
    packUnitKg: true,
    sizeOrCalibre: true,
    tags: true,
    variety: true,
  }),
} as const;

export function validateListingFormStep(
  step: ListingFormStep,
  input: Record<string, unknown>,
):
  | { success: true }
  | { success: false; errors: ListingFormFieldErrors } {
  const result = listingFormStepSchemas[step].safeParse(input);
  if (result.success) {
    return { success: true };
  }

  const errors: ListingFormFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      errors[field as keyof ListingFormInput] === undefined
    ) {
      errors[field as keyof ListingFormInput] = issue.message;
    }
  }

  return { success: false, errors };
}
