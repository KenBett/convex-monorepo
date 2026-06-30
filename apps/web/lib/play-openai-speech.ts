/**
 * Web TTS playback with ordered chunk queue.
 *
 * enqueueSpeechChunk(base64, index) — called as each tts_chunk SSE event
 * arrives. Chunks are played in strict index order so the first chunk begins
 * immediately while later chunks are buffered.
 *
 * The legacy playOpenAiSpeech(base64) API is preserved for backwards compat.
 */

type QueuedChunk = {
  audioBase64: string;
  index: number;
};

let activeAudio: HTMLAudioElement | null = null;
let isPlaying = false;

// Chunks waiting to be played, kept sorted by index.
const chunkQueue: QueuedChunk[] = [];
let nextPlayIndex = 0;

// External promise that resolves once the queue is fully drained.
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
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);

  activeAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Playback failed"));
    void audio.play().catch(reject);
  });
  if (activeAudio === audio) activeAudio = null;
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
      // Skip a failed chunk rather than breaking the whole queue.
    }
  }

  isPlaying = false;

  // If queue is empty and no more chunks are expected, resolve drain promise.
  if (chunkQueue.length === 0 && drainResolve) {
    drainResolve();
    drainResolve = null;
    drainPromise = null;
  }
}

/**
 * Enqueue a TTS audio chunk for ordered playback.
 * Returns a promise that resolves when the full queue has been played.
 */
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

/**
 * Signal that no more chunks will arrive so the drain promise resolves once
 * the current queue is empty.
 */
export function finalizeSpeechQueue(): void {
  if (chunkQueue.length === 0 && !isPlaying && drainResolve) {
    drainResolve();
    drainResolve = null;
    drainPromise = null;
  }
  // If queue is not empty, drainQueue() will call drainResolve when done.
}

/**
 * Wait until all queued chunks have played.
 */
export function waitForSpeechQueueDrain(): Promise<void> {
  if (!drainPromise) return Promise.resolve();

  return drainPromise;
}

/**
 * Stop all active and queued audio immediately.
 */
export async function stopOpenAiSpeech(): Promise<void> {
  chunkQueue.length = 0;
  nextPlayIndex = 0;
  isPlaying = false;

  if (drainResolve) {
    drainResolve();
    drainResolve = null;
  }
  drainPromise = null;

  if (!activeAudio) return;
  const audio = activeAudio;

  activeAudio = null;
  audio.pause();
  audio.src = "";
}

/**
 * Legacy single-shot API — plays a full MP3 and waits until finished.
 * Preserved for backwards compat with non-streaming callers.
 */
export async function playOpenAiSpeech(audioBase64: string): Promise<void> {
  await stopOpenAiSpeech();
  const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);

  activeAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Playback failed"));
    void audio.play().catch(reject);
  });
  if (activeAudio === audio) activeAudio = null;
}
