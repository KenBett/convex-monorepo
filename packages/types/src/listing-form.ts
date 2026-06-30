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
