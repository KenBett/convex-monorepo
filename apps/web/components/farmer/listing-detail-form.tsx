"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  COUNTIES,
  CROP_TYPES,
  formatListingStatus,
  getCropTheme,
  type County,
  type CropType,
  type ListingStatus,
} from "@repo/types";
import { useMutation } from "convex/react";
import clsx from "clsx";
import {
  Button,
  Input,
  ListBox,
  Select,
  useOverlayState,
} from "@heroui/react";
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
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageStorageId: Id<"_storage">;
  imageUrl: string | null;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
};

type ListingDetailFormProps = {
  listing: ListingSummary;
};

type EditableField =
  | "crop"
  | "pricePerKg"
  | "quantityKg"
  | "county"
  | "grade"
  | "description";

const FIELD_CARD_BASE =
  "flex min-h-[7.5rem] flex-col gap-2 rounded-[0.875rem] border p-4 text-surface-foreground";

const FIELD_CARD_READ_ONLY =
  "border-separator bg-surface shadow-[0_1px_3px_oklch(0%_0_0/0.05)] dark:shadow-[0_1px_4px_oklch(0%_0_0/0.28)]";

const FIELD_CARD_EDITABLE =
  "border-separator bg-surface shadow-[0_2px_10px_oklch(0%_0_0/0.08)] dark:shadow-[0_2px_10px_oklch(0%_0_0/0.32)]";

const EDIT_FIELD_CLASS = clsx(
  "rounded-lg bg-field-background shadow-sm",
  "border-0 outline-none ring-0",
  "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
  "dark:border dark:border-separator dark:shadow-[0_1px_3px_oklch(0%_0_0/0.24)]",
  "dark:focus-visible:ring-2 dark:focus-visible:ring-accent/30",
);

const EDITABLE_SURFACE_CLASS = clsx(
  "rounded-lg bg-field-background p-3 shadow-sm",
  "border-0 outline-none ring-0",
  "transition-shadow duration-150",
  "focus-visible:outline-none focus-visible:ring-0",
  "dark:border dark:border-separator dark:shadow-[0_1px_3px_oklch(0%_0_0/0.24)]",
  "dark:hover:shadow-[0_3px_8px_oklch(0%_0_0/0.34)]",
  "dark:focus-visible:ring-2 dark:focus-visible:ring-accent/30",
);

