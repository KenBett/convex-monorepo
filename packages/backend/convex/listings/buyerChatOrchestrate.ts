"use node";

import { CROP_TYPES, COUNTIES, LISTING_CERTIFICATIONS, LISTING_HARD_FILTER_TAGS, LISTING_PACKAGING } from "@repo/types";
import { generateText, stepCountIs, tool } from "ai";
import { type Infer, v } from "convex/values";
import { z } from "zod";

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { answerModel } from "../lib/rag";
import { resolveNeededByFromText, resolveNeededByMs } from "../lib/buyerNeededBy";
import {
  buyerSearchIntentValidator,
  type BuyerSearchIntent,
} from "./buyerChatParse";
import { buyerChatRequestContextValidator } from "./buyerChatContext";
import {
  answerAboutListingsFromTool,
  promoteFocusedListing,
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
  extractCropFromQuery,
  fallbackBuyerSearchIntent,
  messageHasExpandResultsIntent,
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
  buildCompletedTrail,
  buildFilterLabels,
} from "./buyerChatTrail";
import {
  listingSearchResultValidator,
  type ListingSearchResultRow,
} from "./search";

const buyerChatTrailStepValidator = v.object({
  detail: v.optional(v.string()),
  id: v.union(
    v.literal("understand"),
    v.literal("search"),
    v.literal("filter"),
    v.literal("rank"),
  ),
  label: v.string(),
  state: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("done"),
  ),
});

