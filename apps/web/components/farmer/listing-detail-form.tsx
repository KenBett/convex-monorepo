"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import {
  COUNTIES,
  CROP_TYPES,
  formatHarvestWindowLabel,
  formatListingStatus,
  getCropTheme,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  listingGradeOptions,
  type County,
  type CropType,
  type ListingPackaging,
  type ListingStatus,
} from "@repo/types";
import { useMutation } from "convex/react";
import clsx from "clsx";
import { Button, Input, ListBox, Select, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CropLabel } from "@/components/farmer/crop-display";
import { ListingImagePicker } from "@/components/farmer/listing-image-picker";

type ListingSummary = {
  _creationTime: number;
  _id: Id<"listings">;
  certifications?: string[];
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageStorageId: Id<"_storage"> | undefined;
  imageUrl: string | null;
  minOrderKg?: number;
  packaging?: string;
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  status: ListingStatus;
  tags?: string[];
  variety?: string;
};

type ListingDetailFormProps = {
  /** Temporary demo inventory console. */
  listPath?: string;
  listing: ListingSummary;
  mode?: "farmer" | "demo";
};

type EditableField =
  | "crop"
  | "pricePerKg"
  | "quantityKg"
  | "county"
  | "grade"
  | "sizeOrCalibre"
  | "minOrderKg"
  | "packUnitKg"
  | "variety"
  | "packaging"
  | "harvestWindowLabel"
  | "description";

const PANEL =
  "overflow-hidden rounded-[0.875rem] bg-surface text-surface-foreground shadow-sm dark:shadow-none";

const CHIP_IDLE =
  "rounded-full bg-background shadow-sm dark:bg-default dark:shadow-none";
const CHIP_SELECTED =
  "rounded-full bg-foreground text-background shadow-sm dark:bg-accent dark:text-accent-foreground dark:shadow-none";

const EDIT_FIELD_CLASS = clsx(
  "rounded-lg bg-field-background shadow-sm",
  "border-0 outline-none ring-0",
  "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
  "dark:border dark:border-separator dark:shadow-[0_1px_3px_oklch(0%_0_0/0.24)]",
  "dark:focus-visible:ring-2 dark:focus-visible:ring-accent/30",
);

function FieldRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5 border-b border-separator py-3.5 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <p className="pt-0.5 text-sm text-muted">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ClickToEdit({
  ariaLabel,
  children,
  className,
  editing,
  input,
  onStartEdit,
  placeholder = false,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  editing: boolean;
  input: ReactNode;
  onStartEdit: () => void;
  placeholder?: boolean;
}) {
  if (editing) {
    return <div className={clsx("w-full", className)}>{input}</div>;
  }

  return (
    <button
      aria-label={`Edit ${ariaLabel}`}
      className={clsx(
        "w-full rounded-lg text-left transition-colors",
        "-mx-2 px-2 py-1 hover:bg-surface-secondary/80 focus-visible:bg-surface-secondary/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
        className,
      )}
      type="button"
      onClick={onStartEdit}
    >
      <span className={clsx(placeholder && "text-muted")}>{children}</span>
    </button>
  );
}

function useDebouncedSave(delayMs: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounce = useCallback(
    (callback: () => void) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(callback, delayMs);
    },
    [delayMs],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return debounce;
}