function DetailFieldCard({
  children,
  className,
  colSpan = 1,
  editable = false,
  label,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 4;
  editable?: boolean;
  label: string;
}) {
  return (
    <div
      className={clsx(
        FIELD_CARD_BASE,
        editable ? FIELD_CARD_EDITABLE : FIELD_CARD_READ_ONLY,
        colSpan === 4 && "col-span-2 sm:col-span-4",
        colSpan === 2 && "col-span-2",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
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
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  editing: boolean;
  input: ReactNode;
  onStartEdit: () => void;
}) {
  if (editing) {
    return <div className={clsx("w-full", className)}>{input}</div>;
  }

  return (
    <button
      aria-label={`Edit ${ariaLabel}`}
      className={clsx(
        "h-full w-full cursor-pointer text-left",
        EDITABLE_SURFACE_CLASS,
        className,
      )}
      type="button"
      onClick={onStartEdit}
    >
      {children}
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

export function ListingDetailForm({ listing }: ListingDetailFormProps) {
  const router = useRouter();
  const updateListing = useMutation(api.listings.updateListing);
  const updateListingStatus = useMutation(api.listings.updateListingStatus);
  const deleteListing = useMutation(api.listings.deleteListing);
  const deleteModalState = useOverlayState();

  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [priceDraft, setPriceDraft] = useState(String(listing.pricePerKg));
  const [quantityDraft, setQuantityDraft] = useState(String(listing.quantityKg));
  const [gradeDraft, setGradeDraft] = useState(listing.grade ?? "");
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

    const current = field === "pricePerKg" ? listing.pricePerKg : listing.quantityKg;
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
        error instanceof Error ? error.message : "Could not update listing status.",
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
      router.push("/farmer/my-products");
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
  const createdAt = new Date(listing._creationTime).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

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
                  Are you sure you want to delete this {getCropTheme(listing.crop).label}{" "}
                  listing? This cannot be undone.
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
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailFieldCard editable label="Photo">
            <div className={clsx("inline-flex", EDITABLE_SURFACE_CLASS)}>
              <ListingImagePicker
              hideLabel
              initialPreviewUrl={listing.imageUrl}
              value={listing.imageStorageId}
              variant="compact"
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
            </div>
          </DetailFieldCard>

          <DetailFieldCard editable label="Product">
            <ClickToEdit
              ariaLabel="product"
              className="flex h-full items-center"
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
                  <Select.Trigger className={clsx("w-full", EDIT_FIELD_CLASS)}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {CROP_TYPES.map((crop) => (
                        <ListBox.Item
                          id={crop}
                          key={crop}
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
              <CropLabel crop={listing.crop} />
            </ClickToEdit>
          </DetailFieldCard>

          <DetailFieldCard editable label="Price">
            <ClickToEdit
              ariaLabel="price per kg"
              className="flex h-full items-center px-1"
              editing={activeField === "pricePerKg"}
              input={
                <Input
                  autoFocus
                  aria-label="Price per kg"
                  className={EDIT_FIELD_CLASS}
                  fullWidth
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
              <p className="text-xl font-semibold tracking-tight text-foreground">
                KES {listing.pricePerKg}
                <span className="text-sm font-medium text-muted">/kg</span>
              </p>
            </ClickToEdit>
          </DetailFieldCard>

          <DetailFieldCard editable label="Quantity">
            <ClickToEdit
              ariaLabel="quantity"
              className="flex h-full items-center px-1"
              editing={activeField === "quantityKg"}
              input={
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    aria-label="Quantity in kg"
                    className={clsx("max-w-40", EDIT_FIELD_CLASS)}
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
              <p className="text-xl font-semibold tracking-tight text-foreground">
                {listing.quantityKg}
                <span className="text-sm font-medium text-muted"> kg</span>
              </p>
            </ClickToEdit>
          </DetailFieldCard>

          <DetailFieldCard editable label="County">
            <ClickToEdit
              ariaLabel="county"
              className="flex h-full items-center px-1"
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
                  <Select.Trigger className={clsx("w-full", EDIT_FIELD_CLASS)}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {COUNTIES.map((county) => (
                        <ListBox.Item id={county} key={county} textValue={county}>
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
              <p className="text-base font-medium text-foreground">{listing.county}</p>
            </ClickToEdit>
          </DetailFieldCard>

          <DetailFieldCard editable label="Grade">
            <ClickToEdit
              ariaLabel="grade"
              className="flex h-full items-center px-1"
              editing={activeField === "grade"}
              input={
                <Input
                  autoFocus
                  aria-label="Grade"
                  className={EDIT_FIELD_CLASS}
                  fullWidth
                  placeholder="Optional grade"
                  value={gradeDraft}
                  onBlur={() => {
                    void saveListingField(
                      {
                        listingId: listing._id,
                        grade: gradeDraft,
                      },
                      { closeField: "grade" },
                    );
                  }}
                  onChange={(event) => {
                    const next = event.target.value;
                    setGradeDraft(next);
                    debouncedSave(() => {
                      void saveListingField({
                        listingId: listing._id,
                        grade: next,
                      });
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setGradeDraft(listing.grade ?? "");
                      setActiveField(null);
                    }
                  }}
                />
              }
              onStartEdit={() => setActiveField("grade")}
            >
              <p className="text-base text-foreground">
                {listing.grade?.trim() ? listing.grade : "Add grade"}
              </p>
            </ClickToEdit>
          </DetailFieldCard>

          <DetailFieldCard editable label="Status">
            <div className={clsx("flex flex-col gap-3", EDITABLE_SURFACE_CLASS)}>
              <p className="text-base font-medium text-foreground">
                {formatListingStatus(listing.status)}
              </p>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  checked={isSoldOut}
                  className="h-4 w-4 rounded border-separator accent-accent"
                  disabled={isExpired || isSavingStatus}
                  type="checkbox"
                  onChange={(event) => {
                    void handleSoldOutChange(event.target.checked);
                  }}
                />
                <span>Sold out</span>
              </label>
            </div>
          </DetailFieldCard>

          <DetailFieldCard label="Listed">
            <p className="flex h-full items-center text-base text-foreground">{createdAt}</p>
          </DetailFieldCard>

          <DetailFieldCard colSpan={4} editable label="Description">
            <ClickToEdit
              ariaLabel="description"
              className="w-full px-1"
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
              onStartEdit={() => setActiveField("description")}
            >
              <p className="text-sm leading-relaxed text-foreground">
                {listing.description.trim().length > 0
                  ? listing.description
                  : "Add description"}
              </p>
            </ClickToEdit>
          </DetailFieldCard>
        </div>

        {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}

        <p className="text-xs text-muted">
          Tap any card to edit. Changes save automatically.
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
