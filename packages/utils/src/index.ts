// TODO: Add clsx and tailwind-merge for proper class merging
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  MARKETPLACE_ROLES,
  getInitials,
  roleHomeSegment,
} from "./marketplace-routing";

export { VoiceClientTelemetry } from "./voice-telemetry";
export {
  convexSiteUrlFromCloudUrl,
  createVoiceStreamClient,
} from "./voice-stream-client";
export type {
  VoiceStreamCallbacks,
  VoiceStreamClient,
  VoiceTurnRequest,
} from "./voice-stream-client";
