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
  buildOrderAllLines,
  inferFollowUpOrderLines,
  userMessageHasOrderAllIntent,
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
import {
  executeBuyerSearchClauses,
  executeBuyerSearchFromIntent,
  type BuyerSearchGroupResult,
} from "./buyerSearchExecute";
import {
  listingSearchResultValidator,
  type ListingSearchResultRow,
} from "./search";

const buyerSourcingMetaValidator = v.object({
  excludedSoldOutCount: v.number(),
  ragCandidateCount: v.number(),
  resultCount: v.number(),
});

const buyerSearchGroupValidator = v.object({
  intent: buyerSearchIntentValidator,
  results: v.array(listingSearchResultValidator),
});

export const buyerChatTurnResponseValidator = v.object({
  assistantText: v.optional(v.string()),
  intent: buyerSearchIntentValidator,
  meta: buyerSourcingMetaValidator,
  orderDraft: v.optional(buyerOrderDraftValidator),
  results: v.array(listingSearchResultValidator),
  searchGroups: v.array(buyerSearchGroupValidator),
});

type BuyerSearchGroup = {
  intent: BuyerSearchIntent;
  results: ListingSearchResultRow[];
};

export type BuyerChatTurnResult = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
  orderDraft?: ReturnType<typeof toValidatorOrderDraft>;
  results: ListingSearchResultRow[];
  searchGroups: BuyerSearchGroup[];
};

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a buyer assistant for a Kenyan produce marketplace chat.

Your job is to decide which tools to call based on the latest buyer message.

Tools:
- searchListings: when the buyer is browsing, comparing, or refining listings (not placing an order).
- prepareOrder: when the buyer wants to order, buy, purchase, or get a specific quantity of produce.
- answerAboutListings: when the buyer asks a text question about metadata of listings already shown (grade, price, quantity, county, cooperative, status). Use listingRef for "first/second" and crop/cooperative hints for "that maize" / "from Kenato".

Rules:
- Order verbs include: order, buy, purchase, get me, I want, I need (with a quantity).
- For prepareOrder, extract every line item separately (comma / and separated counts).
- Map crops to: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- Counties must be one of: ${COUNTIES.join(", ")} when mentioned.
- For "the second one" / "first listing" set listingRef (1-based) on that line and omit cooperative if unknown.
- Never invent listing IDs — prepareOrder resolves listings server-side.
- Call searchListings for pure search requests with no order intent.
- searchListings takes a "clauses" array — pass ONE clause per distinct crop/county/grade combination the buyer asks for. A message like "grade 2 tomatoes only and maize from Bungoma" is two clauses: {crop: tomatoes, grade: "2"} and {crop: maize, county: Bungoma}. A simple single-topic message is just one clause.
- Display verbs such as "show", "display", "list", "provide", "pull up", "bring up", "find", and "search" mean the buyer wants listing cards. Use searchListings for these, including refinements like "show me the cheapest one", "list the lowest price", "provide another option", or "display grade 2 only".
- Question/explanation verbs such as "what", "which", "how much", "how many", "who", "where", "tell me", "explain", and "describe" mean the buyer wants a text answer. Use answerAboutListings for these follow-up questions about earlier results (e.g. "what is the grade of that maize?", "how much is the first one?", "who sells that beans?"). Do not call searchListings for these.
- Call both tools for mixed messages (e.g. "find maize and order 5kg from Kenato").
- If the message only orders from earlier results, call prepareOrder only with listingRef or cooperative/grade hints.
- When the buyer confirms with pronouns ("order it", "buy that", "I want to order it"), call prepareOrder using quantityKg from an earlier buyer message in the transcript when the latest message omits kg.
- When the buyer says "order all of them" / "buy everything" / "the whole lot", do not call prepareOrder yourself — this is handled deterministically before you are invoked.
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

const searchClauseSchema = z.object({
  county: z.enum(COUNTIES).nullable().optional(),
  crop: z.enum(CROP_TYPES).nullable().optional(),
  grade: z.string().nullable().optional(),
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
  searchGroups: BuyerSearchGroup[];
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
    searchGroups: [],
  };
}

const CARD_DISPLAY_REQUEST_PATTERN =
  /\b(show|display|list|provide|pull\s+up|bring\s+up|find|search)\b/i;

const TEXT_ANSWER_REQUEST_PATTERN =
  /\b(what|which|how\s+much|how\s+many|tell\s+me|who|where|explain|describe)\b/i;

const CHEAPEST_PATTERN =
  /\b(cheapest|lowest\s+price|least\s+expensive|best\s+value|affordable)\b/i;

const MOST_EXPENSIVE_PATTERN =
  /\b(most\s+expensive|highest\s+price|priciest|premium\s+price)\b/i;

const SINGLE_CARD_PATTERN =
  /\b(one|1|single|top|best|cheapest|lowest\s+price|least\s+expensive|most\s+expensive|highest\s+price|priciest)\b/i;

