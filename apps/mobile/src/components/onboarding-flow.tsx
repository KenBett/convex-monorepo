import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
  type MarketplaceRole,
} from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Button, ListGroup, Radio, Separator, Surface } from "heroui-native";
import { Fragment, useEffect, useState, type JSX } from "react";
import { Text, TextInput, View } from "react-native";

type OnboardingStep = "role" | "profile";

function getRoleHomePath(role: MarketplaceRole): Href {
  return (role === "farmer" ? "/(farmer)" : "/(buyer)") as Href;
}

function formatBusinessType(type: BusinessType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function OnboardingFlow(): JSX.Element {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const setUserRole = useMutation(api.users.setUserRole);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = useState<OnboardingStep>("role");
  const [role, setRole] = useState<MarketplaceRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cooperativeName, setCooperativeName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("individual");
  const [county, setCounty] = useState<string>(COUNTIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");

  useEffect(() => {
    if (!viewer?.role) {
      return;
    }
    setRole(viewer.role);
    setStep("profile");
  }, [viewer?.role]);

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
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  if (step === "role") {
    return (
      <View className="bg-background flex-1 items-center justify-center px-6">
        <Surface variant="default" className="w-full max-w-sm gap-6 rounded-card p-8 shadow-elevated">
          <Text className="text-center text-2xl font-semibold text-foreground">
            How will you use Offtake?
          </Text>
          <Text className="text-center text-sm text-muted">
            Choose your role to continue. This cannot be skipped.
          </Text>

          <ListGroup>
            {(["farmer", "buyer"] as const).map((option, index) => {
              const isSelected = role === option;
              const label = option === "farmer" ? "I'm a Farmer" : "I'm a Buyer";

              return (
                <Fragment key={option}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  <ListGroup.Item
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    className="min-h-touch gap-4 py-4"
                    onPress={() => {
                      setRole(option);
                      setError(null);
                    }}
                  >
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>{label}</ListGroup.ItemTitle>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix>
                      <Radio
                        isSelected={isSelected}
                        onSelectedChange={() => {
                          setRole(option);
                          setError(null);
                        }}
                      >
                        {({ isSelected: selected }) => (
                          <Radio.Indicator
                            className={
                              selected
                                ? "size-3 border-2 border-accent bg-accent"
                                : "size-3 border-2 border-foreground/35 bg-background"
                            }
                          >
                            {selected ? (
                              <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                            ) : null}
                          </Radio.Indicator>
                        )}
                      </Radio>
                    </ListGroup.ItemSuffix>
                  </ListGroup.Item>
                </Fragment>
              );
            })}
          </ListGroup>

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <Button
            isDisabled={!role || isSubmitting}
            onPress={() => void handleRoleContinue()}
            size="sm"
          >
            <Button.Label>{isSubmitting ? "Saving…" : "Continue"}</Button.Label>
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1 items-center justify-center px-6">
      <Surface variant="default" className="w-full max-w-sm gap-4 rounded-card p-8 shadow-elevated">
        <Text className="text-center text-2xl font-semibold text-foreground">
          Complete your profile
        </Text>
        <Text className="mb-2 text-center text-sm text-muted">
          {role === "farmer"
            ? "Tell buyers who you are and how to reach you."
            : "Tell farmers about your business."}
        </Text>

        {role === "farmer" ? (
          <>
            <View className="gap-2">
              <Text className="text-caption text-muted">Cooperative name</Text>
              <TextInput
                className="min-h-touch rounded-control border border-separator bg-background px-4 text-foreground"
                onChangeText={setCooperativeName}
                placeholder="Cooperative or farm name"
                value={cooperativeName}
              />
            </View>
            <View className="gap-2">
              <Text className="text-caption text-muted">Phone number</Text>
              <TextInput
                className="min-h-touch rounded-control border border-separator bg-background px-4 text-foreground"
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                value={phoneNumber}
              />
            </View>
            <View className="gap-2">
              <Text className="text-caption text-muted">M-Pesa number</Text>
              <TextInput
                className="min-h-touch rounded-control border border-separator bg-background px-4 text-foreground"
                keyboardType="phone-pad"
                onChangeText={setMpesaNumber}
                placeholder="M-Pesa number"
                value={mpesaNumber}
              />
            </View>
          </>
        ) : (
          <>
            <View className="gap-2">
              <Text className="text-caption text-muted">Business name</Text>
              <TextInput
                className="min-h-touch rounded-control border border-separator bg-background px-4 text-foreground"
                onChangeText={setBusinessName}
                placeholder="Business name"
                value={businessName}
              />
            </View>
            <View className="gap-2">
              <Text className="text-caption text-muted">Business type</Text>
              <ListGroup>
                {BUSINESS_TYPES.map((type, index) => {
                  const isSelected = businessType === type;
                  return (
                    <Fragment key={type}>
                      {index > 0 ? <Separator className="mx-4" /> : null}
                      <ListGroup.Item
                        className="min-h-touch py-3"
                        onPress={() => setBusinessType(type)}
                      >
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>
                            {formatBusinessType(type)}
                          </ListGroup.ItemTitle>
                        </ListGroup.ItemContent>
                        <ListGroup.ItemSuffix>
                          <Radio isSelected={isSelected} onSelectedChange={() => setBusinessType(type)}>
                            {({ isSelected: selected }) => (
                              <Radio.Indicator
                                className={
                                  selected
                                    ? "size-3 border-2 border-accent bg-accent"
                                    : "size-3 border-2 border-foreground/35 bg-background"
                                }
                              >
                                {selected ? (
                                  <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                                ) : null}
                              </Radio.Indicator>
                            )}
                          </Radio>
                        </ListGroup.ItemSuffix>
                      </ListGroup.Item>
                    </Fragment>
                  );
                })}
              </ListGroup>
            </View>
            <View className="gap-2">
              <Text className="text-caption text-muted">Phone number</Text>
              <TextInput
                className="min-h-touch rounded-control border border-separator bg-background px-4 text-foreground"
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                value={phoneNumber}
              />
            </View>
          </>
        )}

        <View className="gap-2">
          <Text className="text-caption text-muted">County</Text>
          <ListGroup>
            {COUNTIES.map((item, index) => {
              const isSelected = county === item;
              return (
                <Fragment key={item}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  <ListGroup.Item
                    className="min-h-touch py-3"
                    onPress={() => setCounty(item)}
                  >
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>{item}</ListGroup.ItemTitle>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix>
                      <Radio isSelected={isSelected} onSelectedChange={() => setCounty(item)}>
                        {({ isSelected: selected }) => (
                          <Radio.Indicator
                            className={
                              selected
                                ? "size-3 border-2 border-accent bg-accent"
                                : "size-3 border-2 border-foreground/35 bg-background"
                            }
                          >
                            {selected ? (
                              <Radio.IndicatorThumb className="size-3 bg-accent-foreground" />
                            ) : null}
                          </Radio.Indicator>
                        )}
                      </Radio>
                    </ListGroup.ItemSuffix>
                  </ListGroup.Item>
                </Fragment>
              );
            })}
          </ListGroup>
        </View>

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}

        <Button
          isDisabled={isSubmitting}
          onPress={() => void handleProfileSubmit()}
          size="sm"
        >
          <Button.Label>{isSubmitting ? "Saving…" : "Finish setup"}</Button.Label>
        </Button>
      </Surface>
    </View>
  );
}
