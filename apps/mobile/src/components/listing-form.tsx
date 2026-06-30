import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  COUNTIES,
  listingFormDefaults,
  parseListingForm,
  type CropType,
  type ListingFormFieldErrors,
  type ListingFormInput,
} from "@repo/types";
import { CropPickerGrid } from "@/components/crop-display";
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

  const defaults = initialValues ?? listingFormDefaults();
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

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    const parsed = parseListingForm({
      crop,
      county: countyValue.value,
      description,
      grade,
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

  const fields = (
    <>
      <Text className="text-section-title">
        {listingId ? "Edit listing" : "Create listing"}
      </Text>

      <CropPickerGrid
        error={fieldErrors.crop}
        onChange={setCrop}
        value={crop}
      />

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

  const actions = (
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

  if (embedded && embeddedLayout === "modal") {
    return (
      <View className="max-h-full">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-section pb-4"
        >
          {fields}
        </ScrollView>
        <View className="border-t border-separator pt-3">{actions}</View>
      </View>
    );
  }

  const content = (
    <>
      {fields}
      {actions}
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
