import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  COUNTIES,
  CROP_TYPES,
  formatListingStatus,
  getCropTheme,
  listingGradeOptions,
  type County,
  type CropType,
  type ListingStatus,
} from "@repo/types";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Dialog, Input, Select, Separator, TextField } from "heroui-native";
import { Check, Trash2 } from "lucide-react-native";
import { Fragment, useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CropLabel } from "@/components/crop-display";
import { ListingImagePicker } from "@/components/listing-image-picker";

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
  listing: ListingSummary;
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
  | "description";

type SelectOption = {
  label: string;
  value: string;
};

const FIELD_CLASS =
  "rounded-lg border-0 bg-field-background shadow-sm dark:border dark:border-separator";
const CARD_BASE =
  "min-h-[7.5rem] gap-section-title rounded-[0.875rem] border p-card";
const CARD_READ_ONLY = "border-separator bg-surface";
const CARD_EDITABLE = "border-separator bg-surface shadow-md";
const EDITABLE_SURFACE_CLASS =
  "rounded-lg border-0 bg-field-background p-3 shadow-sm dark:border dark:border-separator";

function DetailFieldCard({
  children,
  className = "",
  editable = false,
  label,
}: {
  children: JSX.Element | JSX.Element[];
  className?: string;
  editable?: boolean;
  label: string;
}): JSX.Element {
  return (
    <View
      className={`${CARD_BASE} ${editable ? CARD_EDITABLE : CARD_READ_ONLY} ${className}`}
    >
      <Text className="text-caption font-medium uppercase tracking-wide text-muted">
        {label}
      </Text>
      <View className="min-h-0 flex-1 justify-center">{children}</View>
    </View>
  );
}

const CROP_OPTIONS: SelectOption[] = CROP_TYPES.map((crop) => ({
  value: crop,
  label: getCropTheme(crop).label,
}));

const COUNTY_OPTIONS: SelectOption[] = COUNTIES.map((county) => ({
  value: county,
  label: county,
}));

