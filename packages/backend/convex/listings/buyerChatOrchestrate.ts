"use node";

import { CROP_TYPES, COUNTIES } from "@repo/types";
import { generateText, stepCountIs, tool } from "ai";
import { type Infer, v } from "convex/values";
import { z } from "zod";

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { answerModel } from "../lib/rag";
import {
  buyerSearchIntentValidator,
  type BuyerSearchIntent,
} from "./buyerChatParse";
import { buyerChatRequestContextValidator } from "./buyerChatContext";
import {
  answerAboutListingsFromTool,
  tryAnswerListingQuestion,
} from "./buyerChatListingAnswer";
import {
  inferFollowUpOrderLines,
  userMessageHasOrderIntent,
} from "./buyerChatMessages";
import {
  buyerOrderDraftValidator,
  toValidatorOrderDraft,
} from "./buyerOrderDraftValidators";
import {
  type BuyerChatPreviousListing,
  resolveOrderDraft,
} from "./buyerOrderResolve";
import {
  fallbackBuyerSearchIntent,
  normalizeBuyerSearchIntent,
  SEARCH_INTENT_TOOL_RULES,
  type BuyerSearchIntentPreviousContext,
} from "./buyerSearchIntentNormalize";
import { executeBuyerSearchFromIntent } from "./buyerSearchExecute";
import {
  listingSearchResultValidator,
  type ListingSearchResultRow,
} from "./search";

const buyerSourcingMetaValidator = v.object({
  excludedSoldOutCount: v.number(),
  ragCandidateCount: v.number(),
  resultCount: v.number(),
});

export const buyerChatTurnResponseValidator = v.object({
  assistantText: v.optional(v.string()),
  intent: buyerSearchIntentValidator,
  meta: buyerSourcingMetaValidator,
  orderDraft: v.optional(buyerOrderDraftValidator),
  results: v.array(listingSearchResultValidator),
});

type BuyerChatTurnResult = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
  orderDraft?: ReturnType<typeof toValidatorOrderDraft>;
  results: ListingSearchResultRow[];
};

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a buyer assistant for a Kenyan produce marketplace chat.

Your job is to decide which tools to call based on the latest buyer message.

Tools:
- searchListings: when the buyer is browsing, comparing, or refining listings (not placing an order).
- prepareOrder: when the buyer wants to order, buy, purchase, or get a specific quantity of produce.
- answerAboutListings: when the buyer asks about metadata of listings already shown (grade, price, quantity, county, cooperative, status). Use listingRef for "first/second" and crop/cooperative hints for "that maize" / "from Kenato".

Rules:
- Order verbs include: order, buy, purchase, get me, I want, I need (with a quantity).
- For prepareOrder, extract every line item separately (comma / and separated counts).
- Map crops to: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- Counties must be one of: ${COUNTIES.join(", ")} when mentioned.
- For "the second one" / "first listing" set listingRef (1-based) on that line and omit cooperative if unknown.
- Never invent listing IDs — prepareOrder resolves listings server-side.
- Call searchListings for pure search requests with no order intent.
- Call answerAboutListings for follow-up questions about earlier results (e.g. "what is the grade of that maize?", "how much is the first one?", "who sells that beans?"). Do not call searchListings for these.
- Call both tools for mixed messages (e.g. "find maize and order 5kg from Kenato").
- If the message only orders from earlier results, call prepareOrder only with listingRef or cooperative/grade hints.
- When the buyer confirms with pronouns ("order it", "buy that", "I want to order it"), call prepareOrder using quantityKg from an earlier buyer message in the transcript when the latest message omits kg.
- When the buyer pivots to a new browse request (e.g. "show me beans" after viewing maize), call searchListings only — never prepareOrder from stale earlier order context.
- prepareOrder applies only to the latest buyer message when it contains order intent.
- For answerAboutListings, resolve "that/the/this" using crop or listingRef from the latest shown listings. Never guess values — read them from listing context via the tool.

