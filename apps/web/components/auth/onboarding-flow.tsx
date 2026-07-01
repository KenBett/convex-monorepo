"use client";

import { AppIllustration } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
  type MarketplaceRole,
} from "@repo/types";
import {
  Button,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
} from "@heroui/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { getRoleHomePath } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { LayoutSkeleton } from "@/components/layout/layout-skeleton";

type OnboardingStep = "role" | "profile";

const AUTH_FORM_CARD =
  "flex flex-col gap-6 rounded-[0.875rem] bg-surface p-6 text-surface-foreground shadow-sm dark:shadow-none";

const ROLE_RADIO_CLASSNAME =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg bg-background p-4 shadow-sm outline-none transition-[background-color,box-shadow] hover:bg-surface-secondary focus-visible:outline-none dark:bg-surface dark:shadow-none dark:hover:bg-surface-secondary data-[selected=true]:bg-accent/5 data-[selected=true]:shadow-md dark:data-[selected=true]:shadow-none";

function roleIndicatorClassName(isSelected: boolean): string {
  return isSelected
    ? "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent after:block after:size-2 after:rounded-full after:bg-accent-foreground"
    : "size-5 shrink-0 rounded-full border-2 border-foreground/45 bg-background dark:border-foreground/65";
}

export function OnboardingFlow() {
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

  const handleRoleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  if (viewer === undefined || viewer === null) {
    return <LayoutSkeleton />;
  }

  if (step === "role") {
    return (
      <AuthSplitLayout>
        <form
          className={AUTH_FORM_CARD}
          onSubmit={(event) => void handleRoleSubmit(event)}
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              How will you use {siteConfig.name}?
            </h1>
            <p className="text-sm text-muted">
              Choose your role to continue. This cannot be skipped.
            </p>
          </div>

          <RadioGroup
            aria-label="Marketplace role"
            className="flex flex-col gap-3"
            value={role ?? undefined}
            onChange={(value) => {
              setRole(value as MarketplaceRole);
              setError(null);
            }}
          >
            <Radio className={ROLE_RADIO_CLASSNAME} value="farmer">
              {({ isSelected }) => (
                <>
                  <Radio.Control className="shrink-0">
                    <Radio.Indicator
                      className={roleIndicatorClassName(isSelected)}
                    />
                  </Radio.Control>
                  <Radio.Content>
                    <div className="flex items-center gap-3">
                      <AppIllustration name="onboarding-farmer" size={52} />
                      <Label>I&apos;m a Farmer</Label>
                    </div>
                  </Radio.Content>
                </>
              )}
            </Radio>
            <Radio className={ROLE_RADIO_CLASSNAME} value="buyer">
              {({ isSelected }) => (
                <>
                  <Radio.Control className="shrink-0">
                    <Radio.Indicator
                      className={roleIndicatorClassName(isSelected)}
                    />
                  </Radio.Control>
                  <Radio.Content>
                    <div className="flex items-center gap-3">
                      <AppIllustration name="onboarding-buyer" size={52} />
                      <Label>I&apos;m a Buyer</Label>
                    </div>
                  </Radio.Content>
                </>
              )}
            </Radio>
          </RadioGroup>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button
            className="rounded-full bg-accent text-accent-foreground"
            isDisabled={!role || isSubmitting}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      </AuthSplitLayout>
    );
  }

  if (!role) {
    return <LayoutSkeleton />;
  }

  return (
    <AuthSplitLayout>
      <form
        className={AUTH_FORM_CARD}
        onSubmit={(event) => void handleProfileSubmit(event)}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Complete your profile
          </h1>
          <p className="text-sm text-muted">
            {role === "farmer"
              ? "Tell buyers who you are and how to reach you."
              : "Tell farmers about your business."}
          </p>
        </div>

        {role === "farmer" ? (
          <>
            <Input
              fullWidth
              required
              aria-label="Cooperative name"
              placeholder="Cooperative or farm name"
              value={cooperativeName}
              onChange={(event) => setCooperativeName(event.target.value)}
            />
            <Input
              fullWidth
              required
              aria-label="Phone number"
              placeholder="Phone number"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
            <Input
              fullWidth
              required
              aria-label="M-Pesa number"
              placeholder="M-Pesa number"
              type="tel"
              value={mpesaNumber}
              onChange={(event) => setMpesaNumber(event.target.value)}
            />
          </>
        ) : (
          <>
            <Input
              fullWidth
              required
              aria-label="Business name"
              placeholder="Business name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
            <Select
              aria-label="Business type"
              placeholder="Business type"
              selectedKey={businessType}
              onSelectionChange={(key) => {
                if (key) {
                  setBusinessType(String(key) as BusinessType);
                }
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {BUSINESS_TYPES.map((type) => (
                    <ListBox.Item key={type} id={type} textValue={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Input
              fullWidth
              required
              aria-label="Phone number"
              placeholder="Phone number"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </>
        )}

        <Select
          aria-label="County"
          placeholder="County"
          selectedKey={county}
          onSelectionChange={(key) => {
            if (key) {
              setCounty(String(key));
            }
          }}
        >
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

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button
          className="rounded-full bg-accent text-accent-foreground"
          isDisabled={isSubmitting}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? "Saving…" : "Finish setup"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
