import type { IllustrationDefinition, IllustrationName } from "./types";

/** Accent-themed marketplace illustrations — primary / highlight / muted color slots. */
export const ILLUSTRATION_REGISTRY: Record<IllustrationName, IllustrationDefinition> = {
  "auth-welcome": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 130, rx: 70, ry: 12, slot: "muted", opacity: 0.5 },
      { type: "rect", x: 55, y: 95, width: 90, height: 35, rx: 6, slot: "muted" },
      { type: "path", d: "M70 95 L100 55 L130 95 Z", slot: "primary" },
      { type: "rect", x: 88, y: 72, width: 24, height: 18, rx: 2, slot: "highlight" },
      { type: "circle", cx: 145, cy: 50, r: 18, slot: "highlight", opacity: 0.85 },
      { type: "path", d: "M145 38 Q155 45 145 52 Q135 45 145 38", slot: "primary" },
      { type: "circle", cx: 55, cy: 58, r: 14, slot: "highlight", opacity: 0.6 },
    ],
  },
  "onboarding-farmer": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 65, ry: 10, slot: "muted", opacity: 0.45 },
      { type: "path", d: "M40 120 Q100 80 160 120 L160 130 L40 130 Z", slot: "highlight", opacity: 0.7 },
      { type: "path", d: "M60 120 L100 70 L140 120 Z", slot: "primary" },
      { type: "rect", x: 92, y: 88, width: 16, height: 32, slot: "primary" },
      { type: "circle", cx: 100, cy: 78, r: 12, slot: "highlight" },
      { type: "path", d: "M75 105 Q85 95 95 105", slot: "muted" },
      { type: "path", d: "M105 105 Q115 95 125 105", slot: "muted" },
      { type: "rect", x: 130, y: 100, width: 28, height: 20, rx: 4, slot: "highlight", opacity: 0.8 },
    ],
  },
  "onboarding-buyer": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 65, ry: 10, slot: "muted", opacity: 0.45 },
      { type: "rect", x: 50, y: 85, width: 100, height: 40, rx: 8, slot: "primary" },
      { type: "rect", x: 58, y: 93, width: 84, height: 24, rx: 4, slot: "highlight", opacity: 0.85 },
      { type: "circle", cx: 72, cy: 105, r: 8, slot: "muted" },
      { type: "circle", cx: 100, cy: 105, r: 8, slot: "muted" },
      { type: "circle", cx: 128, cy: 105, r: 8, slot: "muted" },
      { type: "path", d: "M85 55 L100 40 L115 55 L110 70 L90 70 Z", slot: "highlight" },
      { type: "rect", x: 140, y: 60, width: 22, height: 28, rx: 3, slot: "primary", opacity: 0.9 },
    ],
  },
  "empty-search": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 60, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "circle", cx: 88, cy: 78, r: 36, slot: "muted", opacity: 0.35 },
      { type: "circle", cx: 88, cy: 78, r: 28, slot: "highlight", opacity: 0.5 },
      { type: "rect", x: 112, y: 98, width: 8, height: 32, rx: 4, slot: "primary", opacity: 0.9 },
      { type: "rect", x: 108, y: 124, width: 16, height: 8, rx: 2, slot: "primary", opacity: 0.9 },
      { type: "path", d: "M55 110 Q70 95 85 110", slot: "primary", opacity: 0.6 },
      { type: "path", d: "M115 55 Q130 40 145 55", slot: "highlight", opacity: 0.7 },
      { type: "circle", cx: 145, cy: 55, r: 6, slot: "primary" },
    ],
  },
  "empty-chat": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 62, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "rect", x: 45, y: 50, width: 110, height: 65, rx: 12, slot: "muted", opacity: 0.35 },
      { type: "rect", x: 52, y: 58, width: 70, height: 14, rx: 7, slot: "highlight", opacity: 0.75 },
      { type: "rect", x: 52, y: 80, width: 90, height: 14, rx: 7, slot: "primary", opacity: 0.85 },
      { type: "rect", x: 52, y: 102, width: 55, height: 14, rx: 7, slot: "highlight", opacity: 0.55 },
      { type: "path", d: "M155 115 L170 130 L155 125 Z", slot: "primary", opacity: 0.8 },
      { type: "circle", cx: 155, cy: 45, r: 14, slot: "highlight" },
    ],
  },
  "empty-listings": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 68, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "rect", x: 55, y: 55, width: 90, height: 70, rx: 8, slot: "muted", opacity: 0.3 },
      { type: "rect", x: 62, y: 62, width: 76, height: 40, rx: 4, slot: "highlight", opacity: 0.65 },
      { type: "path", d: "M62 102 L100 78 L138 102 Z", slot: "primary" },
      { type: "rect", x: 88, y: 108, width: 24, height: 10, rx: 2, slot: "primary", opacity: 0.8 },
      { type: "circle", cx: 145, cy: 52, r: 10, slot: "highlight" },
      { type: "rect", x: 48, y: 48, width: 18, height: 18, rx: 4, slot: "primary", opacity: 0.5 },
    ],
  },
  "empty-dashboard": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 66, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "rect", x: 40, y: 48, width: 120, height: 75, rx: 10, slot: "muted", opacity: 0.3 },
      { type: "rect", x: 52, y: 60, width: 40, height: 28, rx: 4, slot: "highlight", opacity: 0.7 },
      { type: "rect", x: 100, y: 60, width: 48, height: 28, rx: 4, slot: "primary", opacity: 0.75 },
      { type: "rect", x: 52, y: 96, width: 96, height: 18, rx: 4, slot: "highlight", opacity: 0.45 },
      { type: "path", d: "M52 96 L80 78 L108 96 L136 82 L148 96", slot: "primary", opacity: 0.85 },
    ],
  },
  "empty-orders": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 64, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "rect", x: 58, y: 52, width: 84, height: 72, rx: 6, slot: "muted", opacity: 0.35 },
      { type: "rect", x: 66, y: 60, width: 68, height: 12, rx: 2, slot: "highlight", opacity: 0.7 },
      { type: "rect", x: 66, y: 78, width: 50, height: 8, rx: 2, slot: "primary", opacity: 0.6 },
      { type: "rect", x: 66, y: 92, width: 58, height: 8, rx: 2, slot: "primary", opacity: 0.5 },
      { type: "rect", x: 66, y: 106, width: 40, height: 8, rx: 2, slot: "primary", opacity: 0.4 },
      { type: "circle", cx: 130, cy: 48, r: 16, slot: "highlight", opacity: 0.8 },
      { type: "path", d: "M124 48 L128 52 L136 44", slot: "primary", opacity: 0.9 },
    ],
  },
  "not-found": {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 70, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "path", d: "M50 115 Q100 45 150 115 Z", slot: "muted", opacity: 0.25 },
      { type: "circle", cx: 75, cy: 85, r: 22, slot: "highlight", opacity: 0.65 },
      { type: "circle", cx: 125, cy: 85, r: 22, slot: "highlight", opacity: 0.65 },
      { type: "rect", x: 70, y: 105, width: 60, height: 8, rx: 4, slot: "primary" },
      { type: "path", d: "M85 55 L100 70 L115 55", slot: "primary", opacity: 0.7 },
      { type: "circle", cx: 100, cy: 50, r: 8, slot: "primary" },
    ],
  },
  error: {
    viewBox: "0 0 200 160",
    shapes: [
      { type: "ellipse", cx: 100, cy: 132, rx: 66, ry: 10, slot: "muted", opacity: 0.4 },
      { type: "circle", cx: 100, cy: 78, r: 38, slot: "muted", opacity: 0.3 },
      { type: "circle", cx: 100, cy: 78, r: 30, slot: "highlight", opacity: 0.55 },
      { type: "rect", x: 92, y: 62, width: 16, height: 32, rx: 3, slot: "primary" },
      { type: "circle", cx: 100, cy: 102, r: 5, slot: "primary" },
      { type: "path", d: "M55 55 L65 65 M65 55 L55 65", slot: "primary", opacity: 0.5 },
      { type: "path", d: "M135 55 L145 65 M145 55 L135 65", slot: "primary", opacity: 0.5 },
    ],
  },
};

export function getIllustrationDefinition(name: IllustrationName): IllustrationDefinition {
  return ILLUSTRATION_REGISTRY[name];
}
