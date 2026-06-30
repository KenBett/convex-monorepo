import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
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
  type ListingFormFieldErrors,
  type ListingFormInput,
  type ListingFormStep,
} from "@repo/types";
import { CropBadge, CropPickerGrid } from "@/components/crop-display";
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
import { Fragment, useState, type JSX } from "react";
import { ScrollView, Text, View } from "react-native";

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
      accessibilityLabel={`Step ${step} of ${LISTING_FORM_STEP_COUNT}`}
      accessibilityRole="progressbar"
      className="gap-2"
    >
      <View className="flex-row gap-1.5">
        {Array.from({ length: LISTING_FORM_STEP_COUNT }, (_, index) => {
          const stepNumber = (index + 1) as ListingFormStep;
          return (
            <View
              key={stepNumber}
              className={`h-1 flex-1 rounded-full ${
                stepNumber <= step ? "bg-accent" : "bg-separator"
              }`}
            />
          );
        })}
      </View>
      <Text className="text-caption text-muted">
        Step {step} of {LISTING_FORM_STEP_COUNT} · {LISTING_FORM_STEP_LABELS[step - 1]}
      </Text>
    </View>
  );
}

function ListingReviewSummary({
  county,
  crop,
  description,
  grade,
  pricePerKg,
  quantityKg,
}: {
  county: string;
  crop: CropType;
  description: string;
  grade: string;
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
      <View className={`gap-3 rounded-xl p-4 shadow-sm ${bgClass}`}>
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
  );
}

type ListingFormProps = {
  embedded?: boolean;
  embeddedLayout?: "stack" | "modal";
  listingId?: Id<"listings">;
  initialValues?: ListingFormInput;
  onCancel?: () => void;
  onSubmitted: () => void;
};

export function ListingForm({
  embedded = false,
  embeddedLayout = "stack",
  initialValues,
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
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = {
    crop,
    county: countyValue.value,
    description,
    grade,
    pricePerKg,
    quantityKg,
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
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue ?? "",
          listingId,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
        });
      } else {
        await createListing({
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue,
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

  const handleNext = (): void => {
    setSubmitError(null);
    const result = validateListingFormStep(step, formValues);
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    setStep((current) => Math.min(current + 1, 3) as ListingFormStep);
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

      <TextField isInvalid={Boolean(fieldErrors.grade)}>
        <Label>Grade (optional)</Label>
        <Input
          className={FIELD_CLASS}
          onChangeText={setGrade}
          placeholder="e.g. Grade 1"
          value={grade}
        />
        {fieldErrors.grade ? (
          <Text className="text-caption text-danger">{fieldErrors.grade}</Text>
        ) : null}
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
          <Text className="text-section-title">Listing details</Text>
          <Text className="text-caption text-muted">
            Quantity, price, and county help buyers find your produce.
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
        <View className="gap-1">
          <Text className="text-section-title">Final details</Text>
          <Text className="text-caption text-muted">
            Add optional grade info and a description, then review before posting.
          </Text>
        </View>

        <TextField isInvalid={Boolean(fieldErrors.grade)}>
          <Label>Grade (optional)</Label>
          <Input
            className={FIELD_CLASS}
            onChangeText={setGrade}
            placeholder="e.g. Grade 1"
            value={grade}
          />
          {fieldErrors.grade ? (
            <Text className="text-caption text-danger">{fieldErrors.grade}</Text>
          ) : null}
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

      {step < 3 ? (
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
