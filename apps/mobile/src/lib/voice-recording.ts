import { RecordingPresets } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import {
  cacheDirectory,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  readAsStringAsync,
  readDirectoryAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";

export type VoiceRecordingPayload = {
  audioBase64: string;
  filename: string;
  mimeType: string;
};

type RecordingFinishedStatus = {
  error?: string | null;
  hasError: boolean;
  isFinished: boolean;
  url: string | null;
};

type StopRecordingSource = {
  addListener: (
    event: "recordingStatusUpdate",
    listener: (status: RecordingFinishedStatus) => void,
  ) => { remove: () => void };
  getStatus: () => { durationMillis: number; url: string | null };
  stop: () => Promise<unknown>;
  uri: string | null;
};

// Reduced from 12 × 150ms (up to ~1.8s) → 6 × 100ms (up to ~600ms) to shave
// pre-STT latency on Android without sacrificing reliability.
const URI_RETRY_ATTEMPTS = 6;
const URI_RETRY_DELAY_MS = 100;
const MIN_RECORDING_MS = 400;

function dedupeUris(uris: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const uri of uris) {
    if (!uri || seen.has(uri)) {
      continue;
    }
    seen.add(uri);
    result.push(uri);
  }

  return result;
}

function looksLikeMalformedRecordingUri(uri: string): boolean {
  return uri.endsWith("/id") || uri.endsWith("/recording") || uri.endsWith("/recording/");
}

async function getRecordingFileInfo(
  uri: string,
): Promise<{ exists: boolean; modificationTime: number; size: number } | null> {
  if (looksLikeMalformedRecordingUri(uri)) {
    return null;
  }

  try {
    const info = await getInfoAsync(uri);
    if (!info.exists) {
      return { exists: false, modificationTime: 0, size: 0 };
    }

    return {
      exists: true,
      modificationTime:
        "modificationTime" in info && typeof info.modificationTime === "number"
          ? info.modificationTime
          : 0,
      size: "size" in info && typeof info.size === "number" ? info.size : 0,
    };
  } catch {
    try {
      const file = new File(uri);
      return {
        exists: file.exists,
        modificationTime: 0,
        size: file.size ?? 0,
      };
    } catch {
      return null;
    }
  }
}

async function isReadableRecordingUri(uri: string): Promise<boolean> {
  const info = await getRecordingFileInfo(uri);
  return info !== null && info.exists && info.size > 0;
}

function getModernAudioDirectories(): Directory[] {
  const directories: Directory[] = [];

  for (const root of [Paths.cache, Paths.document]) {
    try {
      directories.push(new Directory(root, "Audio"));
    } catch {
      // Ignore invalid directory roots on this platform.
    }
  }

  return directories;
}

async function listRecordingUrisLegacy(): Promise<string[]> {
  const uris: string[] = [];

  for (const root of [cacheDirectory, documentDirectory]) {
    if (!root) {
      continue;
    }

    const audioDirectoryUri = `${root}Audio`;
    try {
      const info = await getInfoAsync(audioDirectoryUri);
      if (!info.exists || !info.isDirectory) {
        continue;
      }

      const entries = await readDirectoryAsync(audioDirectoryUri);
      for (const entry of entries) {
        if (!entry.includes("recording")) {
          continue;
        }
        uris.push(`${audioDirectoryUri}/${entry}`);
      }
    } catch {
      // Ignore unreadable legacy directories.
    }
  }

  return uris;
}

async function listRecordingUrisModern(): Promise<string[]> {
  const uris: string[] = [];

  for (const directory of getModernAudioDirectories()) {
    if (!directory.exists) {
      continue;
    }

    try {
      for (const entry of directory.list()) {
        if (!(entry instanceof File) || !entry.name.includes("recording")) {
          continue;
        }
        uris.push(entry.uri);
      }
    } catch {
      // Ignore unreadable modern directories.
    }
  }

  return uris;
}

