"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  listingFormDefaults,
  parseListingForm,
  type ListingFormFieldErrors,
  type ListingFormInput,
  COUNTIES,
  CROP_TYPES,
} from "@repo/types";
import { Button, Input, Label, ListBox, Select } from "@heroui/react";
import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";

type ListingFormProps = {
  listingId?: Id<"listings">;
  initialValues?: ListingFormInput;
  onCancel?: () => void;
  onSubmitted: () => void;
};

export function ListingForm({
  initialValues,
  listingId,
  onCancel,
  onSubmitted,
}: ListingFormProps) {
  const createListing = useMutation(api.listings.createListing);
  const updateListing = useMutation(api.listings.updateListing);

  const defaults = initialValues ?? listingFormDefaults();
  const [crop, setCrop] = useState(defaults.crop);
  const [county, setCounty] = useState(defaults.county);
  const [quantityKg, setQuantityKg] = useState(
    defaults.quantityKg > 0 ? String(defaults.quantityKg) : "",
  );
  const [pricePerKg, setPricePerKg] = useState(
    defaults.pricePerKg > 0 ? String(defaults.pricePerKg) : "",
  );
  const [description, setDescription] = useState(defaults.description);
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const parsed = parseListingForm({
      crop,
      county,
      description,
      pricePerKg,
      quantityKg,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      if (listingId) {
        await updateListing({
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          listingId,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
        });
      } else {
        await createListing({
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
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

  return (
    <form
      className="flex flex-col gap-4 rounded-lg bg-surface p-6 text-surface-foreground shadow-sm dark:shadow-none"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {listingId ? "Edit listing" : "Create listing"}
        </h2>
        <p className="text-sm text-muted">
          Listings sync live across mobile and web.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Select
          aria-label="Crop"
          onSelectionChange={(key) => {
            if (key) {
              setCrop(String(key));
            }
          }}
          selectedKey={crop}
        >
          <Label>Crop</Label>
          <Select.Trigger>
            <Select.Value placeholder="Select crop" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CROP_TYPES.map((item) => (
                <ListBox.Item
                  id={item}
                  key={item}
                  textValue={item}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {fieldErrors.crop ? (
          <p className="text-sm text-danger">{fieldErrors.crop}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Quantity in kg"
            fullWidth
            onChange={(event) => setQuantityKg(event.target.value)}
            placeholder="Quantity (kg)"
            required
            type="number"
            value={quantityKg}
          />
          {fieldErrors.quantityKg ? (
            <p className="text-sm text-danger">{fieldErrors.quantityKg}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            aria-label="Price per kg"
            fullWidth
            onChange={(event) => setPricePerKg(event.target.value)}
            placeholder="Price per kg (KES)"
            required
            type="number"
            value={pricePerKg}
          />
          {fieldErrors.pricePerKg ? (
            <p className="text-sm text-danger">{fieldErrors.pricePerKg}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Select
          aria-label="County"
          onSelectionChange={(key) => {
            if (key) {
              setCounty(String(key));
            }
          }}
          selectedKey={county}
        >
          <Label>County</Label>
          <Select.Trigger>
            <Select.Value placeholder="Select county" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {COUNTIES.map((item) => (
                <ListBox.Item id={item} key={item} textValue={item}>
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
          aria-label="Description"
          fullWidth
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          required
          value={description}
        />
        {fieldErrors.description ? (
          <p className="text-sm text-danger">{fieldErrors.description}</p>
        ) : null}
      </div>

      {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}

      <div className="flex flex-wrap gap-3">
        {onCancel ? (
          <Button type="button" variant="secondary" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button isDisabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : listingId ? "Save changes" : "Create listing"}
        </Button>
      </div>
    </form>
  );
}
