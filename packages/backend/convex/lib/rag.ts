import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";

import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const GLOBAL_NAMESPACE = "global";
export const SEARCH_LIMIT = 8;
export const VOICE_SEARCH_LIMIT = 2;
export const VECTOR_SCORE_THRESHOLD = 0.3;
export const MIN_INDEXABLE_TEXT_LENGTH = 20;

export type RagEntryMetadata =
  | {
      documentId: Id<"documents">;
      filename?: string;
      sourceType: "text" | "file";
      uploadedBy: Id<"users">;
    }
  | {
      farmerId: Id<"farmerProfiles">;
      listingId: Id<"listings">;
      sourceType: "listing";
      status: "active" | "expired" | "sold_out";
    };

export const rag = new RAG<Record<string, never>, RagEntryMetadata>(
  components.rag,
  {
    textEmbeddingModel: openai.embedding("text-embedding-3-small"),
    embeddingDimension: 1536,
  },
);

export const answerModel = openai.chat("gpt-4o-mini");
