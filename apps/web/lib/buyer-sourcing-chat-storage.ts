import type { UIMessage } from "ai";

const STORAGE_PREFIX = "buyer-sourcing-chat:";

export function getBuyerSourcingChatStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadBuyerSourcingMessages<UI_MESSAGE extends UIMessage>(
  userId: string,
): UI_MESSAGE[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getBuyerSourcingChatStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as UI_MESSAGE[];
  } catch {
    return [];
  }
}

export function saveBuyerSourcingMessages<UI_MESSAGE extends UIMessage>(
  userId: string,
  messages: UI_MESSAGE[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getBuyerSourcingChatStorageKey(userId),
      JSON.stringify(messages),
    );
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function clearBuyerSourcingMessages(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getBuyerSourcingChatStorageKey(userId));
}
