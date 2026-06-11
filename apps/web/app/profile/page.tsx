import type { Metadata } from "next";

import { Avatar } from "@heroui/react";

import { ThemeListBox } from "@/components/theme-list-box";
import { siteConfig } from "@/config/site";

const avatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex items-center gap-4 rounded-lg bg-surface p-5 text-surface-foreground shadow-sm dark:shadow-none">
        <Avatar size="lg">
          <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{siteConfig.name}</h1>
          <p className="text-sm text-muted">{siteConfig.description}</p>
        </div>
      </div>

      <div className="rounded-lg bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <ThemeListBox />
      </div>
    </div>
  );
}
