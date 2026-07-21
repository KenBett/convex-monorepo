import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  COUNTIES,
  getCropTheme,
  getListingCardBgClass,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  LISTING_TAGS,
  LISTING_TAG_LABELS,
  LISTING_FORM_STEP_COUNT,
  LISTING_FORM_STEP_LABELS,
  listingFormDefaults,
  listingGradeOptions,
  parseListingForm,
  validateListingFormStep,
  type CropType,
  type ListingFormFieldErrors,
  type ListingFormInput,
  type ListingFormStep,
  type ListingPackaging,
  type ListingTag,
} from "@repo/types";
import { CropBadge, CropPickerGrid } from "@/components/crop-display";
import { ListingImagePicker } from "@/components/listing-image-picker";
import { useMutation } from "convex/react";
import {
  Button,
  Input,
  Label,
  Select,
  Separator,
  Surface,
  TextField,
} from "heroui-native";
import { Check } from "lucide-react-native";
import { Fragment, useState, type JSX } from "react";
import { Image, ScrollView, Text, View } from "react-native";

type SelectOption = {
  label: string;
  value: string;
};

const FIELD_CLASS = "border border-separator bg-field-background";

const COUNTY_OPTIONS: SelectOption[] = COUNTIES.map((county) => ({
  value: county,
  label: county,
}));

function findOption(options: SelectOption[], value: string): SelectOption {
  return options.find((option) => option.value === value) ?? options[0]!;
}

function FormSelect({
  error,
  label,
  listLabel,
  onValueChange,
  options,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  listLabel: string;
  onValueChange: (option: SelectOption) => void;
  options: SelectOption[];
  placeholder: string;
  value: SelectOption;
}): JSX.Element {
  return (
    <View className="gap-section-title">
      <Label>{label}</Label>
      <Select
        onValueChange={(next) => {
          if (next && !Array.isArray(next)) {
            onValueChange(next);
          }
        }}
        presentation="bottom-sheet"
        value={value}
      >
        <Select.Trigger className={FIELD_CLASS}>
          <Select.Value placeholder={placeholder} />
          <Select.TriggerIndicator />
        </Select.Trigger>
        <Select.Portal>
          <Select.Overlay />
          <Select.Content presentation="bottom-sheet" snapPoints={["45%", "85%"]}>
            <Select.Close />
            <Select.ListLabel>{listLabel}</Select.ListLabel>
            {options.map((option, index) => (
              <Fragment key={option.value}>
                <Select.Item label={option.label} value={option.value} />
                {index < options.length - 1 ? <Separator /> : null}
              </Fragment>
            ))}
          </Select.Content>
        </Select.Portal>
      </Select>
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
    </View>
  );
}