const buyerSourcingMetaValidator = v.object({
  excludedSoldOutCount: v.number(),
  filterLabels: v.optional(v.array(v.string())),
  ragCandidateCount: v.number(),
  resultCount: v.number(),
  retrievalMode: v.optional(
    v.union(
      v.literal("hybrid"),
      v.literal("indexed_browse"),
      v.literal("refine"),
      v.literal("vector"),
    ),
  ),
  trail: v.optional(v.array(buyerChatTrailStepValidator)),
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

type BuyerSourcingMeta = {
  excludedSoldOutCount: number;
  filterLabels?: string[];
  ragCandidateCount: number;
  resultCount: number;
  retrievalMode?:
    | "hybrid"
    | "indexed_browse"
    | "refine"
    | "vector";
  trail?: Array<{
    detail?: string;
    id: "understand" | "search" | "filter" | "rank";
    label: string;
    state: "pending" | "active" | "done";
  }>;
};

export type BuyerChatTurnResult = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: BuyerSourcingMeta;
  orderDraft?: ReturnType<typeof toValidatorOrderDraft>;
  results: ListingSearchResultRow[];
  searchGroups: BuyerSearchGroup[];
};

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a warm, helpful customer-care assistant for a Kenyan produce marketplace (Offtake / Vunr). Buyers chat with you to learn about produce, browse live co-op listings, and place orders.

Default: reply in plain text with NO tools for greetings, thanks, how-the-app-works questions, soft produce advice, or unclear intent. Be concise, friendly, and ask one clarifying question when you need crop, county, grade, or quantity. Never invent listing IDs, prices, grades, or stock — only use tools or prior listing context for marketplace facts.

Critical: "Previous search context: none" means the buyer has not browsed yet — NOT that inventory is empty. For greetings and small talk, never claim there are no listings or that produce is unavailable. Just greet and offer help.

Tools (call only when intent is clear):
- searchListings: buyer wants to see options — browsing, comparing, refining, or checking availability (show/find/looking for/available/list/search). Not for greetings or general advice.
- prepareOrder: clear purchase intent — order/buy/purchase/get me, or I want/I need WITH a quantity or a listing reference ("the first one", "that maize"). Soft preference without quantity ("I might want maize someday") → text only, ask what they need.
- answerAboutListings: text question about metadata of listings already shown (grade, price, quantity, county, cooperative, status, description, tags/standards, certifications, packaging, variety, harvest). For "tell me about this maize" / "details on the first one", omit fields to get a full summary. For "is this export quality/organic/KEPSA?" ask for tags or certifications. Use listingRef for "first/second" and crop/cooperative hints for "that maize" / "from Kenato".

When NOT to call tools:
- Hello, hi, thanks, bye, or small talk → short care reply only.
- "How does ordering / payment / sourcing work?" → explain in text (search → review cards → confirm order → pay).
- Produce advice without a browse/buy ask ("is maize good this season?") → helpful text; offer to show listings if useful, but do not call searchListings unless they ask to see options.
- Unclear intent → one clarifying question in text.

When to call tools:
- Naming a crop (e.g. "maize", "tomatoes in Nakuru") with no other intent → searchListings.
- Display/browse cues such as "show", "display", "list", "provide", "pull up", "bring up", "find", "search", "select", "pick", "choose", "looking for", "do you have", "any … available" → searchListings (return listing cards), including refinements like "select the cheapest one", "show me the cheapest one", or "display grade 2 only". Never answer those with answerAboutListings text.
- Order verbs with quantity or listingRef: order, buy, purchase, get me, I want, I need (with kg / "the first one" / "that one") → prepareOrder.
- Question verbs about earlier results ("what is the grade…", "how much is the first one?", "is this export quality?", "tell me about this maize") → answerAboutListings, not searchListings.
- Mixed messages (e.g. "find maize and order 5kg from Kenato") → call both searchListings and prepareOrder as needed.

Other rules:
- For prepareOrder, extract every line item separately (comma / and separated counts).
- For prepareOrder, extract delivery timing when mentioned (e.g. "by Monday morning") into neededByLabel.
- Map crops to: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- Counties must be one of: ${COUNTIES.join(", ")} when mentioned.
- For "the second one" / "first listing" set listingRef (1-based) on that line and omit cooperative if unknown.
- Never invent listing IDs — prepareOrder resolves listings server-side.
- searchListings takes a "clauses" array — pass ONE clause per distinct crop/county/grade combination. "grade 2 tomatoes only and maize from Bungoma" is two clauses.
- If the message only orders from earlier results, call prepareOrder only with listingRef or cooperative/grade hints.
- When the buyer confirms with pronouns ("order it", "buy that"), call prepareOrder using quantityKg from an earlier buyer message when the latest message omits kg.
- When the buyer says "order all of them" / "buy everything" / "the whole lot", do not call prepareOrder — handled before you are invoked.
- When the buyer pivots to a new crop (e.g. "show me onions" after maize), call searchListings as a fresh search — refinePreviousResults false, do not reuse the prior county/filters unless restated. Still use answerAboutListings/prepareOrder for questions or orders about cards already shown.
- When the buyer asks for more of the same produce ("show me the rest", "any more"), call searchListings with refinePreviousResults false (server excludes already-shown cards).
- When the buyer asks a chain of questions about one card ("how much?", "what grade?", "order it"), keep that listing context — answerAboutListings / prepareOrder, not a new browse.
- prepareOrder applies only to the latest buyer message when it contains order intent.
- For answerAboutListings, resolve "that/the/this" using crop or listingRef from shown listings. Never guess values — read them via the tool.

${SEARCH_INTENT_TOOL_RULES}`;

const orderLineSchema = z.object({
  cooperativeName: z.string().optional(),
  county: z.enum(COUNTIES).optional(),
  crop: z.enum(CROP_TYPES),
  grade: z.string().optional(),
  listingRef: z.number().int().positive().optional(),
  neededByLabel: z.string().optional(),
  quantityKg: z.number().positive(),
});

const searchClauseSchema = z.object({
  certifications: z
    .array(z.enum(LISTING_CERTIFICATIONS))
    .nullable()
    .optional(),
  county: z.enum(COUNTIES).nullable().optional(),
  crop: z.enum(CROP_TYPES).nullable().optional(),
  grade: z.string().nullable().optional(),
  maxPricePerKg: z.number().positive().nullable().optional(),
  minQuantityKg: z.number().positive().nullable().optional(),
  packaging: z.enum(LISTING_PACKAGING).nullable().optional(),
  pricePreference: z
    .enum(["cheapest", "most_expensive"])
    .nullable()
    .optional(),
  refinePreviousResults: z.boolean().optional(),
  resultLimit: z.number().int().positive().nullable().optional(),
  searchText: z.string(),
  tags: z.array(z.enum(LISTING_HARD_FILTER_TAGS)).nullable().optional(),
});

type TurnState = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: BuyerSourcingMeta;
  orderDraft?: ReturnType<typeof toValidatorOrderDraft>;
  results: ListingSearchResultRow[];
  searchGroups: BuyerSearchGroup[];
};

function emptyTurnState(): TurnState {
  return {
    intent: { searchText: "" },
    meta: {
      excludedSoldOutCount: 0,
      filterLabels: [],
      ragCandidateCount: 0,
      resultCount: 0,
      retrievalMode: "vector",
      trail: buildCompletedTrail({
        filterLabels: [],
        ragCandidateCount: 0,
        resultCount: 0,
        retrievalMode: "vector",
      }),
    },
    results: [],
    searchGroups: [],
  };
}

const CARD_DISPLAY_REQUEST_PATTERN =
  /\b(show|display|list|provide|pull\s+up|bring\s+up|find|search|select|pick|choose)\b/i;

/** Soft browse cues beyond display verbs (availability / looking-for). */
const BROWSE_AVAILABILITY_PATTERN =
  /\b(looking\s+for|do\s+you\s+have|any\b.+\bavailable|have\s+any|in\s+stock|available\s+(?:for|in|from)?)\b/i;

/** "the cheapest one" / "most expensive one" without an explicit show/select verb. */
const CARD_PICK_PATTERN =
  /\b(the\s+)?(cheapest|most\s+expensive|priciest|lowest\s+price|highest\s+price|best)\s+one\b/i;

const TEXT_ANSWER_REQUEST_PATTERN =
  /\b(what|which|how\s+much|how\s+many|tell\s+me|who|where|explain|describe)\b/i;

/** Greetings / thanks / goodbye — reply in text, never search. */
const CARE_SMALLTALK_PATTERN =
  /^(hi|hello|hey|howdy|hola|yo|sup|good\s+(morning|afternoon|evening)|thanks|thank\s+you|thx|ty|bye|goodbye|see\s+you|ok|okay|cool|great|perfect|nice)[\s!.?]*$/i;

/** How the marketplace / ordering works. */
const HOW_IT_WORKS_PATTERN =
  /\b(how\s+(does|do|can|to)|what\s+is|explain|help)\b.*\b(order|ordering|buy|buying|pay|payment|source|sourcing|work|chat|app|this)\b/i;

const CARE_THANKS_REPLY =
  "You're welcome! Need anything else?";

const CARE_BYE_REPLY = "Anytime — happy sourcing.";

const CARE_HOW_IT_WORKS_REPLY =
  "Tell me what you need, I'll show matching listings, then you can confirm and pay. What are you sourcing?";

function buildGreetingReply(firstName?: string): string {
  if (firstName) {
    return `Hey, ${firstName} — what are you sourcing today?`;
  }

  return "Hey — what are you sourcing today?";
}

function buildCareFallbackReply(firstName?: string): string {
  return buildGreetingReply(firstName);
}

/** Warm reply when a browse/search finds nothing. */
function buildEmptySearchAssistantText(intent: BuyerSearchIntent): string {
  const gradePart = intent.grade?.trim()
    ? `grade ${intent.grade.trim()} `
    : "";
  const cropPart = intent.crop?.trim() ? intent.crop.trim() : "produce";
  const countyPart = intent.county?.trim()
    ? ` in ${intent.county.trim()}`
    : "";

  return (
    `I'm sorry — I don't have any ${gradePart}${cropPart}${countyPart} available right now. ` +
    `Would you like to try a different grade, county, or crop?`
  );
}

const CHEAPEST_PATTERN =
  /\b(cheapest|lowest\s+price|least\s+expensive|best\s+value|affordable)\b/i;

const MOST_EXPENSIVE_PATTERN =
  /\b(most\s+expensive|highest\s+price|priciest|premium\s+price)\b/i;

const SINGLE_CARD_PATTERN =
  /\b(one|1|single|top|best|cheapest|lowest\s+price|least\s+expensive|most\s+expensive|highest\s+price|priciest)\b/i;

/** True when the message clearly asks to see listings (display cues, availability, or names a crop). */
function messageHasBrowseIntent(query: string): boolean {
  return (
    CARD_DISPLAY_REQUEST_PATTERN.test(query) ||
    CARD_PICK_PATTERN.test(query) ||
    BROWSE_AVAILABILITY_PATTERN.test(query) ||
    extractCropFromQuery(query) !== undefined
  );
}

function messageHasCardSelectionIntent(query: string): boolean {
  return (
    CARD_DISPLAY_REQUEST_PATTERN.test(query) || CARD_PICK_PATTERN.test(query)
  );
}

/**
 * Deterministic customer-care replies for greetings / thanks / how-it-works.
 * Skips the LLM so "hello" never becomes an inventory claim.
 */
function tryDeterministicCareReply(
  query: string,
  firstName?: string,
): string | null {
  const normalized = query.trim();
  if (CARE_SMALLTALK_PATTERN.test(normalized)) {
    if (/^(thanks|thank\s+you|thx|ty)[\s!.?]*$/i.test(normalized)) {
      return CARE_THANKS_REPLY;
    }
    if (/^(bye|goodbye|see\s+you)[\s!.?]*$/i.test(normalized)) {
      return CARE_BYE_REPLY;
    }
    if (/^(ok|okay|cool|great|perfect|nice)[\s!.?]*$/i.test(normalized)) {
      return "Sounds good — crop, county, or quantity whenever you're ready.";
    }
    return buildGreetingReply(firstName);
  }

  if (HOW_IT_WORKS_PATTERN.test(normalized) && !messageHasBrowseIntent(normalized)) {
    return CARE_HOW_IT_WORKS_REPLY;
  }

  return null;
}

/**
 * Deterministic browse without LLM: display/availability cues or an explicit crop name.
 * Blocked for listing Q&A and order intent; greetings are handled earlier.
 */
function buildDeterministicBrowseIntent(
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent | null {
  if (TEXT_ANSWER_REQUEST_PATTERN.test(query)) {
    return null;
  }

  if (userMessageHasOrderIntent(query)) {
    return null;
  }

  if (!messageHasBrowseIntent(query)) {
    return null;
  }

  const hasDisplayVerb = messageHasCardSelectionIntent(query);
  const cropFromQuery = extractCropFromQuery(query);
  const isExpand = messageHasExpandResultsIntent(query);

  const pricePreference = CHEAPEST_PATTERN.test(query)
    ? "cheapest"
    : MOST_EXPENSIVE_PATTERN.test(query)
      ? "most_expensive"
      : null;

  // Refine = re-rank cards already shown. Expand / new crop = fresh inventory search.
  const refinePreviousResults =
    !isExpand &&
    hasDisplayVerb &&
    previousContext !== undefined &&
    !cropFromQuery;

  return normalizeBuyerSearchIntent(
    {
      certifications: null,
      crop: null,
      county: null,
      grade: null,
      maxPricePerKg: null,
      minQuantityKg: null,
      packaging: null,
      pricePreference,
      refinePreviousResults,
      resultLimit:
        !isExpand && SINGLE_CARD_PATTERN.test(query) ? 1 : null,
      searchText: query,
      tags: null,
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

function sumSearchGroupMeta(groups: BuyerSearchGroupResult[]): BuyerSourcingMeta {
  const totals = groups.reduce(
    (total, group) => ({
      excludedSoldOutCount:
        total.excludedSoldOutCount + group.meta.excludedSoldOutCount,
      ragCandidateCount: total.ragCandidateCount + group.meta.ragCandidateCount,
      resultCount: total.resultCount + group.meta.resultCount,
    }),
    { excludedSoldOutCount: 0, ragCandidateCount: 0, resultCount: 0 },
  );

  const primary = groups[0]?.meta;
  const retrievalMode = primary?.retrievalMode ?? "vector";
  const filterLabels =
    primary?.filterLabels ??
    buildFilterLabels(groups[0]?.intent ?? { searchText: "" });

  return {
    ...totals,
    filterLabels,
    retrievalMode,
    trail: buildCompletedTrail({
      filterLabels,
      ragCandidateCount: totals.ragCandidateCount,
      resultCount: totals.resultCount,
      retrievalMode,
    }),
  };
}

function toContextListing(
  listing: {
    certifications?: BuyerChatPreviousListing["certifications"];
    cooperativeName: string;
    county: string;
    crop: string;
    description?: string;
    grade?: string;
    harvestWindowLabel?: string;
    listingId: BuyerChatPreviousListing["listingId"];
    minOrderKg?: number;
    packaging?: BuyerChatPreviousListing["packaging"];
    packUnitKg?: number;
    pricePerKg: number;
    quantityKg: number;
    sizeOrCalibre?: string;
    status: "active" | "expired" | "sold_out";
    tags?: BuyerChatPreviousListing["tags"];
    variety?: string;
  },
): BuyerChatPreviousListing {
  return {
    certifications: listing.certifications,
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    listingId: listing.listingId,
    minOrderKg: listing.minOrderKg,
    packaging: listing.packaging,
    packUnitKg: listing.packUnitKg,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    sizeOrCalibre: listing.sizeOrCalibre,
    status: listing.status,
    tags: listing.tags,
    variety: listing.variety,
  };
}

function toContextListings(
  listings?: Array<Parameters<typeof toContextListing>[0]>,
): BuyerChatPreviousListing[] {
  if (!listings) {
    return [];
  }

  return listings.map(toContextListing);
}

function toPreviousListings(
  previousSourcing?: {
    listings: Array<Parameters<typeof toContextListing>[0]>;
  },
): BuyerChatPreviousListing[] {
  if (!previousSourcing) {
    return [];
  }

  return previousSourcing.listings.map(toContextListing);
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
  "certifications",
  "cooperative",
  "county",
  "description",
  "grade",
  "harvest",
  "packaging",
  "price",
  "quantity",
  "status",
  "tags",
  "variety",
]);

function clauseInputToParsedIntent(
  input: z.infer<typeof searchClauseSchema>,
): Parameters<typeof normalizeBuyerSearchIntent>[0] {
  return {
    certifications: input.certifications ?? null,
    crop: input.crop ?? null,
    county: input.county ?? null,
    grade: input.grade ?? null,
    maxPricePerKg: input.maxPricePerKg ?? null,
    minQuantityKg: input.minQuantityKg ?? null,
    packaging: input.packaging ?? null,
    searchText: input.searchText,
    refinePreviousResults: input.refinePreviousResults ?? false,
    pricePreference: input.pricePreference ?? null,
    resultLimit: input.resultLimit ?? null,
    tags: input.tags ?? null,
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

  const fulfillmentContext = await ctx.runQuery(
    internal.users.buyerFulfillmentContext,
    {},
  );
  const buyerFirstName = fulfillmentContext.firstName;
  const neededBy = resolveNeededByFromText(query);
  const orderDraftOptions = {
    neededByLabel: neededBy?.label,
    neededByMs: neededBy?.neededByMs,
    pointBLabel: fulfillmentContext.businessName,
  };

  const turnState = emptyTurnState();
  const conversationListings = toContextListings(
    args.chatContext.conversationListings,
  );
  const previousListings = promoteFocusedListing(
    toPreviousListings(args.chatContext.previousSourcing),
    args.chatContext.focusedListingId,
  );
  const allContextListings = promoteFocusedListing(
    conversationListings.length > 0 ? conversationListings : previousListings,
    args.chatContext.focusedListingId,
  );
  const focusedListingId = args.chatContext.focusedListingId;
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

  const careReply = tryDeterministicCareReply(query, buyerFirstName);
  if (careReply) {
    return {
      assistantText: careReply,
      intent: (args.chatContext.previousSourcing?.intent as
        | BuyerSearchIntent
        | undefined) ?? { searchText: query },
      meta: turnState.meta,
      results: [],
      searchGroups: [],
    };
  }

  const browseIntent = buildDeterministicBrowseIntent(
    query,
    previousContextForNormalize,
  );

  if (browseIntent) {
    const searchResult = await executeBuyerSearchFromIntent(
      ctx,
      browseIntent,
      previousSourcingContext,
    );

    const emptyExpandText =
      searchResult.results.length === 0 &&
      browseIntent.excludePreviousListings
        ? `That's everything I have for ${browseIntent.crop ?? "that produce"}${browseIntent.county ? ` in ${browseIntent.county}` : ""} right now — nothing beyond what I already showed.`
        : undefined;

    return {
      assistantText:
        searchResult.results.length === 0
          ? (emptyExpandText ??
            buildEmptySearchAssistantText(searchResult.intent))
          : undefined,
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
    focusedListingId,
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
      const orderDraft = await resolveOrderDraft(
        ctx,
        lines,
        orderAllSource,
        orderDraftOptions,
      );

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
        focusedListingId
          ? `- focused listing (centered in carousel): ${focusedListingId} — treat "this/that/it" as this listing`
          : undefined,
        previousListings
          .map(
            (listing, index) =>
              `${index + 1}. ${listing.crop} from ${listing.cooperativeName}${listing.grade ? ` grade ${listing.grade}` : ""} @ KES ${listing.pricePerKg}/kg (${listing.listingId})${focusedListingId === listing.listingId ? " ← FOCUSED" : ""}`,
          )
          .join("\n"),
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n")
    : "Previous search context: none (buyer has not browsed yet — do not claim inventory is empty)";

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
          "Answer a metadata question about listings already shown in this chat. Omit fields for a full summary (grade, price, stock, county, cooperative, status, seller notes, tags/standards, certifications, packaging, variety, harvest). Pass specific fields only for targeted questions (e.g. tags for export grade/organic, certifications for KEPSA, or grade/price).",
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
            focusedListingId,
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
          neededByLabel: z.string().optional(),
        }),
        execute: async ({ lines, neededByLabel: toolNeededBy }) => {
          const resolvedLabel =
            toolNeededBy ??
            orderDraftOptions.neededByLabel ??
            lines.map((line) => line.neededByLabel).find(Boolean);
          const orderDraft = await resolveOrderDraft(
            ctx,
            lines,
            previousListings,
            {
              ...orderDraftOptions,
              neededByLabel: resolvedLabel,
              neededByMs:
                orderDraftOptions.neededByMs ??
                (resolvedLabel
                  ? resolveNeededByMs(resolvedLabel)
                  : undefined),
            },
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
          "Search active in-stock listings matching the buyer's browse or refine request. Pass one clause per distinct crop/county/grade/quality/standards combination. Grade, packaging, tags, and certifications are strict filters.",
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

  const llmText =
    llmResult.text.trim().length > 0 ? llmResult.text.trim() : undefined;

  // Prefer free-text care replies when the model did not call tools that set state.
  if (
    !turnState.assistantText &&
    llmText &&
    turnState.results.length === 0 &&
    !turnState.orderDraft
  ) {
    turnState.assistantText = llmText;
  }

  // Only fall back to search when the buyer clearly wanted listings and the LLM
  // produced neither text, cards, nor an order draft (e.g. tool call failed).
  if (
    turnState.results.length === 0 &&
    !turnState.orderDraft &&
    !turnState.assistantText &&
    messageHasBrowseIntent(query)
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
        orderDraftOptions,
      );
      turnState.orderDraft = toValidatorOrderDraft(orderDraft);
    }
  }

  if (turnState.orderDraft && !userMessageHasOrderIntent(query)) {
    turnState.orderDraft = undefined;
  }

  // Care fallback: never leave the buyer with an empty turn when they were not browsing.
  if (
    turnState.results.length === 0 &&
    !turnState.orderDraft &&
    !turnState.assistantText &&
    !messageHasBrowseIntent(query)
  ) {
    turnState.assistantText = buildCareFallbackReply(buyerFirstName);
  }

  // Empty search: never leave a blank reply after a browse that found nothing.
  if (
    turnState.results.length === 0 &&
    !turnState.orderDraft &&
    !turnState.assistantText &&
    (messageHasBrowseIntent(query) || turnState.searchGroups.length > 0)
  ) {
    turnState.assistantText = buildEmptySearchAssistantText(turnState.intent);
  }

  const assistantText =
    turnState.assistantText ??
    turnState.orderDraft?.summaryText ??
    llmText;

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
