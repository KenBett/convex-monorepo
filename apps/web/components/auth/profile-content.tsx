"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import {
  BUSINESS_TYPES,
  COUNTIES,
  type BusinessType,
} from "@repo/types";
import { getInitials } from "@repo/utils";
import {
  Avatar,
  Button,
  Input,
  ListBox,
  Select,
} from "@heroui/react";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";

import { ThemeListBox } from "@/components/theme-list-box";

export function ProfileContent() {
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
  const { signOut } = useAuthActions();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cooperativeName, setCooperativeName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("individual");
  const [county, setCounty] = useState<string>(COUNTIES[0]);
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
    setCounty(farmerProfile.county);
    setPhoneNumber(farmerProfile.phoneNumber);
    setMpesaNumber(farmerProfile.mpesaNumber);
  }, [farmerProfile]);

  useEffect(() => {
    if (!buyerProfile) {
      return;
    }
    setBusinessName(buyerProfile.businessName);
    setBusinessType(buyerProfile.businessType);
    setCounty(buyerProfile.county);
    setPhoneNumber(buyerProfile.phoneNumber);
  }, [buyerProfile]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!viewer?.role) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    setIsSaving(true);
    try {
      await updateProfile({ name });

      if (viewer.role === "farmer") {
        await updateFarmerProfile({
          cooperativeName,
          county,
          phoneNumber,
          mpesaNumber,
        });
      } else {
        await updateBuyerProfile({
          businessName,
          businessType,
          county,
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

  const displayName = viewer?.name ?? viewer?.email ?? "Account";
  const initials = getInitials(viewer?.name, viewer?.email);
  const isProfileLoading =
    viewer === undefined ||
    (viewer.role === "farmer" && farmerProfile === undefined) ||
    (viewer.role === "buyer" && buyerProfile === undefined);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex items-center gap-4 rounded-lg bg-surface p-5 text-surface-foreground shadow-sm dark:shadow-none">
        <Avatar size="lg">
          {viewer?.image ? (
            <Avatar.Image
              alt={displayName}
              referrerPolicy="no-referrer"
              src={viewer.image}
            />
          ) : null}
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{displayName}</h1>
          {viewer?.email ? (
            <p className="truncate text-sm text-muted">{viewer.email}</p>
          ) : null}
        </div>
        <Button
          className="rounded-full bg-accent text-accent-foreground"
          isDisabled={isSigningOut}
          onPress={() => void handleSignOut()}
          size="sm"
          variant="primary"
        >
          <span className="text-sm font-semibold tracking-tight">
            {isSigningOut ? "Signing out…" : "Sign out"}
          </span>
        </Button>
      </div>

      <form
        className="flex flex-col gap-4 rounded-lg bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none"
        onSubmit={(event) => void handleProfileSubmit(event)}
      >
        <div>
          <h2 className="text-sm font-semibold">Profile details</h2>
          <p className="mt-1 text-sm text-muted">
            Update your account and contact information.
          </p>
        </div>

        <Input
          aria-label="Display name"
          fullWidth
          onChange={(event) => setName(event.target.value)}
          placeholder="Display name"
          value={name}
        />

        {viewer?.role === "farmer" ? (
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
        ) : null}

        {viewer?.role === "buyer" ? (
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
        ) : null}

        {viewer?.role ? (
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
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {savedMessage ? (
          <p className="text-sm text-success">{savedMessage}</p>
        ) : null}

        <Button
          className="rounded-full"
          isDisabled={isSaving || isProfileLoading}
          type="submit"
          variant="primary"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="rounded-lg bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <ThemeListBox />
      </div>
    </div>
  );
}