function StepIndicator({ step }: { step: ListingFormStep }): JSX.Element {
  return (
    <View
      accessibilityLabel={`Step ${step} of ${LISTING_FORM_STEP_COUNT}: ${LISTING_FORM_STEP_LABELS[step - 1]}`}
      accessibilityRole="progressbar"
      className="w-full"
    >
      <View className="flex-row items-start">
        {LISTING_FORM_STEP_LABELS.map((label, index) => {
          const stepNumber = (index + 1) as ListingFormStep;
          const completed = stepNumber < step;
          const current = stepNumber === step;
          const upcoming = stepNumber > step;

          return (
            <View
              key={label}
              className="relative min-w-0 flex-1 items-center"
            >
              {index > 0 ? (
                <View
                  className={`absolute left-0 right-1/2 top-[15px] h-0.5 ${
                    stepNumber <= step ? "bg-accent" : "bg-separator"
                  }`}
                />
              ) : null}
              {index < LISTING_FORM_STEP_COUNT - 1 ? (
                <View
                  className={`absolute left-1/2 right-0 top-[15px] h-0.5 ${
                    stepNumber < step ? "bg-accent" : "bg-separator"
                  }`}
                />
              ) : null}

              <View
                className={`z-10 size-8 items-center justify-center rounded-full ${
                  completed
                    ? "bg-accent"
                    : current
                      ? "border-2 border-accent bg-background"
                      : "border border-separator bg-background"
                }`}
              >
                {completed ? (
                  <Check color="#fff" size={16} strokeWidth={2.5} />
                ) : (
                  <Text
                    className={`text-sm font-semibold ${
                      current ? "text-accent" : "text-muted"
                    }`}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>

              <Text
                className={`mt-2 px-1 text-center text-[11px] leading-tight ${
                  upcoming ? "text-muted" : "text-foreground font-medium"
                }`}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ListingReviewSummary({
  county,
  crop,
  description,
  grade,
  imagePreviewUrl,
  pricePerKg,
  quantityKg,
}: {
  county: string;
  crop: CropType;
  description: string;
  grade: string;
  imagePreviewUrl: string | null;
  pricePerKg: string;
  quantityKg: string;
}): JSX.Element {
  const theme = getCropTheme(crop);
  const bgClass = getListingCardBgClass(crop);
  const trimmedDescription = description.trim();
  const parsedQuantity = Number(quantityKg);
  const parsedPrice = Number(pricePerKg);

  return (
    <View className="gap-section-title">
      <Label>Review your listing</Label>
      <View className={`gap-3 overflow-hidden rounded-xl shadow-sm ${bgClass}`}>
        {imagePreviewUrl ? (
          <Image
            accessibilityLabel="Listing preview"
            className="aspect-[4/3] w-full"
            resizeMode="cover"
            source={{ uri: imagePreviewUrl }}
          />
        ) : null}

        <View className="gap-3 p-4 pt-0">
        <View className="flex-row items-center gap-2.5">
          <CropBadge crop={crop} size="md" />
          <Text className="text-emphasis text-neutral-900 dark:text-neutral-50">
            {theme.label}
          </Text>
        </View>

        <View className="gap-0.5">
          <Text className="text-[22px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
            {Number.isFinite(parsedPrice) && parsedPrice > 0
              ? `KES ${parsedPrice}`
              : "—"}
            <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              /kg
            </Text>
          </Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">
            {Number.isFinite(parsedQuantity) && parsedQuantity > 0
              ? `${parsedQuantity} kg`
              : "—"}
          </Text>
        </View>

        <Text className="text-caption text-neutral-600 dark:text-neutral-400">
          {county}
          {grade.trim() ? ` · ${grade.trim()}` : ""}
        </Text>

        {trimmedDescription.length > 0 ? (
          <Text className="border-l-2 border-neutral-300/60 pl-2.5 text-caption italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400">
            &ldquo;{trimmedDescription}&rdquo;
          </Text>
        ) : (
          <Text className="text-caption italic text-neutral-500">
            No description yet
          </Text>
        )}
        </View>
      </View>
    </View>
  );
}

type ListingFormProps = {
  embedded?: boolean;
  embeddedLayout?: "stack" | "modal";
  listingId?: Id<"listings">;
  initialValues?: ListingFormInput;
  initialImageUrl?: string | null;
  onCancel?: () => void;
  onSubmitted: () => void;
};

export function ListingForm({
  embedded = false,
  embeddedLayout = "stack",
  initialValues,
  initialImageUrl = null,
  listingId,
  onCancel,
  onSubmitted,
}: ListingFormProps): JSX.Element {
  const createListing = useMutation(api.listings.createListing);
  const updateListing = useMutation(api.listings.updateListing);
  const useWizard = !listingId && embedded;

  const defaults = initialValues ?? listingFormDefaults();
  const [step, setStep] = useState<ListingFormStep>(1);
  const [crop, setCrop] = useState<CropType>(defaults.crop);
  const [countyValue, setCountyValue] = useState<SelectOption>(() =>
    findOption(COUNTY_OPTIONS, defaults.county),
  );
  const [quantityKg, setQuantityKg] = useState(
    defaults.quantityKg > 0 ? String(defaults.quantityKg) : "",
  );
  const [pricePerKg, setPricePerKg] = useState(
    defaults.pricePerKg > 0 ? String(defaults.pricePerKg) : "",
  );
  const [description, setDescription] = useState(defaults.description);
  const [grade, setGrade] = useState(defaults.grade ?? "");
  const [variety, setVariety] = useState(defaults.variety ?? "");
  const [harvestWindowLabel, setHarvestWindowLabel] = useState(
    defaults.harvestWindowLabel ?? "",
  );
  const [tags, setTags] = useState<ListingTag[]>(defaults.tags ?? []);
  const [packaging, setPackaging] = useState<ListingPackaging | undefined>(
    defaults.packaging,
  );
  const [packUnitKg, setPackUnitKg] = useState(
    defaults.packUnitKg != null ? String(defaults.packUnitKg) : "",
  );
  const [minOrderKg, setMinOrderKg] = useState(
    defaults.minOrderKg != null ? String(defaults.minOrderKg) : "",
  );
  const [sizeOrCalibre, setSizeOrCalibre] = useState(
    defaults.sizeOrCalibre ?? "",
  );
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(
    defaults.imageStorageId ? (defaults.imageStorageId as Id<"_storage">) : null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialImageUrl,
  );
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = {
    certifications: defaults.certifications ?? [],
    crop,
    county: countyValue.value,
    description,
    grade,
    harvestWindowLabel,
    imageStorageId: imageStorageId ?? "",
    minOrderKg,
    packaging,
    packUnitKg,
    pricePerKg,
    quantityKg,
    sizeOrCalibre,
    tags,
    variety,
  };

  const handleImageChange = (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ): void => {
    setImageStorageId(storageId);
    setImagePreviewUrl(previewUrl);
  };

  const handleSubmit = async (): Promise<void> => {
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
          certifications: parsed.data.certifications,
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue ?? "",
          harvestWindowLabel: parsed.data.harvestWindowLabel?.trim() || "",
          imageStorageId: imageStorageId ?? undefined,
          listingId,
          minOrderKg: parsed.data.minOrderKg ?? null,
          packaging: parsed.data.packaging,
          packUnitKg: parsed.data.packUnitKg ?? null,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
          sizeOrCalibre: parsed.data.sizeOrCalibre?.trim() || "",
          tags: parsed.data.tags,
          variety: parsed.data.variety?.trim() || "",
        });
      } else {
        if (!imageStorageId) {
          setFieldErrors({ imageStorageId: "Listing photo is required" });
          return;
        }

        await createListing({
          certifications: parsed.data.certifications,
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue,
          harvestWindowLabel: parsed.data.harvestWindowLabel?.trim() || undefined,
          imageStorageId,
          minOrderKg: parsed.data.minOrderKg,
          packaging: parsed.data.packaging,
          packUnitKg: parsed.data.packUnitKg,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
          sizeOrCalibre: parsed.data.sizeOrCalibre?.trim() || undefined,
          tags: parsed.data.tags,
          variety: parsed.data.variety?.trim() || undefined,
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

  const handleNext = (): void => {
    setSubmitError(null);
    const result = validateListingFormStep(step, formValues);
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    setStep((current) => Math.min(current + 1, 4) as ListingFormStep);
  };

  const handleBack = (): void => {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 1) as ListingFormStep);
  };

  const editFields = (
    <>
      <Text className="text-section-title">
        {listingId ? "Edit listing" : "Create listing"}
      </Text>

      <CropPickerGrid
        error={fieldErrors.crop}
        onChange={setCrop}
        value={crop}
      />

      <ListingImagePicker
        error={fieldErrors.imageStorageId}
        initialPreviewUrl={imagePreviewUrl}
        value={imageStorageId}
        onChange={handleImageChange}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField isRequired isInvalid={Boolean(fieldErrors.quantityKg)}>
            <Label>Quantity (kg)</Label>
            <Input
              className={FIELD_CLASS}
              keyboardType="decimal-pad"
              onChangeText={setQuantityKg}
              placeholder="e.g. 500"
              value={quantityKg}
            />
            {fieldErrors.quantityKg ? (
              <Text className="text-caption text-danger">{fieldErrors.quantityKg}</Text>
            ) : null}
          </TextField>
        </View>

        <View className="flex-1">
          <TextField isRequired isInvalid={Boolean(fieldErrors.pricePerKg)}>
            <Label>Price per kg (KES)</Label>
            <Input
              className={FIELD_CLASS}
              keyboardType="decimal-pad"
              onChangeText={setPricePerKg}
              placeholder="e.g. 45"
              value={pricePerKg}
            />
            {fieldErrors.pricePerKg ? (
              <Text className="text-caption text-danger">{fieldErrors.pricePerKg}</Text>
            ) : null}
          </TextField>
        </View>
      </View>

      <FormSelect
        error={fieldErrors.county}
        label="County"
        listLabel="Choose a county"
        onValueChange={setCountyValue}
        options={COUNTY_OPTIONS}
        placeholder="Select county"
        value={countyValue}
      />

      <View className="gap-section-title">
        <Label>Grade (optional)</Label>
        <View className="flex-row flex-wrap gap-2">
          {listingGradeOptions(grade).map((item) => {
            const selected = grade === item;
            return (
              <Button
                key={item}
                size="sm"
                variant={selected ? "primary" : "secondary"}
                onPress={() => setGrade(selected ? "" : item)}
              >
                {item}
              </Button>
            );
          })}
        </View>
        {fieldErrors.grade ? (
          <Text className="text-caption text-danger">{fieldErrors.grade}</Text>
        ) : null}
      </View>

      <TextField>
        <Label>Size / calibre (optional)</Label>
        <Input
          className={FIELD_CLASS}
          onChangeText={setSizeOrCalibre}
          placeholder="e.g. 18 count, 45–65 mm"
          value={sizeOrCalibre}
        />
      </TextField>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField isInvalid={Boolean(fieldErrors.minOrderKg)}>
            <Label>Min order kg</Label>
            <Input
              className={FIELD_CLASS}
              keyboardType="decimal-pad"
              onChangeText={setMinOrderKg}
              placeholder="e.g. 500"
              value={minOrderKg}
            />
          </TextField>
        </View>
        <View className="flex-1">
          <TextField isInvalid={Boolean(fieldErrors.packUnitKg)}>
            <Label>Pack unit kg</Label>
            <Input
              className={FIELD_CLASS}
              keyboardType="decimal-pad"
              onChangeText={setPackUnitKg}
              placeholder="e.g. 20"
              value={packUnitKg}
            />
          </TextField>
        </View>
      </View>

      <TextField isRequired isInvalid={Boolean(fieldErrors.description)}>
        <Label>Description</Label>
        <Input
          className={FIELD_CLASS}
          multiline
          numberOfLines={4}
          onChangeText={setDescription}
          placeholder="Describe quality, harvest timing, delivery options..."
          value={description}
        />
        {fieldErrors.description ? (
          <Text className="text-caption text-danger">{fieldErrors.description}</Text>
        ) : null}
      </TextField>

      {submitError ? <Text className="text-caption text-danger">{submitError}</Text> : null}
    </>
  );

  const editActions = (
    <View className="flex-row gap-3">
      {onCancel ? (
        <Button className="flex-1" size="sm" variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button
        className="flex-1"
        isDisabled={isSubmitting}
        size="sm"
        onPress={() => {
          void handleSubmit();
        }}
      >
        {isSubmitting ? "Saving..." : listingId ? "Save changes" : "Create listing"}
      </Button>
    </View>
  );

  if (!useWizard) {
    if (embedded && embeddedLayout === "modal") {
      return (
        <View className="max-h-full">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-section pb-4"
          >
            {editFields}
          </ScrollView>
          <View className="border-t border-separator pt-3">{editActions}</View>
        </View>
      );
    }

    const content = (
      <>
        {editFields}
        {editActions}
      </>
    );

    if (embedded) {
      return <View className="gap-section">{content}</View>;
    }

    return (
      <Surface variant="default" className="gap-section rounded-card p-card-lg shadow-elevated">
        {content}
      </Surface>
    );
  }

  const wizardStepContent =
    step === 1 ? (
      <View className="gap-section">
        <View className="gap-1">
          <Text className="text-section-title">What are you selling?</Text>
          <Text className="text-caption text-muted">
            Pick the crop for this listing. You can change it before submitting.
          </Text>
        </View>
        <CropPickerGrid
          error={fieldErrors.crop}
          onChange={setCrop}
          value={crop}
          variant="expanded"
        />
      </View>
    ) : step === 2 ? (
      <View className="gap-section">
        <View className="gap-1">
          <Text className="text-section-title">Add a listing photo</Text>
          <Text className="text-caption text-muted">
            Buyers are more likely to contact you when they can see your crop.
          </Text>
        </View>

        <ListingImagePicker
          error={fieldErrors.imageStorageId}
          initialPreviewUrl={imagePreviewUrl}
          value={imageStorageId}
          onChange={handleImageChange}
        />
      </View>
    ) : step === 3 ? (
      <View className="gap-section">
        <View className="gap-1">
          <Text className="text-section-title">Listing details</Text>
          <Text className="text-caption text-muted">
            Set quantity, price, and county so buyers can find your produce.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField isRequired isInvalid={Boolean(fieldErrors.quantityKg)}>
              <Label>Quantity (kg)</Label>
              <Input
                className={FIELD_CLASS}
                keyboardType="decimal-pad"
                onChangeText={setQuantityKg}
                placeholder="e.g. 500"
                value={quantityKg}
              />
              {fieldErrors.quantityKg ? (
                <Text className="text-caption text-danger">{fieldErrors.quantityKg}</Text>
              ) : null}
            </TextField>
          </View>

          <View className="flex-1">
            <TextField isRequired isInvalid={Boolean(fieldErrors.pricePerKg)}>
              <Label>Price per kg (KES)</Label>
              <Input
                className={FIELD_CLASS}
                keyboardType="decimal-pad"
                onChangeText={setPricePerKg}
                placeholder="e.g. 45"
                value={pricePerKg}
              />
              {fieldErrors.pricePerKg ? (
                <Text className="text-caption text-danger">{fieldErrors.pricePerKg}</Text>
              ) : null}
            </TextField>
          </View>
        </View>

        <FormSelect
          error={fieldErrors.county}
          label="County"
          listLabel="Choose a county"
          onValueChange={setCountyValue}
          options={COUNTY_OPTIONS}
          placeholder="Select county"
          value={countyValue}
        />
      </View>
    ) : (
      <View className="gap-section">
        <View className="gap-section-title">
          <Label>Grade (optional)</Label>
          <View className="flex-row flex-wrap gap-2">
            {listingGradeOptions(grade).map((item) => {
              const selected = grade === item;
              return (
                <Button
                  key={item}
                  size="sm"
                  variant={selected ? "primary" : "secondary"}
                  onPress={() => setGrade(selected ? "" : item)}
                >
                  {item}
                </Button>
              );
            })}
          </View>
          {fieldErrors.grade ? (
            <Text className="text-caption text-danger">{fieldErrors.grade}</Text>
          ) : null}
        </View>

        <TextField>
          <Label>Variety (optional)</Label>
          <Input
            className={FIELD_CLASS}
            onChangeText={setVariety}
            placeholder="e.g. Shangi"
            value={variety}
          />
        </TextField>

        <View className="gap-section-title">
          <Label>Tags</Label>
          <View className="flex-row flex-wrap gap-2">
            {LISTING_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <Button
                  key={tag}
                  size="sm"
                  variant={selected ? "primary" : "secondary"}
                  onPress={() =>
                    setTags((current) =>
                      current.includes(tag)
                        ? current.filter((item) => item !== tag)
                        : [...current, tag],
                    )
                  }
                >
                  {LISTING_TAG_LABELS[tag]}
                </Button>
              );
            })}
          </View>
        </View>

        <View className="gap-section-title">
          <Label>Packaging (optional)</Label>
          <View className="flex-row flex-wrap gap-2">
            {LISTING_PACKAGING.map((item) => {
              const selected = packaging === item;
              return (
                <Button
                  key={item}
                  size="sm"
                  variant={selected ? "primary" : "secondary"}
                  onPress={() => setPackaging(selected ? undefined : item)}
                >
                  {LISTING_PACKAGING_LABELS[item]}
                </Button>
              );
            })}
          </View>
        </View>

        <TextField isInvalid={Boolean(fieldErrors.packUnitKg)}>
          <Label>Pack unit kg (optional)</Label>
          <Input
            className={FIELD_CLASS}
            keyboardType="decimal-pad"
            onChangeText={setPackUnitKg}
            placeholder="e.g. 20"
            value={packUnitKg}
          />
          {fieldErrors.packUnitKg ? (
            <Text className="text-caption text-danger">{fieldErrors.packUnitKg}</Text>
          ) : null}
        </TextField>

        <TextField isInvalid={Boolean(fieldErrors.minOrderKg)}>
          <Label>Min order kg (optional)</Label>
          <Input
            className={FIELD_CLASS}
            keyboardType="decimal-pad"
            onChangeText={setMinOrderKg}
            placeholder="e.g. 500"
            value={minOrderKg}
          />
          {fieldErrors.minOrderKg ? (
            <Text className="text-caption text-danger">{fieldErrors.minOrderKg}</Text>
          ) : null}
        </TextField>

        <TextField>
          <Label>Size / calibre (optional)</Label>
          <Input
            className={FIELD_CLASS}
            onChangeText={setSizeOrCalibre}
            placeholder="e.g. 18 count, 45–65 mm"
            value={sizeOrCalibre}
          />
        </TextField>

        <TextField>
          <Label>Harvest window (optional)</Label>
          <Input
            className={FIELD_CLASS}
            onChangeText={setHarvestWindowLabel}
            placeholder="e.g. picked last week"
            value={harvestWindowLabel}
          />
        </TextField>

        <TextField isRequired isInvalid={Boolean(fieldErrors.description)}>
          <Label>Description</Label>
          <Input
            className={FIELD_CLASS}
            multiline
            numberOfLines={4}
            onChangeText={setDescription}
            placeholder="Describe quality, harvest timing, delivery options..."
            value={description}
          />
          {fieldErrors.description ? (
            <Text className="text-caption text-danger">{fieldErrors.description}</Text>
          ) : null}
        </TextField>

        <ListingReviewSummary
          county={countyValue.value}
          crop={crop}
          description={description}
          grade={grade}
          imagePreviewUrl={imagePreviewUrl}
          pricePerKg={pricePerKg}
          quantityKg={quantityKg}
        />

        {submitError ? <Text className="text-caption text-danger">{submitError}</Text> : null}
      </View>
    );

  const wizardActions = (
    <View className="flex-row gap-3">
      {step === 1 ? (
        onCancel ? (
          <Button className="flex-1" size="sm" variant="secondary" onPress={onCancel}>
            Cancel
          </Button>
        ) : (
          <View className="flex-1" />
        )
      ) : (
        <Button className="flex-1" size="sm" variant="secondary" onPress={handleBack}>
          Back
        </Button>
      )}

      {step < 4 ? (
        <Button className="flex-1" size="sm" onPress={handleNext}>
          Continue
        </Button>
      ) : (
        <Button
          className="flex-1"
          isDisabled={isSubmitting}
          size="sm"
          onPress={() => {
            void handleSubmit();
          }}
        >
          {isSubmitting ? "Creating..." : "Create listing"}
        </Button>
      )}
    </View>
  );

  return (
    <View className="max-h-full min-h-0 flex-1">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-section pb-4"
      >
        <View className="gap-1">
          <Text className="text-section-title">Create listing</Text>
          <Text className="text-caption text-muted">
            Listings sync live across mobile and web.
          </Text>
        </View>

        <StepIndicator step={step} />
        {wizardStepContent}
      </ScrollView>
      <View className="border-t border-separator pt-3">{wizardActions}</View>
    </View>
  );
}
