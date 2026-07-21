"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { DateValue } from "@internationalized/date";

import { api } from "@repo/backend/convex/_generated/api";
import {
  COUNTIES,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CERTIFICATIONS,
  LISTING_CERTIFICATION_LABELS,
  LISTING_FORM_STEP_COUNT,
  LISTING_FORM_STEP_LABELS,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  LISTING_TAGS,
  LISTING_TAG_LABELS,
  listingFormDefaults,
  listingGradeOptions,
  parseListingForm,
  validateListingFormStep,
  type CropType,
  type County,
  type ListingCertification,
  type ListingFormFieldErrors,
  type ListingFormInput,
  type ListingFormStep,
  type ListingPackaging,
  type ListingTag,
} from "@repo/types";
import {
  Button,
  DateField,
  DateRangePicker,
  Input,
  Label,
  ListBox,
  RangeCalendar,
  Select,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import clsx from "clsx";
import { useMutation } from "convex/react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  FileText,
  Package,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useState, type ReactNode } from "react";

import { ListingImagePicker } from "@/components/farmer/listing-image-picker";
import { CropBadge, CropPickerGrid } from "@/components/farmer/crop-display";

const READY_NOW_HARVEST_LABEL = "Ready now";

/** Light: white + shadow; selected black. Dark: leave HeroUI secondary / accent. */
const CHIP_IDLE =
  "rounded-full bg-background shadow-sm dark:bg-default dark:shadow-none";
const CHIP_SELECTED =
  "rounded-full bg-foreground text-background shadow-sm dark:bg-accent dark:text-accent-foreground dark:shadow-none";

type HarvestDateRange = {
  start: DateValue;
  end: DateValue;
};

function parseHarvestRange(label: string): HarvestDateRange | null {
  const match = label
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})$/);

  if (!match?.[1] || !match[2]) {
    return null;
  }
  try {
    return { start: parseDate(match[1]), end: parseDate(match[2]) };
  } catch {
    return null;
  }
}

function formatHarvestRange(range: HarvestDateRange): string {
  return `${range.start.toString()} – ${range.end.toString()}`;
}

