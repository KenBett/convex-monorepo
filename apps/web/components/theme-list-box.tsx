"use client";

import { useEffect, useState } from "react";
import { ListBox } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

type ThemeOptionId = (typeof THEME_OPTIONS)[number]["id"];

export function ThemeListBox() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[132px]" />;
  }

  const selectedTheme = (theme ?? "dark") as ThemeOptionId;

  return (
    <ListBox
      aria-label="Theme"
      selectedKeys={[selectedTheme]}
      selectionMode="single"
      onSelectionChange={(keys) => {
        const next = Array.from(keys)[0];

        if (next) {
          setTheme(String(next));
        }
      }}
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;

        return (
          <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{option.label}</span>
            </div>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        );
      })}
    </ListBox>
  );
}
