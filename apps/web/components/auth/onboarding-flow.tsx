"use client";

import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
  type MarketplaceRole,
} from "@repo/types";
import { Button, Input, Label, ListBox, Radio, RadioGroup, Select } from "@heroui/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { LayoutSkeleton } from "@/components/layout/layout-skeleton";

type OnboardingStep = "role" | "profile";

function getRoleHomePath(role: MarketplaceRole): string {
  return role === "farmer" ? "/farmer" : "/buyer";
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
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
        <form
          className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-surface p-8 text-surface-foreground shadow-sm dark:shadow-none"
          onSubmit={(event) => void handleRoleSubmit(event)}
        >
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              How will you use Offtake?
            </h1>
            <p className="text-sm text-muted">
              Choose your role to continue. This cannot be skipped.
            </p>
          </div>

          <RadioGroup
            aria-label="Marketplace role"
            onChange={(value) => {
              setRole(value as MarketplaceRole);
              setError(null);
            }}
            value={role ?? undefined}
          >
            <Radio value="farmer">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>I&apos;m a Farmer</Label>
              </Radio.Content>
            </Radio>
            <Radio value="buyer">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>I&apos;m a Buyer</Label>
              </Radio.Content>
            </Radio>
          </RadioGroup>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button
            className="rounded-full"
            isDisabled={!role || isSubmitting}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    );
  }

  if (!role) {
    return <LayoutSkeleton />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <form
        className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-surface p-8 text-surface-foreground shadow-sm dark:shadow-none"
        onSubmit={(event) => void handleProfileSubmit(event)}
      >
        <div className="flex flex-col gap-1 text-center">
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
              aria-label="Cooperative name"
              fullWidth
              onChange={(event) => setCooperativeName(event.target.value)}
              placeholder="Cooperative or farm name"
              required
              value={cooperativeName}
            />
            <Input
              aria-label="Phone number"
              fullWidth
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="Phone number"
              required
              type="tel"
              value={phoneNumber}
            />
            <Input
              aria-label="M-Pesa number"
              fullWidth
              onChange={(event) => setMpesaNumber(event.target.value)}
              placeholder="M-Pesa number"
              required
              type="tel"
              value={mpesaNumber}
            />
          </>
        ) : (
          <>
            <Input
              aria-label="Business name"
              fullWidth
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Business name"
              required
              value={businessName}
            />
            <Select
              aria-label="Business type"
              onSelectionChange={(key) => {
                if (key) {
                  setBusinessType(String(key) as BusinessType);
                }
              }}
              placeholder="Business type"
              selectedKey={businessType}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {BUSINESS_TYPES.map((type) => (
                    <ListBox.Item id={type} key={type} textValue={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Input
              aria-label="Phone number"
              fullWidth
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="Phone number"
              required
              type="tel"
              value={phoneNumber}
            />
          </>
        )}

        <Select
          aria-label="County"
          onSelectionChange={(key) => {
            if (key) {
              setCounty(String(key));
            }
          }}
          placeholder="County"
          selectedKey={county}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {COUNTIES.map((item) => (
                <ListBox.Item id={item} key={item} textValue={item}>
                  {item}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button
          className="rounded-full"
          isDisabled={isSubmitting}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? "Saving…" : "Finish setup"}
        </Button>
      </form>
    </div>
  );
}