${SEARCH_INTENT_TOOL_RULES}`;

const orderLineSchema = z.object({
  cooperativeName: z.string().optional(),
  county: z.enum(COUNTIES).optional(),
  crop: z.enum(CROP_TYPES),
  grade: z.string().optional(),
  listingRef: z.number().int().positive().optional(),
  quantityKg: z.number().positive(),
});

const searchIntentInputSchema = z.object({
  county: z.enum(COUNTIES).nullable().optional(),
  crop: z.enum(CROP_TYPES).nullable().optional(),
  maxPricePerKg: z.number().positive().nullable().optional(),
  minQuantityKg: z.number().positive().nullable().optional(),
  pricePreference: z
    .enum(["cheapest", "most_expensive"])
    .nullable()
    .optional(),
  refinePreviousResults: z.boolean().optional(),
  resultLimit: z.number().int().positive().nullable().optional(),
  searchText: z.string(),
});

type TurnState = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
  orderDraft?: ReturnType<typeof toValidatorOrderDraft>;
  results: ListingSearchResultRow[];
};

function emptyTurnState(): TurnState {
  return {
    intent: { searchText: "" },
    meta: {
      excludedSoldOutCount: 0,
      ragCandidateCount: 0,
      resultCount: 0,
    },
    results: [],
  };
}

function toContextListings(
  listings?: Array<{
    cooperativeName: string;
    county: string;
    crop: string;
    grade?: string;
    listingId: BuyerChatPreviousListing["listingId"];
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  }>,
): BuyerChatPreviousListing[] {
  if (!listings) {
    return [];
  }

  return listings.map((listing) => ({
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    grade: listing.grade,
    listingId: listing.listingId,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    status: listing.status,
  }));
}

function toPreviousListings(
  previousSourcing?: {
    listings: Array<{
      cooperativeName: string;
      county: string;
      crop: string;
      grade?: string;
      listingId: BuyerChatPreviousListing["listingId"];
      pricePerKg: number;
      quantityKg: number;
      status: "active" | "expired" | "sold_out";
    }>;
  },
): BuyerChatPreviousListing[] {
  if (!previousSourcing) {
    return [];
  }

  return previousSourcing.listings.map((listing) => ({
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    grade: listing.grade,
    listingId: listing.listingId,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    status: listing.status,
  }));
}

function toPreviousSourcingContext(
  previousSourcing: {
    crops: string[];
    intent: BuyerSearchIntent;
    listingCount: number;
    listings: BuyerChatPreviousListing[];
  },
): Parameters<typeof executeBuyerSearchFromIntent>[2] {
  return {
    crops: previousSourcing.crops,
    intent: previousSourcing.intent,
    listingCount: previousSourcing.listingCount,
    listings: previousSourcing.listings,
  };
}

const listingMetadataFieldSchema = z.enum([
  "cooperative",
  "county",
  "description",
  "grade",
  "price",
  "quantity",
  "status",
]);

function toolInputToParsedIntent(
  input: z.infer<typeof searchIntentInputSchema>,
): Parameters<typeof normalizeBuyerSearchIntent>[0] {
  return {
    crop: input.crop ?? null,
    county: input.county ?? null,
    maxPricePerKg: input.maxPricePerKg ?? null,
    minQuantityKg: input.minQuantityKg ?? null,
    searchText: input.searchText,
    refinePreviousResults: input.refinePreviousResults ?? false,
    pricePreference: input.pricePreference ?? null,
    resultLimit: input.resultLimit ?? null,
  };
}

export async function executeBuyerChatTurn(
  ctx: ActionCtx,
  args: { chatContext: Infer<typeof buyerChatRequestContextValidator> },
): Promise<BuyerChatTurnResult> {
  await ctx.runQuery(internal.listings.search.verifyBuyerAccess, {});

  const query = args.chatContext.latestUserMessage.trim();
  if (query.length === 0) {
    throw new Error("Search query is required");
  }

  const turnState = emptyTurnState();
  const conversationListings = toContextListings(
    args.chatContext.conversationListings,
  );
  const previousListings = toPreviousListings(args.chatContext.previousSourcing);
  const allContextListings =
    conversationListings.length > 0 ? conversationListings : previousListings;

  const quickAnswer = tryAnswerListingQuestion({
    conversationListings: allContextListings,
    previousListings,
    query,
  });

  if (quickAnswer) {
    return {
      assistantText: quickAnswer,
      intent: (args.chatContext.previousSourcing?.intent as
        | BuyerSearchIntent
        | undefined) ?? { searchText: query },
      meta: turnState.meta,
      results: [],
    };
  }

  const previousSourcingContext = args.chatContext.previousSourcing
    ? toPreviousSourcingContext({
        ...args.chatContext.previousSourcing,
        intent: args.chatContext.previousSourcing.intent as BuyerSearchIntent,
      })
    : undefined;
  const previousContextForNormalize = args.chatContext.previousSourcing
    ? {
        crops: args.chatContext.previousSourcing.crops,
        intent: args.chatContext.previousSourcing.intent as BuyerSearchIntent,
        listingCount: args.chatContext.previousSourcing.listingCount,
      }
    : undefined;

  const previousSummary = args.chatContext.previousSourcing
    ? [
        "Previous search context:",
        `- listings shown: ${args.chatContext.previousSourcing.listingCount}`,
        args.chatContext.previousSourcing.listings
          .map(
            (listing, index) =>
              `${index + 1}. ${listing.crop} from ${listing.cooperativeName}${listing.grade ? ` grade ${listing.grade}` : ""} @ KES ${listing.pricePerKg}/kg (${listing.listingId})`,
          )
          .join("\n"),
      ].join("\n")
    : "Previous search context: none";

  const prompt = [
    "Conversation so far:",
    args.chatContext.conversationTranscript,
    "",
    "Latest buyer message:",
    query,
    "",
    previousSummary,
  ].join("\n");

  const llmResult = await generateText({
    model: answerModel,
    prompt,
    stopWhen: stepCountIs(5),
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    tools: {
      answerAboutListings: tool({
        description:
          "Answer a metadata question about listings already shown in this chat (grade, price, stock, county, cooperative, status).",
        inputSchema: z.object({
          cooperativeName: z.string().optional(),
          crop: z.enum(CROP_TYPES).optional(),
          fields: z.array(listingMetadataFieldSchema).optional(),
          listingRef: z.number().int().positive().optional(),
        }),
        execute: async (answerInput) => {
          const answer = answerAboutListingsFromTool({
            conversationListings: allContextListings,
            cooperativeName: answerInput.cooperativeName,
            crop: answerInput.crop,
            fields: answerInput.fields,
            listingRef: answerInput.listingRef,
            previousListings,
          });
          turnState.assistantText = answer;
          return { answer };
        },
      }),
      prepareOrder: tool({
        description:
          "Resolve order line items to live marketplace listings for buyer confirmation.",
        inputSchema: z.object({
          lines: z.array(orderLineSchema).min(1),
        }),
        execute: async ({ lines }) => {
          const orderDraft = await resolveOrderDraft(
            ctx,
            lines,
            previousListings,
          );
          turnState.orderDraft = toValidatorOrderDraft(orderDraft);
          return {
            lineCount: orderDraft.lines.length,
            resolvedCount: orderDraft.lines.filter((line) => !line.issue)
              .length,
            summaryText: orderDraft.summaryText,
          };
        },
      }),
      searchListings: tool({
        description:
          "Search active in-stock listings matching the buyer's browse or refine request. Pass structured search parameters extracted from the message.",
        inputSchema: searchIntentInputSchema,
        execute: async (searchInput) => {
          const intent = normalizeBuyerSearchIntent(
            toolInputToParsedIntent(searchInput),
            query,
            previousContextForNormalize,
          );

          const searchResult = await executeBuyerSearchFromIntent(
            ctx,
            intent,
            previousSourcingContext,
          );

          turnState.intent = searchResult.intent;
          turnState.meta = searchResult.meta;
          turnState.results = searchResult.results;

          return {
            crop: searchResult.intent.crop ?? null,
            resultCount: searchResult.results.length,
          };
        },
      }),
    },
  });

  if (
    turnState.results.length === 0 &&
    !turnState.orderDraft &&
    !turnState.assistantText
  ) {
    const fallbackIntent = fallbackBuyerSearchIntent(
      query,
      previousContextForNormalize,
    );
    const searchResult = await executeBuyerSearchFromIntent(
      ctx,
      fallbackIntent,
      previousSourcingContext,
    );

    turnState.intent = searchResult.intent;
    turnState.meta = searchResult.meta;
    turnState.results = searchResult.results;
  }

  if (!turnState.orderDraft && userMessageHasOrderIntent(query)) {
    const inferredLines = inferFollowUpOrderLines({
      conversationTranscript: args.chatContext.conversationTranscript,
      previousListings,
      query,
    });

    if (inferredLines) {
      const orderDraft = await resolveOrderDraft(
        ctx,
        inferredLines,
        previousListings,
      );
      turnState.orderDraft = toValidatorOrderDraft(orderDraft);
    }
  }

  if (turnState.orderDraft && !userMessageHasOrderIntent(query)) {
    turnState.orderDraft = undefined;
  }

  const assistantText =
    turnState.assistantText ??
    turnState.orderDraft?.summaryText ??
    (llmResult.text.trim().length > 0 ? llmResult.text.trim() : undefined);

  return {
    assistantText,
    intent: turnState.intent,
    meta: turnState.meta,
    orderDraft: turnState.orderDraft,
    results: turnState.results,
  };
}

export const runBuyerChatTurn = internalAction({
  args: {
    chatContext: buyerChatRequestContextValidator,
  },
  returns: buyerChatTurnResponseValidator,
  handler: async (ctx, args): Promise<BuyerChatTurnResult> => {
    return await executeBuyerChatTurn(ctx, args);
  },
});
