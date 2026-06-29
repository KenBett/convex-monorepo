"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";

const OPENAI_TTS_MAX_CHARS = 4096;
const DEFAULT_VOICE = "nova";
const WHISPER_MODEL = "whisper-1";
const TTS_MODEL = "tts-1";

function getOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return apiKey;
}

export const transcribeSpeech = action({
  args: {
    audioBase64: v.string(),
    filename: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  returns: v.object({
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);

    const audioBytes = base64ToUint8Array(args.audioBase64);
    if (audioBytes.byteLength === 0) {
      throw new Error("Recording was empty");
    }

    const formData = new FormData();
    const mimeType = args.mimeType ?? "audio/mp4";
    const filename = args.filename ?? "recording.m4a";
    formData.append(
      "file",
      new Blob([new Uint8Array(audioBytes)], { type: mimeType }),
      filename,
    );
    formData.append("model", WHISPER_MODEL);
    formData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      body: formData,
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI STT failed: ${detail || response.statusText}`);
    }

    const payload: { text?: string } = await response.json();
    const text = payload.text?.trim() ?? "";
    if (!text) {
      throw new Error("Could not understand the recording");
    }

    return { text };
  },
});

export const synthesizeSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
  },
  returns: v.object({
    audioBase64: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);

    const input = args.text.trim().slice(0, OPENAI_TTS_MAX_CHARS);
    if (!input) {
      throw new Error("Text is required for speech synthesis");
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      body: JSON.stringify({
        input,
        model: TTS_MODEL,
        response_format: "mp3",
        voice: args.voice ?? DEFAULT_VOICE,
      }),
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI TTS failed: ${detail || response.statusText}`);
    }

    const audioBytes = new Uint8Array(await response.arrayBuffer());
    return {
      audioBase64: uint8ArrayToBase64(audioBytes),
    };
  },
});

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
