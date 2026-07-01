export const ILLUSTRATION_NAMES = [
  "auth-welcome",
  "onboarding-farmer",
  "onboarding-buyer",
  "empty-search",
  "empty-chat",
  "empty-listings",
  "empty-dashboard",
  "empty-orders",
  "not-found",
  "error",
] as const;

export type IllustrationName = (typeof ILLUSTRATION_NAMES)[number];

export type IllustrationColorSlot = "primary" | "highlight" | "muted";

export type IllustrationShape =
  | {
      type: "path";
      d: string;
      slot: IllustrationColorSlot;
      opacity?: number;
    }
  | {
      type: "circle";
      cx: number;
      cy: number;
      r: number;
      slot: IllustrationColorSlot;
      opacity?: number;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      slot: IllustrationColorSlot;
      opacity?: number;
    }
  | {
      type: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      slot: IllustrationColorSlot;
      opacity?: number;
    };

export type IllustrationDefinition = {
  viewBox: string;
  shapes: readonly IllustrationShape[];
};

export type IllustrationColors = {
  primary: string;
  highlight: string;
  muted: string;
};

export type AppIllustrationProps = {
  name: IllustrationName;
  size?: number;
  className?: string;
  colors?: Partial<IllustrationColors>;
};

import type { ReactNode } from "react";

export type AppEmptyStateProps = {
  illustration: IllustrationName;
  title: string;
  description?: string;
  action?: ReactNode;
  illustrationSize?: number;
  className?: string;
  colors?: Partial<IllustrationColors>;
};