function findOption(options: SelectOption[], value: string): SelectOption {
  return options.find((option) => option.value === value) ?? options[0]!;
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

function ClickToEdit({
  ariaLabel,
  children,
  editing,
  input,
  onStartEdit,
}: {
  ariaLabel: string;
  children: JSX.Element;
  editing: boolean;
  input: JSX.Element;
  onStartEdit: () => void;
}): JSX.Element {
  if (editing) {
    return input;
  }

  return (
    <Pressable
      accessibilityLabel={`Edit ${ariaLabel}`}
      className={EDITABLE_SURFACE_CLASS}
      onPress={onStartEdit}
    >
      {children}
    </Pressable>
  );
}

export function ListingDetailForm({ listing }: ListingDetailFormProps): JSX.Element {
  const router = useRouter();
  const updateListing = useMutation(api.listings.updateListing);
  const updateListingStatus = useMutation(api.listings.updateListingStatus);
  const deleteListing = useMutation(api.listings.deleteListing);

  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [priceDraft, setPriceDraft] = useState(String(listing.pricePerKg));
  const [quantityDraft, setQuantityDraft] = useState(String(listing.quantityKg));
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
  const [descriptionDraft, setDescriptionDraft] = useState(listing.description);

  const debouncedSave = useDebouncedSave(400);

  const listingDraftSyncKey = [
    listing.pricePerKg,
    listing.quantityKg,
    listing.grade ?? "",
    listing.sizeOrCalibre ?? "",
    listing.minOrderKg ?? "",
    listing.packUnitKg ?? "",
    listing.description,
    activeField ?? "",
  ].join("\0");
  const [prevListingDraftSyncKey, setPrevListingDraftSyncKey] =
    useState(listingDraftSyncKey);
  if (listingDraftSyncKey !== prevListingDraftSyncKey) {
    setPrevListingDraftSyncKey(listingDraftSyncKey);
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
    if (activeField !== "description") {
      setDescriptionDraft(listing.description);
    }
  }

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

  const handleSoldOutChange = async (checked: boolean): Promise<void> => {
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

  const handleDelete = async (): Promise<void> => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteListing({ listingId: listing._id });
      setDeleteOpen(false);
      router.replace("/(farmer)/(tabs)/my-products");
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
    <View className="gap-section">
      <Dialog isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay isCloseOnPress onPress={() => setDeleteOpen(false)} />
          <Dialog.Content className="w-full rounded-card bg-surface p-card-lg">
            <View className="gap-section-title">
              <Text className="text-section-title">Delete listing?</Text>
              <Text className="text-caption text-muted">
                Are you sure you want to delete this {getCropTheme(listing.crop).label}{" "}
                listing? This cannot be undone.
              </Text>
            </View>
            {deleteError ? (
              <Text className="text-caption text-danger">{deleteError}</Text>
            ) : null}
            <View className="mt-4 flex-row justify-end gap-3">
              <Button
                isDisabled={isDeleting}
                size="sm"
                variant="secondary"
                onPress={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                isDisabled={isDeleting}
                size="sm"
                variant="danger"
                onPress={() => {
                  void handleDelete();
                }}
              >
                {isDeleting ? "Deleting…" : "Delete listing"}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <View className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DetailFieldCard editable label="Photo">
          <View className={EDITABLE_SURFACE_CLASS}>
            <ListingImagePicker
            hideLabel
            initialPreviewUrl={listing.imageUrl}
            value={listing.imageStorageId ?? null}
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
          </View>
        </DetailFieldCard>

        <DetailFieldCard editable label="Product">
            <ClickToEdit
              ariaLabel="product"
              editing={activeField === "crop"}
              input={
                <Select
                  isDisabled={isExpired}
                  onValueChange={(next) => {
                    if (!next || Array.isArray(next) || next.value === listing.crop) {
                      setActiveField(null);
                      return;
                    }
                    void saveListingField(
                      {
                        listingId: listing._id,
                        crop: next.value as CropType,
                      },
                      { closeField: "crop" },
                    );
                  }}
                  presentation="bottom-sheet"
                  value={findOption(CROP_OPTIONS, listing.crop)}
                >
                  <Select.Trigger className={FIELD_CLASS}>
                    <Select.Value placeholder="Select product" />
                    <Select.TriggerIndicator />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Overlay />
                    <Select.Content presentation="bottom-sheet" snapPoints={["45%", "85%"]}>
                      <Select.Close />
                      <Select.ListLabel>Choose a product</Select.ListLabel>
                      {CROP_OPTIONS.map((option, index) => (
                        <Fragment key={option.value}>
                          <Select.Item label={option.label} value={option.value} />
                          {index < CROP_OPTIONS.length - 1 ? <Separator /> : null}
                        </Fragment>
                      ))}
                    </Select.Content>
                  </Select.Portal>
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
              editing={activeField === "pricePerKg"}
              input={
                <TextField>
                  <Input
                    autoFocus
                    className={FIELD_CLASS}
                    keyboardType="decimal-pad"
                    value={priceDraft}
                    onBlur={() => {
                      saveNumberField("pricePerKg", priceDraft);
                      setActiveField(null);
                    }}
                    onChangeText={(next) => {
                      setPriceDraft(next);
                      debouncedSave(() => {
                        saveNumberField("pricePerKg", next);
                      });
                    }}
                  />
                </TextField>
              }
              onStartEdit={() => setActiveField("pricePerKg")}
            >
              <Text className="text-emphasis text-foreground">
                KES {listing.pricePerKg}
                <Text className="text-caption text-muted">/kg</Text>
              </Text>
            </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Quantity">
            <ClickToEdit
              ariaLabel="quantity"
              editing={activeField === "quantityKg"}
              input={
                <TextField>
                  <Input
                    autoFocus
                    className={FIELD_CLASS}
                    keyboardType="decimal-pad"
                    value={quantityDraft}
                    onBlur={() => {
                      saveNumberField("quantityKg", quantityDraft);
                      setActiveField(null);
                    }}
                    onChangeText={(next) => {
                      setQuantityDraft(next);
                      debouncedSave(() => {
                        saveNumberField("quantityKg", next);
                      });
                    }}
                  />
                </TextField>
              }
              onStartEdit={() => setActiveField("quantityKg")}
            >
              <Text className="text-emphasis text-foreground">
                {listing.quantityKg}
                <Text className="text-caption text-muted"> kg</Text>
              </Text>
            </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="County">
            <ClickToEdit
              ariaLabel="county"
              editing={activeField === "county"}
              input={
                <Select
                  onValueChange={(next) => {
                    if (!next || Array.isArray(next) || next.value === listing.county) {
                      setActiveField(null);
                      return;
                    }
                    void saveListingField(
                      {
                        listingId: listing._id,
                        county: next.value as County,
                      },
                      { closeField: "county" },
                    );
                  }}
                  presentation="bottom-sheet"
                  value={findOption(COUNTY_OPTIONS, listing.county)}
                >
                  <Select.Trigger className={FIELD_CLASS}>
                    <Select.Value placeholder="Select county" />
                    <Select.TriggerIndicator />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Overlay />
                    <Select.Content presentation="bottom-sheet" snapPoints={["45%", "85%"]}>
                      <Select.Close />
                      <Select.ListLabel>Choose a county</Select.ListLabel>
                      {COUNTY_OPTIONS.map((option, index) => (
                        <Fragment key={option.value}>
                          <Select.Item label={option.label} value={option.value} />
                          {index < COUNTY_OPTIONS.length - 1 ? <Separator /> : null}
                        </Fragment>
                      ))}
                    </Select.Content>
                  </Select.Portal>
                </Select>
              }
              onStartEdit={() => setActiveField("county")}
            >
              <Text className="text-emphasis text-foreground">{listing.county}</Text>
            </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Grade">
            <ClickToEdit
              ariaLabel="grade"
              editing={activeField === "grade"}
              input={
                <View className="flex-row flex-wrap gap-2 py-1">
                  {listingGradeOptions(gradeDraft).map((item) => {
                    const selected = gradeDraft === item;
                    return (
                      <Button
                        key={item}
                        size="sm"
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
                </View>
              }
              onStartEdit={() => setActiveField("grade")}
            >
              <Text className="text-sm text-foreground">
                {listing.grade?.trim() ? listing.grade : "Add grade"}
              </Text>
            </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Size / calibre">
          <ClickToEdit
            ariaLabel="size or calibre"
            editing={activeField === "sizeOrCalibre"}
            input={
              <TextField>
                <Input
                  autoFocus
                  className={FIELD_CLASS}
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
                  onChangeText={(next) => {
                    setSizeOrCalibreDraft(next);
                    debouncedSave(() => {
                      void saveListingField({
                        listingId: listing._id,
                        sizeOrCalibre: next,
                      });
                    });
                  }}
                />
              </TextField>
            }
            onStartEdit={() => setActiveField("sizeOrCalibre")}
          >
            <Text className="text-sm text-foreground">
              {listing.sizeOrCalibre?.trim()
                ? listing.sizeOrCalibre
                : "Add size / calibre"}
            </Text>
          </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Min order">
          <ClickToEdit
            ariaLabel="minimum order kg"
            editing={activeField === "minOrderKg"}
            input={
              <TextField>
                <Input
                  autoFocus
                  className={FIELD_CLASS}
                  keyboardType="decimal-pad"
                  value={minOrderDraft}
                  onBlur={() => {
                    saveOptionalNumberField("minOrderKg", minOrderDraft);
                    setActiveField(null);
                  }}
                  onChangeText={(next) => {
                    setMinOrderDraft(next);
                    debouncedSave(() => {
                      saveOptionalNumberField("minOrderKg", next);
                    });
                  }}
                />
              </TextField>
            }
            onStartEdit={() => setActiveField("minOrderKg")}
          >
            <Text className="text-emphasis text-foreground">
              {listing.minOrderKg != null ? (
                <>
                  {listing.minOrderKg}
                  <Text className="text-caption text-muted"> kg</Text>
                </>
              ) : (
                <Text className="text-sm font-medium">Add min order</Text>
              )}
            </Text>
          </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Pack unit">
          <ClickToEdit
            ariaLabel="pack unit kg"
            editing={activeField === "packUnitKg"}
            input={
              <TextField>
                <Input
                  autoFocus
                  className={FIELD_CLASS}
                  keyboardType="decimal-pad"
                  value={packUnitDraft}
                  onBlur={() => {
                    saveOptionalNumberField("packUnitKg", packUnitDraft);
                    setActiveField(null);
                  }}
                  onChangeText={(next) => {
                    setPackUnitDraft(next);
                    debouncedSave(() => {
                      saveOptionalNumberField("packUnitKg", next);
                    });
                  }}
                />
              </TextField>
            }
            onStartEdit={() => setActiveField("packUnitKg")}
          >
            <Text className="text-emphasis text-foreground">
              {listing.packUnitKg != null ? (
                <>
                  {listing.packUnitKg}
                  <Text className="text-caption text-muted"> kg</Text>
                </>
              ) : (
                <Text className="text-sm font-medium">Add pack unit</Text>
              )}
            </Text>
          </ClickToEdit>
        </DetailFieldCard>

        <DetailFieldCard editable label="Status">
          <View className={`gap-2 ${EDITABLE_SURFACE_CLASS}`}>
              <Text className="text-emphasis text-foreground">
                {formatListingStatus(listing.status)}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: isSoldOut,
                  disabled: isExpired || isSavingStatus,
                }}
                className="flex-row items-center gap-2"
                disabled={isExpired || isSavingStatus}
                onPress={() => {
                  void handleSoldOutChange(!isSoldOut);
                }}
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border border-separator ${
                    isSoldOut ? "border-accent bg-accent" : "bg-field-background"
                  }`}
                >
                  {isSoldOut ? (
                    <Check color="#fff" size={14} strokeWidth={2.5} />
                  ) : null}
                </View>
                <Text className="text-sm text-foreground">Sold out</Text>
              </Pressable>
            </View>
          </DetailFieldCard>

        <DetailFieldCard label="Listed">
          <Text className="text-sm text-foreground">{createdAt}</Text>
        </DetailFieldCard>

        <View className="col-span-2 sm:col-span-4">
          <DetailFieldCard editable label="Description">
            <ClickToEdit
              ariaLabel="description"
              editing={activeField === "description"}
              input={
                <TextInput
                  autoFocus
                  multiline
                  className="min-h-24 rounded-lg border-0 bg-field-background px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm dark:border dark:border-separator"
                  textAlignVertical="top"
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
                  onChangeText={(next) => {
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
                />
              }
              onStartEdit={() => setActiveField("description")}
            >
              <Text className="text-sm leading-relaxed text-foreground">
                {listing.description.trim().length > 0
                  ? listing.description
                  : "Add description"}
              </Text>
            </ClickToEdit>
          </DetailFieldCard>
        </View>
      </View>

      {saveError ? <Text className="text-caption text-danger">{saveError}</Text> : null}

      <Text className="text-caption text-muted">
        Tap any card to edit. Changes save automatically.
      </Text>

      <Button
        size="sm"
        variant="danger"
        onPress={() => setDeleteOpen(true)}
      >
        <Trash2 color="currentColor" size={16} />
        Delete listing
      </Button>
    </View>
  );
}
