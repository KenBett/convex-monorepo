/**
 * Lightweight SSE client for the /voice/turn streaming endpoint.
 *
 * Usage:
 *   const client = createVoiceStreamClient({ convexSiteUrl, getAuthToken });
 *   client.streamTurn({ audioBase64, mimeType, filename, history, voice }, callbacks);
 */

import type { KnowledgeSearchResult } from "@repo/types";

import { VoiceClientTelemetry } from "./voice-telemetry";

export type VoiceStreamCallbacks = {
  onStt?: (text: string) => void;
  onSources?: (sources: KnowledgeSearchResult[]) => void;
  onLlmDelta?: (text: string) => void;
  onTtsChunk?: (audioBase64: string, index: number) => void;
  onDone?: (answer: string, sources: KnowledgeSearchResult[]) => void;
  onError?: (message: string) => void;
};

export type VoiceTurnRequest = {
  audioBase64: string;
  mimeType?: string;
  filename?: string;
  history?: Array<{ content: string; role: "assistant" | "user" }>;
  voice?: string;
};

export type VoiceStreamClient = {
  streamTurn: (
    req: VoiceTurnRequest,
    callbacks: VoiceStreamCallbacks,
  ) => Promise<void>;
};

export function createVoiceStreamClient(options: {
  convexSiteUrl: string;
  getAuthToken: () => Promise<string | null>;
}): VoiceStreamClient {
  const { convexSiteUrl, getAuthToken } = options;

  const streamTurn = async (
    req: VoiceTurnRequest,
    callbacks: VoiceStreamCallbacks,
  ): Promise<void> => {
    const tel = new VoiceClientTelemetry();

    const token = await getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${convexSiteUrl.replace(/\/$/, "")}/voice/turn`;

    const response = await fetch(url, {
      body: JSON.stringify(req),
      headers,
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      callbacks.onError?.(text);
      return;
    }

    if (!response.body) {
      callbacks.onError?.("No response body");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const parseEvents = (chunk: string) => {
      buffer += chunk;
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n");
        let eventType = "";
        let dataLine = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataLine = line.slice(6).trim();
          }
        }

        if (!eventType || !dataLine) continue;

        let data: unknown;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }

        switch (eventType) {
          case "stt": {
            const d = data as { text: string };
            tel.markStt();
            callbacks.onStt?.(d.text);
            break;
          }
          case "sources": {
            const d = data as { sources: KnowledgeSearchResult[] };
            tel.markDb(false); // server logs cache status; client just marks timing
            callbacks.onSources?.(d.sources);
            break;
          }
          case "llm_delta": {
            const d = data as { text: string };
            tel.markLlmFirstToken(); // no-op after first call
            callbacks.onLlmDelta?.(d.text);
            break;
          }
          case "tts_chunk": {
            const d = data as { audioBase64: string; index: number };
            tel.markTtsFirstByte(); // no-op after first call
            callbacks.onTtsChunk?.(d.audioBase64, d.index);
            break;
          }
          case "done": {
            const d = data as { answer: string; sources: KnowledgeSearchResult[] };
            tel.markDone();
            callbacks.onDone?.(d.answer, d.sources);
            break;
          }
          case "error": {
            const d = data as { message: string };
            callbacks.onError?.(d.message);
            break;
          }
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parseEvents(decoder.decode(value, { stream: true }));
    }

    // Flush any remaining buffered text.
    if (buffer.trim()) parseEvents("\n\n");
  };

  return { streamTurn };
}

/**
 * Derive the Convex site URL from the Convex cloud URL.
 * e.g. https://foo-bar-123.convex.cloud → https://foo-bar-123.convex.site
 */
export function convexSiteUrlFromCloudUrl(convexUrl: string): string {
  return convexUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
}
