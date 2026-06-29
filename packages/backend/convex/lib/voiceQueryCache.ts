/**
 * In-process LRU cache for voice RAG context.
 *
 * Scoped to a single Convex isolate — queries that repeat within the same
 * server lifetime skip the vector-search round-trip entirely.
 *
 * Keys are normalised query strings; values hold the formatted context string
 * and the raw source list so the HTTP endpoint can skip rag.search on hits.
 */

const MAX_ENTRIES = 100;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export type CachedVoiceContext = {
  context: string;
  sources: Array<{ entryId: string; score: number; text: string; title?: string }>;
};

type CacheEntry = {
  value: CachedVoiceContext;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();
const insertionOrder: string[] = [];

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function cacheGet(query: string): CachedVoiceContext | null {
  const key = normalizeQuery(query);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(query: string, value: CachedVoiceContext): void {
  const key = normalizeQuery(query);

  if (store.has(key)) {
    store.set(key, { value, expiresAt: Date.now() + TTL_MS });
    return;
  }

  // Evict oldest entry when at capacity.
  if (store.size >= MAX_ENTRIES) {
    const oldest = insertionOrder.shift();
    if (oldest) store.delete(oldest);
  }

  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  insertionOrder.push(key);
}
