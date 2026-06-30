/**
 * Stateless helpers for the streaming voice RAG pipeline.
 *
 * All functions are plain TypeScript (no Convex decorators) so they can be
 * called from httpAction handlers running in the Node.js environment.
 */

// ─── Telemetry ────────────────────────────────────────────────────────────────

export class VoiceTelemetry {
  private readonly start: number;
  private sttEnd: number | null = null;
  private dbEnd: number | null = null;
  private llmFirstTokenEnd: number | null = null;
  private ttsFirstByteEnd: number | null = null;

  constructor() {
    this.start = performance.now();
  }

  markStt(): void {
    this.sttEnd = performance.now();
    console.log(`[STT Delta] ${Math.round(this.sttEnd - this.start)}ms`);
  }

  markDb(cacheHit: boolean): void {
    this.dbEnd = performance.now();
    const label = cacheHit ? " (cache hit)" : "";
    console.log(
      `[DB Retrieval Delta] ${Math.round(this.dbEnd - (this.sttEnd ?? this.start))}ms${label}`,
    );
  }

  markLlmFirstToken(): void {
    if (this.llmFirstTokenEnd !== null) return; // only log once
    this.llmFirstTokenEnd = performance.now();
    console.log(
      `[LLM First-Token Delta] ${Math.round(this.llmFirstTokenEnd - (this.dbEnd ?? this.sttEnd ?? this.start))}ms`,
    );
  }

  markTtsFirstByte(): void {
    if (this.ttsFirstByteEnd !== null) return; // only log once
    this.ttsFirstByteEnd = performance.now();
    console.log(
      `[TTS First-Byte Delta] ${Math.round(this.ttsFirstByteEnd - (this.llmFirstTokenEnd ?? this.dbEnd ?? this.start))}ms`,
    );
  }

  markDone(): void {
    const total = performance.now() - this.start;
    console.log(`[Total Roundtrip] ${Math.round(total)}ms`);
  }
}

// ─── STT ──────────────────────────────────────────────────────────────────────

export async function transcribeWhisper(
  audioBytes: Uint8Array,
  mimeType: string,
  filename: string,
  openAiKey: string,
): Promise<string> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBytes)], { type: mimeType }),
    filename,
  );
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Whisper STT failed: ${detail || res.statusText}`);
  }

  const payload: { text?: string } = await res.json();
  const text = payload.text?.trim() ?? "";
  if (!text) throw new Error("Could not understand the recording");
  return text;
}

// ─── Context formatting ───────────────────────────────────────────────────────

export function formatContextForPrompt(
  sources: Array<{ text: string; title?: string }>,
): string {
  return sources
    .map((s, i) => `[${i + 1}] ${s.title ? `(${s.title}) ` : ""}${s.text}`)
    .join("\n\n");
}

// ─── Sentence buffer ──────────────────────────────────────────────────────────

export type SentenceChunkCallback = (sentence: string) => void;

export function createSentenceBuffer(
  onChunk: SentenceChunkCallback,
  minWords = 6,
): { push: (delta: string) => void; flush: () => void } {
  let buffer = "";

  const emit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) onChunk(trimmed);
  };

  const push = (delta: string) => {
    buffer += delta;

    // Try to split on sentence-ending punctuation.
    const sentenceEnd = /[.!?]\s+/;
    const parts = buffer.split(sentenceEnd);
    if (parts.length > 1) {
      // All complete parts except the last (which may be incomplete).
      for (let i = 0; i < parts.length - 1; i++) {
        emit(parts[i]!);
      }
      buffer = parts[parts.length - 1]!;
      return;
    }

    // Also emit on comma boundaries when buffer is long enough.
    const commaEnd = /,\s+/;
    const commaParts = buffer.split(commaEnd);
    if (commaParts.length > 1) {
      const words = (commaParts[0] ?? "").split(/\s+/).filter(Boolean).length;
      if (words >= minWords) {
        emit(commaParts[0]!);
        buffer = commaParts.slice(1).join(", ");
        return;
      }
    }

    // Fallback: flush at word threshold.
    const wordCount = buffer.split(/\s+/).filter(Boolean).length;
    if (wordCount >= minWords * 2) {
      // Find last word boundary.
      const spaceIdx = buffer.lastIndexOf(" ");
      if (spaceIdx > 0) {
        emit(buffer.slice(0, spaceIdx));
        buffer = buffer.slice(spaceIdx + 1);
      }
    }
  };

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) {
      onChunk(trimmed);
      buffer = "";
    }
  };

  return { flush, push };
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

export async function synthesizeSentenceMp3(
  text: string,
  voice: string,
  openAiKey: string,
): Promise<string> {
  const input = text.trim().slice(0, 4096);
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model: "tts-1",
      response_format: "mp3",
      voice,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TTS failed: ${detail || res.statusText}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return uint8ArrayToBase64(bytes);
}

// ─── Base64 ───────────────────────────────────────────────────────────────────

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// ─── Voice system prompt ──────────────────────────────────────────────────────

export function buildVoiceSystemPromptWithContext(
  context: string,
  history?: Array<{ content: string; role: "assistant" | "user" }>,
): string {
  const historyBlock =
    history && history.length > 0
      ? `\n\nPrevious conversation:\n${history
          .map((t) => `${t.role}: ${t.content}`)
          .join("\n")}`
      : "";

  return `You are a helpful voice assistant answering questions from a knowledge base.
Answer using only the retrieved knowledge base context below.
If the answer is not in the context, say you do not know.
Keep answers concise and conversational for spoken delivery (about 2-4 sentences).

Context:
${context}${historyBlock}`;
}