function buildCardDisplayIntent(
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent | null {
  if (!CARD_DISPLAY_REQUEST_PATTERN.test(query)) {
    return null;
  }

  if (TEXT_ANSWER_REQUEST_PATTERN.test(query)) {
    return null;
  }

  const pricePreference = CHEAPEST_PATTERN.test(query)
    ? "cheapest"
    : MOST_EXPENSIVE_PATTERN.test(query)
      ? "most_expensive"
      : null;

  return normalizeBuyerSearchIntent(
    {
      crop: null,
      county: null,
      grade: null,
      maxPricePerKg: null,
      minQuantityKg: null,
      pricePreference,
      refinePreviousResults: previousContext !== undefined,
      resultLimit: SINGLE_CARD_PATTERN.test(query) ? 1 : null,
      searchText: query,
    },
    query,
    previousContext,
  );
}

/** Union of a listingId's first appearance across groups, preserving group order. */
function dedupeResultsById(
  groups: BuyerSearchGroupResult[],
): ListingSearchResultRow[] {
  const seen = new Set<string>();
  const merged: ListingSearchResultRow[] = [];

  for (const group of groups) {
    for (const result of group.results) {
      if (seen.has(result.listingId)) {
        continue;
      }
      seen.add(result.listingId);
      merged.push(result);
    }
  }

  return merged;
}

function sumSearchGroupMeta(groups: BuyerSearchGroupResult[]): {
  excludedSoldOutCount: number;
  ragCandidateCount: number;
  resultCount: number;
} {
  return groups.reduce(
    (total, group) => ({
      excludedSoldOutCount:
        total.excludedSoldOutCount + group.meta.excludedSoldOutCount,
      ragCandidateCount: total.ragCandidateCount + group.meta.ragCandidateCount,
      resultCount: total.resultCount + group.meta.resultCount,
    }),
    { excludedSoldOutCount: 0, ragCandidateCount: 0, resultCount: 0 },
  );
}

function toContextListings(
  listings?: Array<{
    cooperativeName: string;
    county: string;
    crop: string;
    description?: string;
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
    description: listing.description,
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
      description?: string;
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
    description: listing.description,
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

function clauseInputToParsedIntent(
  input: z.infer<typeof searchClauseSchema>,
): Parameters<typeof normalizeBuyerSearchIntent>[0] {
  return {
    crop: input.crop ?? null,
    county: input.county ?? null,
    grade: input.grade ?? null,
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
  const cardDisplayIntent = buildCardDisplayIntent(
    query,
    previousContextForNormalize,
  );

  if (cardDisplayIntent) {
    const searchResult = await executeBuyerSearchFromIntent(
      ctx,
      cardDisplayIntent,
      previousSourcingContext,
    );

    return {
      intent: searchResult.intent,
      meta: searchResult.meta,
      results: searchResult.results,
      searchGroups:
        searchResult.results.length > 0
          ? [{ intent: searchResult.intent, results: searchResult.results }]
          : [],
    };
  }

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
      searchGroups: [],
    };
  }

  if (userMessageHasOrderAllIntent(query)) {
    const orderAllSource =
      previousListings.length > 0 ? previousListings : allContextListings;

    if (orderAllSource.length > 0) {
      const lines = buildOrderAllLines(orderAllSource);
      const orderDraft = await resolveOrderDraft(ctx, lines, orderAllSource);

      return {
        assistantText: orderDraft.summaryText,
        intent: (args.chatContext.previousSourcing?.intent as
          | BuyerSearchIntent
          | undefined) ?? { searchText: query },
        meta: turnState.meta,
        orderDraft: toValidatorOrderDraft(orderDraft),
        results: [],
        searchGroups: [],
      };
    }
  }

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
          "Search active in-stock listings matching the buyer's browse or refine request. Pass one clause per distinct crop/county/grade combination the buyer asked for.",
        inputSchema: z.object({
          clauses: z.array(searchClauseSchema).min(1),
        }),
        execute: async ({ clauses: clauseInputs }) => {
          const intents = clauseInputs.map((clauseInput) =>
            normalizeBuyerSearchIntent(
              clauseInputToParsedIntent(clauseInput),
              query,
              previousContextForNormalize,
            ),
          );

          const { groups } = await executeBuyerSearchClauses(
            ctx,
            intents,
            previousSourcingContext,
          );

          turnState.searchGroups = groups.map((group) => ({
            intent: group.intent,
            results: group.results,
          }));
          turnState.results = dedupeResultsById(groups);
          turnState.meta = sumSearchGroupMeta(groups);
          // Keep the first clause's intent as the "primary" intent for follow-up context
          // (refine/inherit logic) — later clauses are additional, not replacements.
          turnState.intent = groups[0]?.intent ?? turnState.intent;

          return {
            groupCount: groups.length,
            groups: groups.map((group) => ({
              crop: group.intent.crop ?? null,
              resultCount: group.results.length,
            })),
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
    turnState.searchGroups =
      searchResult.results.length > 0
        ? [{ intent: searchResult.intent, results: searchResult.results }]
        : [];
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
    searchGroups: turnState.searchGroups,
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
