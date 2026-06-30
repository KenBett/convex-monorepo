import type {
  EntryId,
  SearchResult as RagSearchResult,
} from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";
import {
  GLOBAL_NAMESPACE,
  MIN_INDEXABLE_TEXT_LENGTH,
  SEARCH_LIMIT,
  VECTOR_SCORE_THRESHOLD,
  answerModel,
  rag,
} from "./lib/rag";

const sourceTypeValidator = v.union(v.literal("text"), v.literal("file"));
const documentStatusValidator = v.union(
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error"),
);
const documentSummaryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("documents"),
  createdAt: v.number(),
  error: v.optional(v.string()),
  filename: v.optional(v.string()),
  ragEntryId: v.optional(v.string()),
  sourceType: sourceTypeValidator,
  status: documentStatusValidator,
  storageId: v.optional(v.id("_storage")),
  title: v.string(),
  uploadedBy: v.id("users"),
});

const searchResultValidator = v.object({
  entryId: v.string(),
  score: v.number(),
  text: v.string(),
  title: v.optional(v.string()),
});

const searchResponseValidator = v.object({
  results: v.array(searchResultValidator),
});

const askResponseValidator = v.object({
  answer: v.string(),
  sources: v.array(searchResultValidator),
});

const chatTurnValidator = v.object({
  content: v.string(),
  role: v.union(v.literal("assistant"), v.literal("user")),
});

const debugCorpusValidator = v.object({
  documentsByStatus: v.object({
    error: v.number(),
    processing: v.number(),
    ready: v.number(),
  }),
  ragEntries: v.array(
    v.object({
      entryId: v.string(),
      status: v.string(),
      title: v.optional(v.string()),
    }),
  ),
  ragNamespace: v.union(
    v.object({
      namespace: v.string(),
      namespaceId: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  ragReadyEntryCount: v.number(),
  totalDocuments: v.number(),
});

export const listDocuments = query({
  args: {},
  returns: v.array(documentSummaryValidator),
  handler: async (ctx) => {
    await requireAuthUserId(ctx);
    return await ctx.db.query("documents").order("desc").take(100);
  },
});

export const addTextDocument = action({
  args: {
    text: v.string(),
    title: v.string(),
  },
  returns: v.object({
    documentId: v.id("documents"),
    entryId: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    documentId: Id<"documents">;
    entryId: string;
  }> => {
    const userId = await requireAuthUserId(ctx);
    const text = validateIndexableText(args.text);
    const documentId: Id<"documents"> = await ctx.runMutation(
      internal.knowledge.createDocumentMetadata,
      {
        sourceType: "text",
        title: args.title,
        uploadedBy: userId,
      },
    );

    try {
      const result = await rag.add(ctx, {
        key: documentId,
        metadata: {
          documentId,
          sourceType: "text",
          uploadedBy: userId,
        },
        namespace: GLOBAL_NAMESPACE,
        onComplete: internal.knowledge.completeDocument,
        text,
        title: args.title,
      });
      assertIndexingComplete(result.status);
      return { documentId, entryId: result.entryId };
    } catch (error) {
      await ctx.runMutation(internal.knowledge.markDocumentError, {
        documentId,
        error: error instanceof Error ? error.message : "Failed to index text",
      });
      throw error;
    }
  },
});

export const addFileDocument = action({
  args: {
    fileBytes: v.optional(v.bytes()),
    filename: v.string(),
    mimeType: v.optional(v.string()),
    text: v.string(),
    title: v.string(),
  },
  returns: v.object({
    documentId: v.id("documents"),
    entryId: v.string(),
    storageId: v.optional(v.id("_storage")),
  }),
  handler: async (ctx, args): Promise<{
    documentId: Id<"documents">;
    entryId: string;
    storageId?: Id<"_storage">;
  }> => {
    const userId = await requireAuthUserId(ctx);
    const text = validateIndexableText(args.text);
    const storageId =
      args.fileBytes === undefined
        ? undefined
        : await ctx.storage.store(
            new Blob([args.fileBytes], {
              type: args.mimeType ?? "application/octet-stream",
            }),
          );
    const documentId: Id<"documents"> = await ctx.runMutation(
      internal.knowledge.createDocumentMetadata,
      {
        filename: args.filename,
        sourceType: "file",
        storageId,
        title: args.title,
        uploadedBy: userId,
      },
    );

    try {
      const result = await rag.add(ctx, {
        key: documentId,
        metadata: {
          documentId,
          filename: args.filename,
          sourceType: "file",
          uploadedBy: userId,
        },
        namespace: GLOBAL_NAMESPACE,
        onComplete: internal.knowledge.completeDocument,
        text,
        title: args.title,
      });
      assertIndexingComplete(result.status);
      return { documentId, entryId: result.entryId, storageId };
    } catch (error) {
      await ctx.runMutation(internal.knowledge.markDocumentError, {
        documentId,
        error: error instanceof Error ? error.message : "Failed to index file",
      });
      if (storageId !== undefined) {
        await ctx.storage.delete(storageId);
      }
      throw error;
    }
  },
});

export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.ragEntryId !== undefined) {
      await rag.deleteAsync(ctx, { entryId: document.ragEntryId as EntryId });
    }
    if (document.storageId !== undefined) {
      await ctx.storage.delete(document.storageId);
    }
    await ctx.db.delete("documents", args.documentId);
    return null;
  },
});

