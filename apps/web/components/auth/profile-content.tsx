"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import { getInitials } from "@repo/utils";
import { Avatar, Button } from "@heroui/react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { ThemeListBox } from "@/components/theme-list-box";

export function ProfileContent() {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayName = viewer?.name ?? viewer?.email ?? "Account";
  const initials = getInitials(viewer?.name, viewer?.email);

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

      <div className="rounded-lg bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <ThemeListBox />
      </div>
    </div>
  );
}
