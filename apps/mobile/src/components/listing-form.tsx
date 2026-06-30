import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import {
  COUNTIES,
  CROP_TYPES,
  listingFormDefaults,
  parseListingForm,
  type ListingFormFieldErrors,
  type ListingFormInput,
} from "@repo/types";
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
import { Text, View } from "react-native";

type SelectOption = {
  label: string;
  value: string;
};

const CROP_OPTIONS: SelectOption[] = CROP_TYPES.map((crop) => ({
  value: crop,
  label: crop.charAt(0).toUpperCase() + crop.slice(1),
}));

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
        <Select.Trigger>
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
}: ListingFormProps): JSX.Element {
  const createListing = useMutation(api.listings.createListing);
  const updateListing = useMutation(api.listings.updateListing);

  const defaults = initialValues ?? listingFormDefaults();
  const [cropValue, setCropValue] = useState<SelectOption>(() =>
    findOption(CROP_OPTIONS, defaults.crop),
  );
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
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    const parsed = parseListingForm({
      crop: cropValue.value,
      county: countyValue.value,
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
    <Surface variant="default" className="gap-section rounded-card p-card-lg shadow-elevated">
      <Text className="text-section-title">
        {listingId ? "Edit listing" : "Create listing"}
      </Text>

      <FormSelect
        error={fieldErrors.crop}
        label="Crop"
        listLabel="Choose a crop"
        onValueChange={setCropValue}
        options={CROP_OPTIONS}
        placeholder="Select crop"
        value={cropValue}
      />

      <TextField isRequired isInvalid={Boolean(fieldErrors.quantityKg)}>
        <Label>Quantity (kg)</Label>
        <Input
          keyboardType="decimal-pad"
          onChangeText={setQuantityKg}
          placeholder="e.g. 500"
          value={quantityKg}
        />
        {fieldErrors.quantityKg ? (
          <TextField.ErrorMessage>{fieldErrors.quantityKg}</TextField.ErrorMessage>
        ) : null}
      </TextField>

      <TextField isRequired isInvalid={Boolean(fieldErrors.pricePerKg)}>
        <Label>Price per kg (KES)</Label>
        <Input
          keyboardType="decimal-pad"
          onChangeText={setPricePerKg}
          placeholder="e.g. 45"
          value={pricePerKg}
        />
        {fieldErrors.pricePerKg ? (
          <TextField.ErrorMessage>{fieldErrors.pricePerKg}</TextField.ErrorMessage>
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

      <TextField isRequired isInvalid={Boolean(fieldErrors.description)}>
        <Label>Description</Label>
        <Input
          multiline
          numberOfLines={4}
          onChangeText={setDescription}
          placeholder="Describe quality, harvest timing, delivery options..."
          value={description}
        />
        {fieldErrors.description ? (
          <TextField.ErrorMessage>{fieldErrors.description}</TextField.ErrorMessage>
        ) : null}
      </TextField>

      {submitError ? <Text className="text-caption text-danger">{submitError}</Text> : null}

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
    </Surface>
  );
}