export const search = action({
  args: {
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    const response = await rag.search(ctx, {
      chunkContext: { before: 1, after: 1 },
      limit: args.limit ?? SEARCH_LIMIT,
      namespace: GLOBAL_NAMESPACE,
      query: args.query,
      vectorScoreThreshold: VECTOR_SCORE_THRESHOLD,
    });
    return {
      results: mapSearchResults(response.results, response.entries),
    };
  },
});

export const ask = action({
  args: {
    prompt: v.string(),
  },
  returns: askResponseValidator,
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    return await askWithContext(ctx, args.prompt);
  },
});

export const askWithHistory = action({
  args: {
    history: v.optional(v.array(chatTurnValidator)),
    prompt: v.string(),
  },
  returns: askResponseValidator,
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    return await askWithContext(ctx, args.prompt, args.history);
  },
});

async function askWithContext(
  ctx: ActionCtx,
  prompt: string,
  history?: Array<{ content: string; role: "assistant" | "user" }>,
) {
  const response = await rag.generateText(ctx, {
    model: answerModel,
    prompt,
    search: {
      chunkContext: { before: 1, after: 1 },
      limit: SEARCH_LIMIT,
      namespace: GLOBAL_NAMESPACE,
      vectorScoreThreshold: VECTOR_SCORE_THRESHOLD,
    },
    system: buildVoiceSystemPrompt(history),
  });
  return {
    answer: response.text,
    sources: mapSearchResults(response.context.results, response.context.entries),
  };
}

function buildVoiceSystemPrompt(
  history?: Array<{ content: string; role: "assistant" | "user" }>,
): string {
  const historyBlock =
    history && history.length > 0
      ? `\n\nPrevious conversation:\n${history
          .map((turn) => `${turn.role}: ${turn.content}`)
          .join("\n")}`
      : "";

  return `You are a helpful voice assistant answering questions from a knowledge base.
Answer using only the retrieved knowledge base context.
If the answer is not in the context, say you do not know.
Keep answers concise and conversational for spoken delivery (about 2-4 sentences).${historyBlock}`;
}

export const debugCorpus = query({
  args: {},
  returns: debugCorpusValidator,
  handler: async (ctx) => {
    await requireAuthUserId(ctx);
    const documents = await ctx.db.query("documents").order("desc").take(100);
    const documentsByStatus = {
      error: documents.filter((doc) => doc.status === "error").length,
      processing: documents.filter((doc) => doc.status === "processing").length,
      ready: documents.filter((doc) => doc.status === "ready").length,
    };
    const namespace = await rag.getNamespace(ctx, {
      namespace: GLOBAL_NAMESPACE,
    });
    if (!namespace) {
      return {
        documentsByStatus,
        ragEntries: [],
        ragNamespace: null,
        ragReadyEntryCount: 0,
        totalDocuments: documents.length,
      };
    }
    const listResult = await rag.list(ctx, {
      limit: 100,
      namespaceId: namespace.namespaceId,
      status: "ready",
    });
    return {
      documentsByStatus,
      ragEntries: listResult.page.map((entry) => ({
        entryId: entry.entryId,
        status: entry.status,
        title: entry.title,
      })),
      ragNamespace: {
        namespace: GLOBAL_NAMESPACE,
        namespaceId: namespace.namespaceId,
        status: namespace.status,
      },
      ragReadyEntryCount: listResult.page.length,
      totalDocuments: documents.length,
    };
  },
});

export const createDocumentMetadata = internalMutation({
  args: {
    filename: v.optional(v.string()),
    sourceType: sourceTypeValidator,
    storageId: v.optional(v.id("_storage")),
    title: v.string(),
    uploadedBy: v.id("users"),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      createdAt: Date.now(),
      filename: args.filename,
      sourceType: args.sourceType,
      status: "processing",
      storageId: args.storageId,
      title: args.title,
      uploadedBy: args.uploadedBy,
    });
  },
});

export const markDocumentError = internalMutation({
  args: {
    documentId: v.id("documents"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("documents", args.documentId, {
      error: args.error,
      status: "error",
    });
    return null;
  },
});

export const completeDocument = rag.defineOnComplete<DataModel>(
  async (ctx, args) => {
    const metadata = args.entry.metadata;
    if (
      metadata === undefined ||
      (metadata.sourceType !== "text" && metadata.sourceType !== "file")
    ) {
      return;
    }

    const documentId = metadata.documentId;
    if (args.error !== undefined) {
      await ctx.db.patch("documents", documentId, {
        error: args.error,
        status: "error",
      });
      return;
    }
    await ctx.db.patch("documents", documentId, {
      ragEntryId: args.entry.entryId,
      status: "ready",
    });
  },
);

function validateIndexableText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < MIN_INDEXABLE_TEXT_LENGTH) {
    throw new Error(
      `Document text is empty or too short to index (minimum ${MIN_INDEXABLE_TEXT_LENGTH} characters)`,
    );
  }
  return trimmed;
}

function assertIndexingComplete(status: string): void {
  if (status !== "ready") {
    throw new Error(`Indexing did not complete (status: ${status})`);
  }
}

function mapSearchResults(
  results: RagSearchResult[],
  entries: Array<{ entryId: string; title?: string }>,
): Array<{ entryId: string; score: number; text: string; title?: string }> {
  return results.map((result) => {
    const entry = entries.find((item) => item.entryId === result.entryId);
    return {
      entryId: result.entryId,
      score: result.score,
      text: result.content.map((chunk) => chunk.text).join("\n"),
      title: entry?.title,
    };
  });
}
