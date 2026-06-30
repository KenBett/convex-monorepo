import { z } from "zod";

import { COUNTIES, CROP_TYPES } from "./marketplace";

export const listingFormSchema = z.object({
  crop: z.enum(CROP_TYPES, { message: "Select a crop" }),
  county: z.enum(COUNTIES, { message: "Select a county" }),
  description: z.string().trim().min(1, "Description is required"),
  grade: z.string().trim().optional(),
  pricePerKg: z.coerce.number().positive("Price must be a positive number"),
  quantityKg: z.coerce.number().positive("Quantity must be a positive number"),
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
    if (typeof field === "string" && errors[field as keyof ListingFormInput] === undefined) {
      errors[field as keyof ListingFormInput] = issue.message;
    }
  }

  return { success: false, errors };
}

export function listingFormDefaults(): ListingFormInput {
  return {
    crop: CROP_TYPES[0],
    county: COUNTIES[0],
    description: "",
    grade: "",
    pricePerKg: 0,
    quantityKg: 0,
  };
}

export const LISTING_FORM_STEP_COUNT = 3 as const;

export type ListingFormStep = 1 | 2 | 3;

export const LISTING_FORM_STEP_LABELS = [
  "Choose crop",
  "Listing details",
  "Review & create",
] as const;

const listingFormStepSchemas = {
  1: listingFormSchema.pick({ crop: true }),
  2: listingFormSchema.pick({
    county: true,
    pricePerKg: true,
    quantityKg: true,
  }),
  3: listingFormSchema.pick({ description: true, grade: true }),
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
