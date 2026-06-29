/**
 * Mobile TTS playback with ordered chunk queue (expo-audio).
 *
 * enqueueSpeechChunk(base64, index) — called as each tts_chunk SSE event
 * arrives. Chunks are played in strict index order.
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from "expo-file-system/legacy";

type QueuedChunk = {
  audioBase64: string;
  index: number;
};

let activePlayer: AudioPlayer | null = null;
let isPlaying = false;

const chunkQueue: QueuedChunk[] = [];
let nextPlayIndex = 0;

let drainResolve: (() => void) | null = null;
let drainPromise: Promise<void> | null = null;

function sortedInsert(chunk: QueuedChunk): void {
  let lo = 0;
  let hi = chunkQueue.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((chunkQueue[mid]?.index ?? 0) < chunk.index) lo = mid + 1;
    else hi = mid;
  }
  chunkQueue.splice(lo, 0, chunk);
}

async function playChunk(base64: string): Promise<void> {
  if (!cacheDirectory) throw new Error("File cache unavailable");

  const uri = `${cacheDirectory}rag-chunk-${Date.now()}.mp3`;
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri });
  activePlayer = player;

  await new Promise<void>((resolve, reject) => {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        sub.remove();
        resolve();
      }
    });
    try {
      player.play();
    } catch (err) {
      sub.remove();
      reject(err);
    }
  });

  player.remove();
  if (activePlayer === player) activePlayer = null;
}

async function drainQueue(): Promise<void> {
  if (isPlaying) return;
  isPlaying = true;

  while (chunkQueue.length > 0 && chunkQueue[0]?.index === nextPlayIndex) {
    const chunk = chunkQueue.shift()!;
    nextPlayIndex++;
    try {
      await playChunk(chunk.audioBase64);
    } catch {
      // Skip a failed chunk.
    }
  }

  isPlaying = false;

  if (chunkQueue.length === 0 && drainResolve) {
    drainResolve();
    drainResolve = null;
    drainPromise = null;
  }
}

export function enqueueSpeechChunk(
  audioBase64: string,
  index: number,
): Promise<void> {
  sortedInsert({ audioBase64, index });

  if (!drainPromise) {
    drainPromise = new Promise<void>((resolve) => {
      drainResolve = resolve;
    });
  }

  void drainQueue();
  return drainPromise;
}

export function finalizeSpeechQueue(): void {
  if (chunkQueue.length === 0 && !isPlaying && drainResolve) {
    drainResolve();
    drainResolve = null;
    drainPromise = null;
  }
}

export function waitForSpeechQueueDrain(): Promise<void> {
  if (!drainPromise) return Promise.resolve();
  return drainPromise;
}

export async function stopOpenAiSpeech(): Promise<void> {
  chunkQueue.length = 0;
  nextPlayIndex = 0;
  isPlaying = false;

  if (drainResolve) {
    drainResolve();
    drainResolve = null;
  }
  drainPromise = null;

  if (!activePlayer) return;
  const player = activePlayer;
  activePlayer = null;
  try { player.pause(); } catch { /* already paused */ }
  try { player.remove(); } catch { /* already removed */ }
}

/**
 * Legacy single-shot API. Preserved for backwards compat.
 */
export async function playOpenAiSpeech(audioBase64: string): Promise<void> {
  await stopOpenAiSpeech();

  if (!cacheDirectory) throw new Error("File cache unavailable");

  const uri = `${cacheDirectory}rag-answer-${Date.now()}.mp3`;
  await writeAsStringAsync(uri, audioBase64, { encoding: EncodingType.Base64 });

  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri });
  activePlayer = player;

  await new Promise<void>((resolve, reject) => {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        sub.remove();
        resolve();
      }
    });
    try {
      player.play();
    } catch (playbackError) {
      sub.remove();
      reject(playbackError);
    }
  });

  player.remove();
  if (activePlayer === player) activePlayer = null;
}