export function ListingDetailForm({
  listPath = "/farmer/my-products",
  listing,
  mode = "farmer",
}: ListingDetailFormProps) {
  const router = useRouter();
  const updateFarmerListing = useMutation(api.listings.updateListing);
  const updateFarmerListingStatus = useMutation(
    api.listings.updateListingStatus,
  );
  const deleteFarmerListing = useMutation(api.listings.deleteListing);
  const updateDemoListing = useMutation(api.listings.demoInventory.update);
  const updateDemoListingStatus = useMutation(
    api.listings.demoInventory.updateStatus,
  );
  const deleteDemoListing = useMutation(api.listings.demoInventory.remove);
  const updateListing =
    mode === "demo" ? updateDemoListing : updateFarmerListing;
  const updateListingStatus =
    mode === "demo" ? updateDemoListingStatus : updateFarmerListingStatus;
  const deleteListing =
    mode === "demo" ? deleteDemoListing : deleteFarmerListing;
  const deleteModalState = useOverlayState();

  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [priceDraft, setPriceDraft] = useState(String(listing.pricePerKg));
  const [quantityDraft, setQuantityDraft] = useState(
    String(listing.quantityKg),
  );
  const [gradeDraft, setGradeDraft] = useState(listing.grade ?? "");
  const [sizeOrCalibreDraft, setSizeOrCalibreDraft] = useState(
    listing.sizeOrCalibre ?? "",
  );
  const [minOrderDraft, setMinOrderDraft] = useState(
    listing.minOrderKg != null ? String(listing.minOrderKg) : "",
  );
  const [packUnitDraft, setPackUnitDraft] = useState(
    listing.packUnitKg != null ? String(listing.packUnitKg) : "",
  );
  const [varietyDraft, setVarietyDraft] = useState(listing.variety ?? "");
  const [packagingDraft, setPackagingDraft] = useState(listing.packaging ?? "");
  const [harvestDraft, setHarvestDraft] = useState(
    listing.harvestWindowLabel ?? "",
  );
  const [descriptionDraft, setDescriptionDraft] = useState(listing.description);

  const debouncedSave = useDebouncedSave(400);

  useEffect(() => {
    if (activeField !== "pricePerKg") {
      setPriceDraft(String(listing.pricePerKg));
    }
    if (activeField !== "quantityKg") {
      setQuantityDraft(String(listing.quantityKg));
    }
    if (activeField !== "grade") {
      setGradeDraft(listing.grade ?? "");
    }
    if (activeField !== "sizeOrCalibre") {
      setSizeOrCalibreDraft(listing.sizeOrCalibre ?? "");
    }
    if (activeField !== "minOrderKg") {
      setMinOrderDraft(
        listing.minOrderKg != null ? String(listing.minOrderKg) : "",
      );
    }
    if (activeField !== "packUnitKg") {
      setPackUnitDraft(
        listing.packUnitKg != null ? String(listing.packUnitKg) : "",
      );
    }
    if (activeField !== "variety") {
      setVarietyDraft(listing.variety ?? "");
    }
    if (activeField !== "packaging") {
      setPackagingDraft(listing.packaging ?? "");
    }
    if (activeField !== "harvestWindowLabel") {
      setHarvestDraft(listing.harvestWindowLabel ?? "");
    }
    if (activeField !== "description") {
      setDescriptionDraft(listing.description);
    }
  }, [listing, activeField]);

  const saveListingField = useCallback(
    async (
      updates: Parameters<typeof updateListing>[0],
      options?: { closeField?: EditableField },
    ) => {
      setSaveError(null);
      try {
        await updateListing(updates);
        if (options?.closeField) {
          setActiveField((current) =>
            current === options.closeField ? null : current,
          );
        }
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Could not save changes.",
        );
      }
    },
    [updateListing],
  );

  const saveNumberField = (
    field: "pricePerKg" | "quantityKg",
    rawValue: string,
  ) => {
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const current =
      field === "pricePerKg" ? listing.pricePerKg : listing.quantityKg;

    if (parsed === current) {
      return;
    }

    void saveListingField({
      listingId: listing._id,
      [field]: parsed,
    });
  };

  const saveOptionalNumberField = (
    field: "minOrderKg" | "packUnitKg",
    rawValue: string,
  ) => {
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      const current =
        field === "minOrderKg" ? listing.minOrderKg : listing.packUnitKg;

      if (current == null) {
        return;
      }
      void saveListingField({
        listingId: listing._id,
        [field]: null,
      });

      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const current =
      field === "minOrderKg" ? listing.minOrderKg : listing.packUnitKg;

    if (parsed === current) {
      return;
    }

    void saveListingField({
      listingId: listing._id,
      [field]: parsed,
    });
  };

  const handleSoldOutChange = async (checked: boolean) => {
    setSaveError(null);
    setIsSavingStatus(true);
    try {
      await updateListingStatus({ listingId: listing._id, soldOut: checked });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not update listing status.",
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteListing({ listingId: listing._id });
      deleteModalState.close();
      router.push(listPath);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete listing.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isSoldOut = listing.status === "sold_out";
  const isExpired = listing.status === "expired";
  const createdAt = new Date(listing._creationTime).toLocaleDateString(
    undefined,
    {
      dateStyle: "medium",
    },
  );

  return (
    <>
      <Modal state={deleteModalState}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="p-6">
              <Modal.Header className="flex flex-col gap-1 border-0 p-0 pb-4">
                <Modal.Heading className="text-lg font-semibold">
                  Delete listing?
                </Modal.Heading>
                <p className="text-sm text-muted">
                  Are you sure you want to delete this{" "}
                  {getCropTheme(listing.crop).label} listing? This cannot be
                  undone.
                </p>
              </Modal.Header>
              <Modal.Body className="gap-0 p-0">
                {deleteError ? (
                  <p className="pb-4 text-sm text-danger">{deleteError}</p>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2 border-0 p-0 pt-4">
                <Button
                  isDisabled={isDeleting}
                  type="button"
                  variant="secondary"
                  onPress={deleteModalState.close}
                >
                  Cancel
                </Button>
                <Button
                  isDisabled={isDeleting}
                  type="button"
                  variant="danger"
                  onPress={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete listing"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <form
        className="mx-auto flex w-full max-w-2xl flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <section className={PANEL}>
          <ListingImagePicker
            hideLabel
            initialPreviewUrl={listing.imageUrl}
            mode={mode}
            value={listing.imageStorageId ?? null}
            variant="cover"
            onChange={(storageId) => {
              if (!storageId) {
                return;
              }
              void saveListingField({
                listingId: listing._id,
                imageStorageId: storageId,
              });
            }}
          />

          <div className="flex flex-col gap-4 px-4 pb-5 pt-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <ClickToEdit
                  ariaLabel="product"
                  editing={activeField === "crop"}
                  input={
                    <Select
                      aria-label="Product"
                      isDisabled={isExpired}
                      placeholder="Select product"
                      selectedKey={listing.crop}
                      onSelectionChange={(key) => {
                        if (!key || key === listing.crop) {
                          setActiveField(null);

                          return;
                        }
                        void saveListingField(
                          {
                            listingId: listing._id,
                            crop: String(key) as CropType,
                          },
                          { closeField: "crop" },
                        );
                      }}
                    >
                      <Select.Trigger
                        className={clsx("w-full", EDIT_FIELD_CLASS)}
                      >
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {CROP_TYPES.map((crop) => (
                            <ListBox.Item
                              key={crop}
                              id={crop}
                              textValue={getCropTheme(crop).label}
                            >
                              <CropLabel crop={crop} />
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  }
                  onStartEdit={() => setActiveField("crop")}
                >
                  <span className="inline-flex items-center gap-2">
                    <CropLabel crop={listing.crop} />
                  </span>
                </ClickToEdit>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <ClickToEdit
                    ariaLabel="county"
                    className="mx-0 inline-flex px-1 py-0.5"
                    editing={activeField === "county"}
                    input={
                      <Select
                        aria-label="County"
                        placeholder="Select county"
                        selectedKey={listing.county}
                        onSelectionChange={(key) => {
                          if (!key || key === listing.county) {
                            setActiveField(null);

                            return;
                          }
                          void saveListingField(
                            {
                              listingId: listing._id,
                              county: String(key) as County,
                            },
                            { closeField: "county" },
                          );
                        }}
                      >
                        <Select.Trigger
                          className={clsx("w-full", EDIT_FIELD_CLASS)}
                        >
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {COUNTIES.map((county) => (
                              <ListBox.Item
                                key={county}
                                id={county}
                                textValue={county}
                              >
                                {county}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    }
                    onStartEdit={() => setActiveField("county")}
                  >
                    {listing.county}
                  </ClickToEdit>
                  <span aria-hidden>·</span>
                  <span>{formatListingStatus(listing.status)}</span>
                  <span aria-hidden>·</span>
                  <span>Listed {createdAt}</span>
                </div>
              </div>

              <label className="inline-flex shrink-0 items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm shadow-sm dark:bg-default dark:shadow-none">
                <input
                  checked={isSoldOut}
                  className="h-3.5 w-3.5 rounded border-separator accent-accent"
                  disabled={isExpired || isSavingStatus}
                  type="checkbox"
                  onChange={(event) => {
                    void handleSoldOutChange(event.target.checked);
                  }}
                />
                Sold out
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ClickToEdit
                ariaLabel="price per kg"
                className="rounded-[0.75rem] bg-background px-3 py-3 shadow-sm dark:bg-default dark:shadow-none"
                editing={activeField === "pricePerKg"}
                input={
                  <Input
                    autoFocus
                    fullWidth
                    aria-label="Price per kg"
                    className={EDIT_FIELD_CLASS}
                    inputMode="decimal"
                    type="number"
                    value={priceDraft}
                    onBlur={() => {
                      saveNumberField("pricePerKg", priceDraft);
                      setActiveField(null);
                    }}
                    onChange={(event) => {
                      const next = event.target.value;

                      setPriceDraft(next);
                      debouncedSave(() => {
                        saveNumberField("pricePerKg", next);
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        setPriceDraft(String(listing.pricePerKg));
                        setActiveField(null);
                      }
                    }}
                  />
                }
                onStartEdit={() => setActiveField("pricePerKg")}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Price
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  KES {listing.pricePerKg}
                  <span className="text-sm font-medium text-muted">/kg</span>
                </p>
              </ClickToEdit>

              <ClickToEdit
                ariaLabel="quantity"
                className="rounded-[0.75rem] bg-background px-3 py-3 shadow-sm dark:bg-default dark:shadow-none"
                editing={activeField === "quantityKg"}
                input={
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      aria-label="Quantity in kg"
                      className={clsx("w-full", EDIT_FIELD_CLASS)}
                      inputMode="decimal"
                      type="number"
                      value={quantityDraft}
                      onBlur={() => {
                        saveNumberField("quantityKg", quantityDraft);
                        setActiveField(null);
                      }}
                      onChange={(event) => {
                        const next = event.target.value;

                        setQuantityDraft(next);
                        debouncedSave(() => {
                          saveNumberField("quantityKg", next);
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                        if (event.key === "Escape") {
                          setQuantityDraft(String(listing.quantityKg));
                          setActiveField(null);
                        }
                      }}
                    />
                    <span className="text-sm text-muted">kg</span>
                  </div>
                }
                onStartEdit={() => setActiveField("quantityKg")}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Quantity
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {listing.quantityKg}
                  <span className="text-sm font-medium text-muted"> kg</span>
                </p>
              </ClickToEdit>
            </div>
          </div>
        </section>

        <section className={clsx(PANEL, "px-4 sm:px-5")}>
          <FieldRow label="Variety">
            <ClickToEdit
              ariaLabel="variety"
              editing={activeField === "variety"}
              input={
                <Input
                  autoFocus
                  fullWidth
                  aria-label="Variety"
                  className={EDIT_FIELD_CLASS}
                  placeholder="e.g. H614, Duma 43"
                  value={varietyDraft}
                  onBlur={() => {
                    void saveListingField(
                      {
                        listingId: listing._id,
                        variety: varietyDraft,
                      },
                      { closeField: "variety" },
                    );
                  }}
                  onChange={(event) => {
                    const next = event.target.value;

                    setVarietyDraft(next);
                    debouncedSave(() => {
                      void saveListingField({
                        listingId: listing._id,
                        variety: next,
                      });
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setVarietyDraft(listing.variety ?? "");
                      setActiveField(null);
                    }
                  }}
                />
              }
              placeholder={!listing.variety?.trim()}
              onStartEdit={() => setActiveField("variety")}
            >
              <p className="text-base text-foreground">
                {listing.variety?.trim() || "Add variety"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Grade">
            <ClickToEdit
              ariaLabel="grade"
              editing={activeField === "grade"}
              input={
                <div className="flex flex-wrap gap-2 py-1">
                  {listingGradeOptions(gradeDraft).map((item) => {
                    const selected = gradeDraft === item;

                    return (
                      <Button
                        key={item}
                        className={selected ? CHIP_SELECTED : CHIP_IDLE}
                        size="sm"
                        type="button"
                        variant={selected ? "primary" : "secondary"}
                        onPress={() => {
                          const next = selected ? "" : item;

                          setGradeDraft(next);
                          void saveListingField(
                            {
                              listingId: listing._id,
                              grade: next,
                            },
                            { closeField: "grade" },
                          );
                        }}
                      >
                        {item}
                      </Button>
                    );
                  })}
                </div>
              }
              placeholder={!listing.grade?.trim()}
              onStartEdit={() => setActiveField("grade")}
            >
              <p className="text-base text-foreground">
                {listing.grade?.trim() || "Add grade"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Size">
            <ClickToEdit
              ariaLabel="size or calibre"
              editing={activeField === "sizeOrCalibre"}
              input={
                <Input
                  autoFocus
                  fullWidth
                  aria-label="Size or calibre"
                  className={EDIT_FIELD_CLASS}
                  placeholder="e.g. 18 count, 45–65 mm"
                  value={sizeOrCalibreDraft}
                  onBlur={() => {
                    void saveListingField(
                      {
                        listingId: listing._id,
                        sizeOrCalibre: sizeOrCalibreDraft,
                      },
                      { closeField: "sizeOrCalibre" },
                    );
                  }}
                  onChange={(event) => {
                    const next = event.target.value;

                    setSizeOrCalibreDraft(next);
                    debouncedSave(() => {
                      void saveListingField({
                        listingId: listing._id,
                        sizeOrCalibre: next,
                      });
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setSizeOrCalibreDraft(listing.sizeOrCalibre ?? "");
                      setActiveField(null);
                    }
                  }}
                />
              }
              placeholder={!listing.sizeOrCalibre?.trim()}
              onStartEdit={() => setActiveField("sizeOrCalibre")}
            >
              <p className="text-base text-foreground">
                {listing.sizeOrCalibre?.trim() || "Add size / calibre"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Packaging">
            <ClickToEdit
              ariaLabel="packaging"
              editing={activeField === "packaging"}
              input={
                <div className="flex flex-wrap gap-2 py-1">
                  {LISTING_PACKAGING.map((item) => {
                    const selected = packagingDraft === item;

                    return (
                      <Button
                        key={item}
                        className={selected ? CHIP_SELECTED : CHIP_IDLE}
                        size="sm"
                        type="button"
                        variant={selected ? "primary" : "secondary"}
                        onPress={() => {
                          if (selected) {
                            setActiveField(null);

                            return;
                          }
                          setPackagingDraft(item);
                          void saveListingField(
                            {
                              listingId: listing._id,
                              packaging: item,
                            },
                            { closeField: "packaging" },
                          );
                        }}
                      >
                        {LISTING_PACKAGING_LABELS[item]}
                      </Button>
                    );
                  })}
                </div>
              }
              placeholder={!listing.packaging}
              onStartEdit={() => setActiveField("packaging")}
            >
              <p className="text-base text-foreground">
                {listing.packaging
                  ? (LISTING_PACKAGING_LABELS[
                      listing.packaging as ListingPackaging
                    ] ?? listing.packaging)
                  : "Add packaging"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Min order">
            <ClickToEdit
              ariaLabel="minimum order kg"
              editing={activeField === "minOrderKg"}
              input={
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    aria-label="Minimum order in kg"
                    className={clsx("max-w-40", EDIT_FIELD_CLASS)}
                    inputMode="decimal"
                    type="number"
                    value={minOrderDraft}
                    onBlur={() => {
                      saveOptionalNumberField("minOrderKg", minOrderDraft);
                      setActiveField(null);
                    }}
                    onChange={(event) => {
                      const next = event.target.value;

                      setMinOrderDraft(next);
                      debouncedSave(() => {
                        saveOptionalNumberField("minOrderKg", next);
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        setMinOrderDraft(
                          listing.minOrderKg != null
                            ? String(listing.minOrderKg)
                            : "",
                        );
                        setActiveField(null);
                      }
                    }}
                  />
                  <span className="text-sm text-muted">kg</span>
                </div>
              }
              placeholder={listing.minOrderKg == null}
              onStartEdit={() => setActiveField("minOrderKg")}
            >
              <p className="text-base text-foreground">
                {listing.minOrderKg != null
                  ? `${listing.minOrderKg} kg`
                  : "Add min order"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Pack unit">
            <ClickToEdit
              ariaLabel="pack unit kg"
              editing={activeField === "packUnitKg"}
              input={
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    aria-label="Pack unit in kg"
                    className={clsx("max-w-40", EDIT_FIELD_CLASS)}
                    inputMode="decimal"
                    type="number"
                    value={packUnitDraft}
                    onBlur={() => {
                      saveOptionalNumberField("packUnitKg", packUnitDraft);
                      setActiveField(null);
                    }}
                    onChange={(event) => {
                      const next = event.target.value;

                      setPackUnitDraft(next);
                      debouncedSave(() => {
                        saveOptionalNumberField("packUnitKg", next);
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        setPackUnitDraft(
                          listing.packUnitKg != null
                            ? String(listing.packUnitKg)
                            : "",
                        );
                        setActiveField(null);
                      }
                    }}
                  />
                  <span className="text-sm text-muted">kg</span>
                </div>
              }
              placeholder={listing.packUnitKg == null}
              onStartEdit={() => setActiveField("packUnitKg")}
            >
              <p className="text-base text-foreground">
                {listing.packUnitKg != null
                  ? `${listing.packUnitKg} kg packs`
                  : "Add pack unit"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Harvest">
            <ClickToEdit
              ariaLabel="harvest window"
              editing={activeField === "harvestWindowLabel"}
              input={
                <Input
                  autoFocus
                  fullWidth
                  aria-label="Harvest window"
                  className={EDIT_FIELD_CLASS}
                  placeholder="Ready now, or a date range"
                  value={harvestDraft}
                  onBlur={() => {
                    void saveListingField(
                      {
                        listingId: listing._id,
                        harvestWindowLabel: harvestDraft,
                      },
                      { closeField: "harvestWindowLabel" },
                    );
                  }}
                  onChange={(event) => {
                    const next = event.target.value;

                    setHarvestDraft(next);
                    debouncedSave(() => {
                      void saveListingField({
                        listingId: listing._id,
                        harvestWindowLabel: next,
                      });
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setHarvestDraft(listing.harvestWindowLabel ?? "");
                      setActiveField(null);
                    }
                  }}
                />
              }
              placeholder={!listing.harvestWindowLabel?.trim()}
              onStartEdit={() => setActiveField("harvestWindowLabel")}
            >
              <p className="text-base text-foreground">
                {formatHarvestWindowLabel(listing.harvestWindowLabel) ||
                  "Add harvest window"}
              </p>
            </ClickToEdit>
          </FieldRow>

          <FieldRow label="Notes">
            <ClickToEdit
              ariaLabel="description"
              editing={activeField === "description"}
              input={
                <textarea
                  autoFocus
                  aria-label="Description"
                  className={clsx(
                    "min-h-24 w-full px-3 py-2 text-sm leading-relaxed text-foreground",
                    EDIT_FIELD_CLASS,
                  )}
                  value={descriptionDraft}
                  onBlur={() => {
                    void saveListingField(
                      {
                        listingId: listing._id,
                        description: descriptionDraft,
                      },
                      { closeField: "description" },
                    );
                  }}
                  onChange={(event) => {
                    const next = event.target.value;

                    setDescriptionDraft(next);
                    debouncedSave(() => {
                      if (next.trim().length === 0) {
                        return;
                      }
                      void saveListingField({
                        listingId: listing._id,
                        description: next,
                      });
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setDescriptionDraft(listing.description);
                      setActiveField(null);
                    }
                  }}
                />
              }
              placeholder={listing.description.trim().length === 0}
              onStartEdit={() => setActiveField("description")}
            >
              <p className="text-sm leading-relaxed text-foreground">
                {listing.description.trim().length > 0
                  ? listing.description
                  : "Add description"}
              </p>
            </ClickToEdit>
          </FieldRow>
        </section>

        {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}

        <p className="text-xs text-muted">
          Tap a field to edit — saves automatically.
        </p>

        <Button
          className="w-fit"
          type="button"
          variant="danger-soft"
          onPress={deleteModalState.open}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          Delete listing
        </Button>
      </form>
    </>
  );
}
