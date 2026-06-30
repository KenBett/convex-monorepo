import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
  type MarketplaceRole,
} from "@repo/types";
import { roleHomeSegment } from "@repo/utils";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import {
  Button,
  Input,
  Label,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Surface,
  TextField,
  useThemeColor,
} from "heroui-native";
import { Fragment, useState, type JSX, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from "react-native";

type OnboardingStep = "role" | "profile";

type SelectOption = {
  value: string;
  label: string;
};

const COUNTY_OPTIONS: SelectOption[] = COUNTIES.map((county) => ({
  value: county,
  label: county,
}));

const BUSINESS_TYPE_OPTIONS: SelectOption[] = BUSINESS_TYPES.map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

function getRoleHomePath(role: MarketplaceRole): Href {
  return `/(${roleHomeSegment(role)})` as Href;
}

function OnboardingLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      className="bg-background flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow px-screen-x pb-screen-bottom pt-screen-top"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full grow justify-center py-4">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OnboardingCard({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Surface
      variant="default"
      className="w-full max-w-sm gap-section self-center rounded-card p-card-lg shadow-elevated"
    >
      {children}
    </Surface>
  );
}

function OnboardingHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <View className="gap-section-title">
      <Text className="text-page-title text-center">{title}</Text>
      <Text className="text-caption text-center">{description}</Text>
    </View>
  );
}

function FormSelect({
  label,
  listLabel,
  onValueChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  listLabel: string;
  onValueChange: (option: SelectOption) => void;
  options: SelectOption[];
  placeholder: string;
  value: SelectOption | undefined;
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
    </View>
  );
}

