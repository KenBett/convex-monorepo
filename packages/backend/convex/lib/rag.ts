import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";

import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const GLOBAL_NAMESPACE = "global";
export const SEARCH_LIMIT = 8;
export const VECTOR_SCORE_THRESHOLD = 0.3;
export const MIN_INDEXABLE_TEXT_LENGTH = 20;

export type RagEntryMetadata = {
  farmerId: Id<"farmerProfiles">;
  listingId: Id<"listings">;
  sourceType: "listing";
  status: "active" | "expired" | "sold_out";
};

export const answerModel = openai("gpt-4o-mini");

export const rag = new RAG<Record<string, never>, RagEntryMetadata>(
  components.rag,
  {
    textEmbeddingModel: openai.embedding("text-embedding-3-small"),
    embeddingDimension: 1536,
  },
);