function ListingFormSection({
  children,
  description,
  icon: Icon,
  showSeparator = true,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: LucideIcon;
  showSeparator?: boolean;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      {showSeparator ? (
        <div
          aria-hidden
          className="border-t border-separator pt-1"
          role="presentation"
        />
      ) : null}
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-field-background text-muted dark:border dark:border-separator">
          <Icon aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function HarvestWindowField({
  hideLabel = false,
  value,
  onChange,
}: {
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<"ready" | "range" | null>(() => {
    if (value === READY_NOW_HARVEST_LABEL) {
      return "ready";
    }
    if (value.trim()) {
      return "range";
    }

    return null;
  });
  const [range, setRange] = useState<HarvestDateRange | null>(() =>
    parseHarvestRange(value),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {hideLabel ? null : <Label>Harvest window (optional)</Label>}
      <div className="flex flex-wrap gap-2">
        <Button
          className={mode === "ready" ? CHIP_SELECTED : CHIP_IDLE}
          size="sm"
          type="button"
          variant={mode === "ready" ? "primary" : "secondary"}
          onPress={() => {
            if (mode === "ready") {
              setMode(null);
              setRange(null);
              onChange("");

              return;
            }
            setMode("ready");
            setRange(null);
            setCalendarOpen(false);
            onChange(READY_NOW_HARVEST_LABEL);
          }}
        >
          Ready now
        </Button>
        <Button
          className={mode === "range" ? CHIP_SELECTED : CHIP_IDLE}
          size="sm"
          type="button"
          variant={mode === "range" ? "primary" : "secondary"}
          onPress={() => {
            if (mode === "range") {
              setMode(null);
              setRange(null);
              setCalendarOpen(false);
              onChange("");

              return;
            }
            setMode("range");
            if (value === READY_NOW_HARVEST_LABEL) {
              onChange("");
            }
            setCalendarOpen(true);
          }}
        >
          Select dates
        </Button>
      </div>

      {mode === "range" ? (
        <DateRangePicker
          className="w-full"
          endName="harvestEnd"
          isOpen={calendarOpen}
          startName="harvestStart"
          value={range}
          onChange={(next) => {
            setRange(next);
            onChange(next ? formatHarvestRange(next) : "");
          }}
          onOpenChange={setCalendarOpen}
        >
          <DateField.Group fullWidth>
            <DateField.Input slot="start">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DateRangePicker.Trigger>
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover>
            <RangeCalendar aria-label="Harvest window">
              <RangeCalendar.Header>
                <RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.YearPickerTriggerHeading />
                  <RangeCalendar.YearPickerTriggerIndicator />
                </RangeCalendar.YearPickerTrigger>
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {(day) => (
                    <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                  )}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>
                  {(date) => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
              <RangeCalendar.YearPickerGrid>
                <RangeCalendar.YearPickerGridBody>
                  {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                </RangeCalendar.YearPickerGridBody>
              </RangeCalendar.YearPickerGrid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>
      ) : null}
    </div>
  );
}

type ListingFormProps = {
  embedded?: boolean;
  /** When creating in demo mode, attach listing to this farmer/coop. */
  farmerId?: Id<"farmerProfiles">;
  listingId?: Id<"listings">;
  initialValues?: ListingFormInput;
  initialImageUrl?: string | null;
  /** Temporary demo inventory console. */
  mode?: "farmer" | "demo";
  onCancel?: () => void;
  onSubmitted: () => void;
};

function StepIndicator({ step }: { step: ListingFormStep }) {
  return (
    <div
      aria-label={`Step ${step} of ${LISTING_FORM_STEP_COUNT}: ${LISTING_FORM_STEP_LABELS[step - 1]}`}
      aria-valuemax={LISTING_FORM_STEP_COUNT}
      aria-valuemin={1}
      aria-valuenow={step}
      className="w-full"
      role="progressbar"
    >
      <ol className="flex w-full items-start">
        {LISTING_FORM_STEP_LABELS.map((label, index) => {
          const stepNumber = (index + 1) as ListingFormStep;
          const completed = stepNumber < step;
          const current = stepNumber === step;
          const upcoming = stepNumber > step;

          return (
            <li
              key={label}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden
                  className={clsx(
                    "absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2",
                    stepNumber <= step ? "bg-accent" : "bg-separator",
                  )}
                />
              ) : null}
              {index < LISTING_FORM_STEP_COUNT - 1 ? (
                <span
                  aria-hidden
                  className={clsx(
                    "absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2",
                    stepNumber < step ? "bg-accent" : "bg-separator",
                  )}
                />
              ) : null}

              <span
                className={clsx(
                  "relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                  completed && "bg-accent text-accent-foreground",
                  current && "border-2 border-accent bg-background text-accent",
                  upcoming &&
                    "border border-separator bg-background text-muted",
                )}
              >
                {completed ? (
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                ) : (
                  stepNumber
                )}
              </span>

              <span
                className={clsx(
                  "mt-2 max-w-full px-1 text-center text-[11px] leading-tight sm:text-xs",
                  upcoming ? "text-muted" : "font-medium text-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type ReviewSummaryProps = {
  county: string;
  crop: CropType;
  description: string;
  grade: string;
  imagePreviewUrl: string | null;
  pricePerKg: string;
  quantityKg: string;
  tags: ListingTag[];
  variety: string;
};

function ListingReviewSummary({
  county,
  crop,
  description,
  grade,
  imagePreviewUrl,
  pricePerKg,
  quantityKg,
  tags,
  variety,
}: ReviewSummaryProps) {
  const theme = getCropTheme(crop);
  const bgClass = getListingCardBgClass(crop);
  const trimmedDescription = description.trim();
  const parsedQuantity = Number(quantityKg);
  const parsedPrice = Number(pricePerKg);
  const attributeLine = [
    variety.trim() || null,
    tags.length > 0
      ? tags.map((tag) => LISTING_TAG_LABELS[tag]).join(", ")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <Label>Review your listing</Label>
      <div
        className={clsx(
          "flex flex-col gap-3 overflow-hidden rounded-xl shadow-sm",
          bgClass,
        )}
      >
        {imagePreviewUrl ? (
          <div className="relative h-32 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${theme.label} preview`}
              className="h-full w-full object-cover"
              src={imagePreviewUrl}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 p-4 pt-0">
          <div className="flex items-center gap-2.5">
            <CropBadge crop={crop} size="md" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {theme.label}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {Number.isFinite(parsedPrice) && parsedPrice > 0
                ? `KES ${parsedPrice}`
                : "—"}
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                /kg
              </span>
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {Number.isFinite(parsedQuantity) && parsedQuantity > 0
                ? `${parsedQuantity} kg`
                : "—"}
            </p>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {county}
            {grade.trim() ? ` · ${grade.trim()}` : ""}
            {attributeLine ? ` · ${attributeLine}` : ""}
          </p>

          {trimmedDescription.length > 0 ? (
            <p className="border-l-2 border-neutral-300/60 pl-2.5 text-xs italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400">
              &ldquo;{trimmedDescription}&rdquo;
            </p>
          ) : (
            <p className="text-xs italic text-neutral-500 dark:text-neutral-500">
              No description yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type FormFieldsProps = {
  certifications: ListingCertification[];
  county: County;
  crop: CropType;
  description: string;
  fieldErrors: ListingFormFieldErrors;
  grade: string;
  harvestWindowLabel: string;
  imagePreviewUrl: string | null;
  imageStorageId: Id<"_storage"> | null;
  minOrderKg: string;
  onCertificationsChange: (value: ListingCertification[]) => void;
  onCountyChange: (county: County) => void;
  onCropChange: (crop: CropType) => void;
  onDescriptionChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onHarvestWindowLabelChange: (value: string) => void;
  onImageChange: (
    storageId: Id<"_storage"> | null,
    previewUrl: string | null,
  ) => void;
  onMinOrderKgChange: (value: string) => void;
  onPackagingChange: (value: ListingPackaging | undefined) => void;
  onPackUnitKgChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSizeOrCalibreChange: (value: string) => void;
  onTagsChange: (value: ListingTag[]) => void;
  onVarietyChange: (value: string) => void;
  packaging: ListingPackaging | undefined;
  packUnitKg: string;
  pricePerKg: string;
  quantityKg: string;
  sizeOrCalibre: string;
  tags: ListingTag[];
  variety: string;
  /** When true, only quality/tags/packaging/harvest/description (wizard step 4). */
  attributesOnly?: boolean;
  cropPickerVariant?: "compact" | "expanded";
  mode?: "farmer" | "demo";
  showReview?: boolean;
};

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function ListingFormFields({
  attributesOnly = false,
  certifications,
  county,
  crop,
  cropPickerVariant = "compact",
  description,
  fieldErrors,
  grade,
  harvestWindowLabel,
  imagePreviewUrl,
  imageStorageId,
  minOrderKg,
  mode = "farmer",
  onCertificationsChange,
  onCountyChange,
  onCropChange,
  onDescriptionChange,
  onGradeChange,
  onHarvestWindowLabelChange,
  onImageChange,
  onMinOrderKgChange,
  onPackagingChange,
  onPackUnitKgChange,
  onPriceChange,
  onQuantityChange,
  onSizeOrCalibreChange,
  onTagsChange,
  onVarietyChange,
  packaging,
  packUnitKg,
  pricePerKg,
  quantityKg,
  showReview = false,
  sizeOrCalibre,
  tags,
  variety,
}: FormFieldsProps) {
  return (
    <>
      {attributesOnly ? null : (
        <>
          <CropPickerGrid
            error={fieldErrors.crop}
            value={crop}
            variant={cropPickerVariant}
            onChange={onCropChange}
          />

          <ListingImagePicker
            error={fieldErrors.imageStorageId}
            initialPreviewUrl={imagePreviewUrl}
            mode={mode}
            value={imageStorageId}
            onChange={onImageChange}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Input
                fullWidth
                required
                aria-label="Quantity in kg"
                placeholder="Quantity (kg)"
                type="number"
                value={quantityKg}
                onChange={(event) => onQuantityChange(event.target.value)}
              />
              {fieldErrors.quantityKg ? (
                <p className="text-sm text-danger">{fieldErrors.quantityKg}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Input
                fullWidth
                required
                aria-label="Price per kg"
                placeholder="Price per kg (KES)"
                type="number"
                value={pricePerKg}
                onChange={(event) => onPriceChange(event.target.value)}
              />
              {fieldErrors.pricePerKg ? (
                <p className="text-sm text-danger">{fieldErrors.pricePerKg}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Select
              aria-label="County"
              placeholder="Select county"
              selectedKey={county}
              onSelectionChange={(key) => {
                if (key) {
                  onCountyChange(String(key) as County);
                }
              }}
            >
              <Label>County</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {COUNTIES.map((item) => (
                    <ListBox.Item key={item} id={item} textValue={item}>
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
        </>
      )}

      <ListingFormSection
        description="Grade and variety help buyers match quality specs."
        icon={Sparkles}
        showSeparator={!attributesOnly}
        title="Quality"
      >
        <div className="flex flex-col gap-2">
          <Label>Grade (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {listingGradeOptions(grade).map((item) => {
              const selected = grade === item;

              return (
                <Button
                  key={item}
                  className={selected ? CHIP_SELECTED : CHIP_IDLE}
                  size="sm"
                  type="button"
                  variant={selected ? "primary" : "secondary"}
                  onPress={() => onGradeChange(selected ? "" : item)}
                >
                  {item}
                </Button>
              );
            })}
          </div>
          {fieldErrors.grade ? (
            <p className="text-sm text-danger">{fieldErrors.grade}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            fullWidth
            aria-label="Variety"
            placeholder="Variety (optional)"
            value={variety}
            onChange={(event) => onVarietyChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Input
            fullWidth
            aria-label="Size or calibre"
            placeholder="Size / calibre (optional), e.g. 18 count, 45–65 mm"
            value={sizeOrCalibre}
            onChange={(event) => onSizeOrCalibreChange(event.target.value)}
          />
        </div>
      </ListingFormSection>

      <ListingFormSection
        description="Helps buyers find you in natural-language search."
        icon={Tags}
        title="Tags"
      >
        <div className="flex flex-wrap gap-2">
          {LISTING_TAGS.map((tag) => {
            const selected = tags.includes(tag);

            return (
              <Button
                key={tag}
                className={selected ? CHIP_SELECTED : CHIP_IDLE}
                size="sm"
                type="button"
                variant={selected ? "primary" : "secondary"}
                onPress={() => onTagsChange(toggleInList(tags, tag))}
              >
                {LISTING_TAG_LABELS[tag]}
              </Button>
            );
          })}
        </div>
      </ListingFormSection>

      <ListingFormSection
        description="Optional proof for hotels, chains, and exporters."
        icon={BadgeCheck}
        title="Certifications"
      >
        <div className="flex flex-wrap gap-2">
          {LISTING_CERTIFICATIONS.map((cert) => {
            const selected = certifications.includes(cert);

            return (
              <Button
                key={cert}
                className={selected ? CHIP_SELECTED : CHIP_IDLE}
                size="sm"
                type="button"
                variant={selected ? "primary" : "secondary"}
                onPress={() =>
                  onCertificationsChange(toggleInList(certifications, cert))
                }
              >
                {LISTING_CERTIFICATION_LABELS[cert]}
              </Button>
            );
          })}
        </div>
      </ListingFormSection>

      <ListingFormSection
        description="How the produce is packed and ordered in bulk."
        icon={Package}
        title="Packaging & orders"
      >
        <div className="flex flex-wrap gap-2">
          {LISTING_PACKAGING.map((item) => {
            const selected = packaging === item;

            return (
              <Button
                key={item}
                className={selected ? CHIP_SELECTED : CHIP_IDLE}
                size="sm"
                type="button"
                variant={selected ? "primary" : "secondary"}
                onPress={() => onPackagingChange(selected ? undefined : item)}
              >
                {LISTING_PACKAGING_LABELS[item]}
              </Button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Input
              fullWidth
              aria-label="Pack unit kg"
              inputMode="decimal"
              placeholder="Pack unit kg (optional)"
              type="number"
              value={packUnitKg}
              onChange={(event) => onPackUnitKgChange(event.target.value)}
            />
            {fieldErrors.packUnitKg ? (
              <p className="text-sm text-danger">{fieldErrors.packUnitKg}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <Input
              fullWidth
              aria-label="Minimum order kg"
              inputMode="decimal"
              placeholder="Min order kg (optional)"
              type="number"
              value={minOrderKg}
              onChange={(event) => onMinOrderKgChange(event.target.value)}
            />
            {fieldErrors.minOrderKg ? (
              <p className="text-sm text-danger">{fieldErrors.minOrderKg}</p>
            ) : null}
          </div>
        </div>
      </ListingFormSection>

      <ListingFormSection
        description="When this lot is ready for buyers."
        icon={CalendarDays}
        title="Harvest window"
      >
        <HarvestWindowField
          hideLabel
          value={harvestWindowLabel}
          onChange={onHarvestWindowLabelChange}
        />
      </ListingFormSection>

      <ListingFormSection
        description="Anything else buyers should know."
        icon={FileText}
        title="Description"
      >
        <div className="flex flex-col gap-1">
          <Input
            fullWidth
            required
            aria-label="Description"
            placeholder="Describe quality, harvest timing, delivery options..."
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          {fieldErrors.description ? (
            <p className="text-sm text-danger">{fieldErrors.description}</p>
          ) : null}
        </div>
      </ListingFormSection>

      {showReview ? (
        <ListingReviewSummary
          county={county}
          crop={crop}
          description={description}
          grade={grade}
          imagePreviewUrl={imagePreviewUrl}
          pricePerKg={pricePerKg}
          quantityKg={quantityKg}
          tags={tags}
          variety={variety}
        />
      ) : null}
    </>
  );
}

export function ListingForm({
  embedded = false,
  farmerId,
  initialValues,
  initialImageUrl = null,
  listingId,
  mode = "farmer",
  onCancel,
  onSubmitted,
}: ListingFormProps) {
  const createFarmerListing = useMutation(api.listings.createListing);
  const updateFarmerListing = useMutation(api.listings.updateListing);
  const createDemoListing = useMutation(api.listings.demoInventory.create);
  const updateDemoListing = useMutation(api.listings.demoInventory.update);
  const useWizard = !listingId && embedded;

  const defaults = initialValues ?? listingFormDefaults();
  const [step, setStep] = useState<ListingFormStep>(1);
  const [crop, setCrop] = useState<CropType>(defaults.crop);
  const [county, setCounty] = useState(defaults.county);
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
  const [certifications, setCertifications] = useState<ListingCertification[]>(
    defaults.certifications ?? [],
  );
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
    defaults.imageStorageId
      ? (defaults.imageStorageId as Id<"_storage">)
      : null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialImageUrl,
  );
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formValues = {
    certifications,
    crop,
    county,
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
  ) => {
    setImageStorageId(storageId);
    setImagePreviewUrl(previewUrl);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
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
        const updatePayload = {
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
        };

        if (mode === "demo") {
          await updateDemoListing(updatePayload);
        } else {
          await updateFarmerListing(updatePayload);
        }
      } else {
        if (!imageStorageId) {
          setFieldErrors({ imageStorageId: "Listing photo is required" });

          return;
        }

        const createPayload = {
          certifications: parsed.data.certifications,
          county: parsed.data.county,
          crop: parsed.data.crop,
          description: parsed.data.description,
          grade: gradeValue,
          harvestWindowLabel:
            parsed.data.harvestWindowLabel?.trim() || undefined,
          imageStorageId,
          minOrderKg: parsed.data.minOrderKg,
          packaging: parsed.data.packaging,
          packUnitKg: parsed.data.packUnitKg,
          pricePerKg: parsed.data.pricePerKg,
          quantityKg: parsed.data.quantityKg,
          sizeOrCalibre: parsed.data.sizeOrCalibre?.trim() || undefined,
          tags: parsed.data.tags,
          variety: parsed.data.variety?.trim() || undefined,
        };

        if (mode === "demo") {
          if (!farmerId) {
            setSubmitError("Select a cooperative before creating a listing.");

            return;
          }
          await createDemoListing({ ...createPayload, farmerId });
        } else {
          await createFarmerListing(createPayload);
        }
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

  const handleNext = () => {
    setSubmitError(null);
    const result = validateListingFormStep(step, formValues);

    if (!result.success) {
      setFieldErrors(result.errors);

      return;
    }

    setFieldErrors({});
    setStep((current) => Math.min(current + 1, 4) as ListingFormStep);
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 1) as ListingFormStep);
  };

  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col gap-5"
    : "flex flex-col gap-5 rounded-lg bg-surface p-6 text-surface-foreground shadow-sm dark:shadow-none";

  if (!useWizard) {
    return (
      <form
        className={shellClass}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <h2 className="text-lg font-semibold tracking-tight">
          {listingId ? "Edit listing" : "Create listing"}
        </h2>

        <ListingFormFields
          certifications={certifications}
          county={county}
          crop={crop}
          description={description}
          fieldErrors={fieldErrors}
          grade={grade}
          harvestWindowLabel={harvestWindowLabel}
          imagePreviewUrl={imagePreviewUrl}
          imageStorageId={imageStorageId}
          minOrderKg={minOrderKg}
          mode={mode}
          packUnitKg={packUnitKg}
          packaging={packaging}
          pricePerKg={pricePerKg}
          quantityKg={quantityKg}
          sizeOrCalibre={sizeOrCalibre}
          tags={tags}
          variety={variety}
          onCertificationsChange={setCertifications}
          onCountyChange={setCounty}
          onCropChange={setCrop}
          onDescriptionChange={setDescription}
          onGradeChange={setGrade}
          onHarvestWindowLabelChange={setHarvestWindowLabel}
          onImageChange={handleImageChange}
          onMinOrderKgChange={setMinOrderKg}
          onPackUnitKgChange={setPackUnitKg}
          onPackagingChange={setPackaging}
          onPriceChange={setPricePerKg}
          onQuantityChange={setQuantityKg}
          onSizeOrCalibreChange={setSizeOrCalibre}
          onTagsChange={setTags}
          onVarietyChange={setVariety}
        />

        {submitError ? (
          <p className="text-sm text-danger">{submitError}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {onCancel ? (
            <Button type="button" variant="secondary" onPress={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button isDisabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Saving..."
              : listingId
                ? "Save changes"
                : "Create listing"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={shellClass}>
      <div className="shrink-0">
        <h2 className="text-lg font-semibold tracking-tight">Create listing</h2>
      </div>

      <div className="shrink-0">
        <StepIndicator step={step} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-medium text-foreground">
              What are you selling?
            </h3>
            <CropPickerGrid
              error={fieldErrors.crop}
              value={crop}
              variant="expanded"
              onChange={setCrop}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              <h3 className="text-base font-medium text-foreground">
                Add a listing photo
              </h3>
              <p className="mt-1 text-sm text-muted">
                Buyers are more likely to contact you when they can see your
                crop.
              </p>
            </div>

            <ListingImagePicker
              hideLabel
              error={fieldErrors.imageStorageId}
              initialPreviewUrl={imagePreviewUrl}
              mode={mode}
              value={imageStorageId}
              onChange={handleImageChange}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-medium text-foreground">
              Listing details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Input
                  fullWidth
                  required
                  aria-label="Quantity in kg"
                  placeholder="Quantity (kg)"
                  type="number"
                  value={quantityKg}
                  onChange={(event) => setQuantityKg(event.target.value)}
                />
                {fieldErrors.quantityKg ? (
                  <p className="text-sm text-danger">
                    {fieldErrors.quantityKg}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  fullWidth
                  required
                  aria-label="Price per kg"
                  placeholder="Price per kg (KES)"
                  type="number"
                  value={pricePerKg}
                  onChange={(event) => setPricePerKg(event.target.value)}
                />
                {fieldErrors.pricePerKg ? (
                  <p className="text-sm text-danger">
                    {fieldErrors.pricePerKg}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Select
                aria-label="County"
                placeholder="Select county"
                selectedKey={county}
                onSelectionChange={(key) => {
                  if (key) {
                    setCounty(String(key) as County);
                  }
                }}
              >
                <Label>County</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {COUNTIES.map((item) => (
                      <ListBox.Item key={item} id={item} textValue={item}>
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
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-5">
            <ListingFormFields
              attributesOnly
              showReview
              certifications={certifications}
              county={county}
              crop={crop}
              description={description}
              fieldErrors={fieldErrors}
              grade={grade}
              harvestWindowLabel={harvestWindowLabel}
              imagePreviewUrl={imagePreviewUrl}
              imageStorageId={imageStorageId}
              minOrderKg={minOrderKg}
              mode={mode}
              packUnitKg={packUnitKg}
              packaging={packaging}
              pricePerKg={pricePerKg}
              quantityKg={quantityKg}
              sizeOrCalibre={sizeOrCalibre}
              tags={tags}
              variety={variety}
              onCertificationsChange={setCertifications}
              onCountyChange={setCounty}
              onCropChange={setCrop}
              onDescriptionChange={setDescription}
              onGradeChange={setGrade}
              onHarvestWindowLabelChange={setHarvestWindowLabel}
              onImageChange={handleImageChange}
              onMinOrderKgChange={setMinOrderKg}
              onPackUnitKgChange={setPackUnitKg}
              onPackagingChange={setPackaging}
              onPriceChange={setPricePerKg}
              onQuantityChange={setQuantityKg}
              onSizeOrCalibreChange={setSizeOrCalibre}
              onTagsChange={setTags}
              onVarietyChange={setVariety}
            />
          </div>
        ) : null}

        {submitError ? (
          <p className="text-sm text-danger">{submitError}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-separator pt-4">
        {step === 1 ? (
          onCancel ? (
            <Button
              className="flex-1"
              type="button"
              variant="secondary"
              onPress={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <div className="flex-1" />
          )
        ) : (
          <Button
            className="flex-1"
            type="button"
            variant="secondary"
            onPress={handleBack}
          >
            Back
          </Button>
        )}

        {step < 4 ? (
          <Button className="flex-1" type="button" onPress={handleNext}>
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1"
            isDisabled={isSubmitting}
            type="button"
            onPress={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Creating..." : "Create listing"}
          </Button>
        )}
      </div>
    </div>
  );
}