export function OnboardingFlow(): JSX.Element {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const setUserRole = useMutation(api.users.setUserRole);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const foregroundColor = useThemeColor("foreground");

  const [step, setStep] = useState<OnboardingStep>("role");
  const [role, setRole] = useState<MarketplaceRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cooperativeName, setCooperativeName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessTypeValue, setBusinessTypeValue] = useState<SelectOption>(
    () =>
      BUSINESS_TYPE_OPTIONS.find((option) => option.value === "individual") ??
      BUSINESS_TYPE_OPTIONS[0]!,
  );
  const [countyValue, setCountyValue] = useState<SelectOption>(
    () => COUNTY_OPTIONS[0]!,
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");

  // Resume at the profile step if the role was already chosen in a prior session.
  // Render-time sync (not an effect) per React's "you might not need an effect".
  const [syncedRole, setSyncedRole] = useState<MarketplaceRole | null>(null);
  if (viewer?.role && viewer.role !== syncedRole) {
    setSyncedRole(viewer.role);
    setRole(viewer.role);
    setStep("profile");
  }

  const handleRoleContinue = async (): Promise<void> => {
    if (!role) {
      setError("Choose whether you are a farmer or a buyer.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await setUserRole({ role });
      setStep("profile");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your role.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (): Promise<void> => {
    if (!role) {
      setError("Select a role before completing your profile.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const county = countyValue.value;
      const businessType = businessTypeValue.value as BusinessType;

      if (role === "farmer") {
        await completeOnboarding({
          farmerProfile: {
            cooperativeName,
            county,
            phoneNumber,
            mpesaNumber,
          },
        });
      } else {
        await completeOnboarding({
          buyerProfile: {
            businessName,
            businessType,
            county,
            phoneNumber,
          },
        });
      }
      router.replace(getRoleHomePath(role));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete onboarding.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (viewer === undefined) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  if (step === "role") {
    return (
      <OnboardingLayout>
        <OnboardingCard>
          <OnboardingHeader
            description="Choose your role to continue. This cannot be skipped."
            title="How will you use Offtake?"
          />

          <RadioGroup
            onValueChange={(value) => {
              setRole(value as MarketplaceRole);
              setError(null);
            }}
            value={role ?? undefined}
          >
            <RadioGroup.Item value="farmer">
              {({ isSelected }) => (
                <>
                  <Label>I&apos;m a Farmer</Label>
                  <Radio variant="secondary">
                    <Radio.Indicator
                      className={
                        isSelected
                          ? "size-3 border-2 border-accent bg-accent"
                          : "size-3 border-2 border-foreground/35 bg-background"
                      }
                    >
                      {isSelected ? (
                        <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                      ) : null}
                    </Radio.Indicator>
                  </Radio>
                </>
              )}
            </RadioGroup.Item>
            <Separator className="my-1" />
            <RadioGroup.Item value="buyer">
              {({ isSelected }) => (
                <>
                  <Label>I&apos;m a Buyer</Label>
                  <Radio variant="secondary">
                    <Radio.Indicator
                      className={
                        isSelected
                          ? "size-3 border-2 border-accent bg-accent"
                          : "size-3 border-2 border-foreground/35 bg-background"
                      }
                    >
                      {isSelected ? (
                        <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                      ) : null}
                    </Radio.Indicator>
                  </Radio>
                </>
              )}
            </RadioGroup.Item>
          </RadioGroup>

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <Button
            className="w-full"
            isDisabled={!role || isSubmitting}
            onPress={() => void handleRoleContinue()}
            size="sm"
            variant="primary"
          >
            <Button.Label>{isSubmitting ? "Saving…" : "Continue"}</Button.Label>
          </Button>
        </OnboardingCard>
      </OnboardingLayout>
    );
  }

  if (!role) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={foregroundColor} size="large" />
      </View>
    );
  }

  return (
    <OnboardingLayout>
      <OnboardingCard>
        <OnboardingHeader
          description={
            role === "farmer"
              ? "Tell buyers who you are and how to reach you."
              : "Tell farmers about your business."
          }
          title="Complete your profile"
        />

        <View className="gap-section">
          {role === "farmer" ? (
            <>
              <TextField isRequired>
                <Label>Cooperative name</Label>
                <Input
                  onChangeText={setCooperativeName}
                  placeholder="Cooperative or farm name"
                  value={cooperativeName}
                />
              </TextField>
              <TextField isRequired>
                <Label>Phone number</Label>
                <Input
                  keyboardType="phone-pad"
                  onChangeText={setPhoneNumber}
                  placeholder="Phone number"
                  value={phoneNumber}
                />
              </TextField>
              <TextField isRequired>
                <Label>M-Pesa number</Label>
                <Input
                  keyboardType="phone-pad"
                  onChangeText={setMpesaNumber}
                  placeholder="M-Pesa number"
                  value={mpesaNumber}
                />
              </TextField>
            </>
          ) : (
            <>
              <TextField isRequired>
                <Label>Business name</Label>
                <Input
                  onChangeText={setBusinessName}
                  placeholder="Business name"
                  value={businessName}
                />
              </TextField>
              <FormSelect
                label="Business type"
                listLabel="Business type"
                onValueChange={setBusinessTypeValue}
                options={BUSINESS_TYPE_OPTIONS}
                placeholder="Choose business type"
                value={businessTypeValue}
              />
              <TextField isRequired>
                <Label>Phone number</Label>
                <Input
                  keyboardType="phone-pad"
                  onChangeText={setPhoneNumber}
                  placeholder="Phone number"
                  value={phoneNumber}
                />
              </TextField>
            </>
          )}

          <FormSelect
            label="County"
            listLabel="County"
            onValueChange={setCountyValue}
            options={COUNTY_OPTIONS}
            placeholder="Choose county"
            value={countyValue}
          />
        </View>

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}

        <Button
          className="w-full"
          isDisabled={isSubmitting}
          onPress={() => void handleProfileSubmit()}
          size="sm"
          variant="primary"
        >
          <Button.Label>{isSubmitting ? "Saving…" : "Finish setup"}</Button.Label>
        </Button>
      </OnboardingCard>
    </OnboardingLayout>
  );
}