async function findLatestRecordingUri(sinceMs: number): Promise<string | null> {
  const candidates = dedupeUris([
    ...(await listRecordingUrisModern()),
    ...(await listRecordingUrisLegacy()),
  ]);

  let bestUri: string | null = null;
  let bestScore = -1;

  for (const uri of candidates) {
    const info = await getRecordingFileInfo(uri);
    if (!info?.exists || info.size <= 0) {
      continue;
    }

    const timeScore =
      info.modificationTime > 0
        ? 1_000_000_000 - Math.abs(info.modificationTime - sinceMs)
        : 0;
    const score = timeScore + info.size;

    if (score > bestScore) {
      bestScore = score;
      bestUri = uri;
    }
  }

  return bestUri;
}

async function resolveFirstReadableUri(
  candidates: string[],
  recordedAt: number,
): Promise<string | null> {
  for (const uri of candidates) {
    if (await isReadableRecordingUri(uri)) {
      return uri;
    }
  }

  for (let attempt = 0; attempt < URI_RETRY_ATTEMPTS; attempt += 1) {
    // Skip the filesystem scan on the first two attempts — the URI from the
    // recorder is usually the right one and just needs a brief settling delay.
    const fallbackUri =
      attempt < 2 ? null : await findLatestRecordingUri(recordedAt);
    const retryCandidates = dedupeUris([...candidates, fallbackUri]);

    for (const uri of retryCandidates) {
      if (await isReadableRecordingUri(uri)) {
        return uri;
      }
    }

    await new Promise((resolve) => {
      setTimeout(resolve, URI_RETRY_DELAY_MS);
    });
  }

  return null;
}

export async function stopAndResolveRecordingUri(
  recorder: StopRecordingSource,
  recordedAt: number,
): Promise<string> {
  const uriBeforeStop = recorder.uri;
  let finishedUrl: string | null = null;
  let finishedError: string | null = null;

  const waitForFinish = new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 2500);
    const subscription = recorder.addListener("recordingStatusUpdate", (status) => {
      if (!status.isFinished) {
        return;
      }

      clearTimeout(timeout);
      subscription.remove();
      finishedUrl = status.url ?? null;
      finishedError = status.hasError ? (status.error ?? "Recording failed") : null;
      resolve();
    });
  });

  await recorder.stop();
  await waitForFinish;

  if (finishedError) {
    throw new Error(finishedError);
  }

  const durationMs = recorder.getStatus().durationMillis;
  if (durationMs < MIN_RECORDING_MS) {
    throw new Error("Recording was too short. Hold the mic a bit longer and try again.");
  }

  const candidates = dedupeUris([
    finishedUrl,
    recorder.getStatus().url,
    recorder.uri,
    uriBeforeStop,
  ]);

  const resolvedUri = await resolveFirstReadableUri(candidates, recordedAt);
  if (resolvedUri) {
    return resolvedUri;
  }

  if (Platform.OS === "android") {
    throw new Error(
      "Could not read the recording from this device. Try speaking for at least one second, then tap stop again.",
    );
  }

  throw new Error("Recording file is not available yet. Please try again.");
}

export async function resolveRecordingUri(
  recorderUri: string | null,
  recordedAt: number,
): Promise<string> {
  const resolvedUri = await resolveFirstReadableUri(dedupeUris([recorderUri]), recordedAt);
  if (resolvedUri) {
    return resolvedUri;
  }

  throw new Error("Recording file is not available yet. Please try again.");
}

async function readRecordingBase64(uri: string): Promise<string> {
  try {
    return await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
  } catch {
    const file = new File(uri);
    if (!file.exists || (file.size ?? 0) <= 0) {
      throw new Error("Recording file is not readable");
    }
    return file.base64();
  }
}

export async function readRecordingPayload(uri: string): Promise<VoiceRecordingPayload> {
  const audioBase64 = await readRecordingBase64(uri);

  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith(".caf")) {
    return {
      audioBase64,
      filename: "recording.caf",
      mimeType: "audio/x-caf",
    };
  }
  if (lowerUri.endsWith(".webm")) {
    return {
      audioBase64,
      filename: "recording.webm",
      mimeType: "audio/webm",
    };
  }
  if (lowerUri.endsWith(".3gp")) {
    return {
      audioBase64,
      filename: "recording.3gp",
      mimeType: "audio/3gpp",
    };
  }

  return {
    audioBase64,
    filename: "recording.m4a",
    mimeType: "audio/mp4",
  };
}

export function getRecordingCacheDirectory(): string | null {
  return cacheDirectory;
}

export const voiceRecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: "document" as const,
};
