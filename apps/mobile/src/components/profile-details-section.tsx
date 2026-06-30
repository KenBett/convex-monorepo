import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
} from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import {
  Button,
  Input,
  Label,
  Select,
  Separator,
  Surface,
  TextField,
} from "heroui-native";
import { Fragment, useEffect, useState, type JSX } from "react";
import { Text, View } from "react-native";

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

function ProfileSelect({
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

export function ProfileDetailsSection(): JSX.Element | null {
  const viewer = useQuery(api.users.viewer);
  const farmerProfile = useQuery(
    api.users.farmerProfile,
    viewer?.role === "farmer" ? {} : "skip",
  );
  const buyerProfile = useQuery(
    api.users.buyerProfile,
    viewer?.role === "buyer" ? {} : "skip",
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const updateFarmerProfile = useMutation(api.users.updateFarmerProfile);
  const updateBuyerProfile = useMutation(api.users.updateBuyerProfile);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cooperativeName, setCooperativeName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessTypeValue, setBusinessTypeValue] = useState<SelectOption>(
    () => BUSINESS_TYPE_OPTIONS[0]!,
  );
  const [countyValue, setCountyValue] = useState<SelectOption>(
    () => COUNTY_OPTIONS[0]!,
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");

  useEffect(() => {
    if (!viewer) {
      return;
    }
    setName(viewer.name ?? "");
  }, [viewer]);

  useEffect(() => {
    if (!farmerProfile) {
      return;
    }
    setCooperativeName(farmerProfile.cooperativeName);
    setCountyValue({
      value: farmerProfile.county,
      label: farmerProfile.county,
    });
    setPhoneNumber(farmerProfile.phoneNumber);
    setMpesaNumber(farmerProfile.mpesaNumber);
  }, [farmerProfile]);

  useEffect(() => {
    if (!buyerProfile) {
      return;
    }
    setBusinessName(buyerProfile.businessName);
    setBusinessTypeValue(
      BUSINESS_TYPE_OPTIONS.find(
        (option) => option.value === buyerProfile.businessType,
      ) ?? BUSINESS_TYPE_OPTIONS[0]!,
    );
    setCountyValue({
      value: buyerProfile.county,
      label: buyerProfile.county,
    });
    setPhoneNumber(buyerProfile.phoneNumber);
  }, [buyerProfile]);

  if (!viewer?.role) {
    return null;
  }

  const isProfileLoading =
    (viewer.role === "farmer" && farmerProfile === undefined) ||
    (viewer.role === "buyer" && buyerProfile === undefined);

  const handleSave = async (): Promise<void> => {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);
    try {
      await updateProfile({ name });

      if (viewer.role === "farmer") {
        await updateFarmerProfile({
          cooperativeName,
          county: countyValue.value,
          phoneNumber,
          mpesaNumber,
        });
      } else {
        await updateBuyerProfile({
          businessName,
          businessType: businessTypeValue.value as BusinessType,
          county: countyValue.value,
          phoneNumber,
        });
      }

      setSavedMessage("Profile updated.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="gap-section-title">
      <Text className="text-section-title">Profile details</Text>
      <Surface variant="default" className="gap-section rounded-card p-card shadow-elevated">
        <TextField>
          <Label>Display name</Label>
          <Input
            onChangeText={setName}
            placeholder="Display name"
            value={name}
          />
        </TextField>

        {viewer.role === "farmer" ? (
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
            <ProfileSelect
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

        <ProfileSelect
          label="County"
          listLabel="County"
          onValueChange={setCountyValue}
          options={COUNTY_OPTIONS}
          placeholder="Choose county"
          value={countyValue}
        />

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}
        {savedMessage ? (
          <Text className="text-sm text-success">{savedMessage}</Text>
        ) : null}

        <Button
          className="w-full"
          isDisabled={isSaving || isProfileLoading}
          onPress={() => void handleSave()}
          size="sm"
          variant="primary"
        >
          <Button.Label>{isSaving ? "Saving…" : "Save changes"}</Button.Label>
        </Button>
      </Surface>
    </View>
  );
}
