import type {
  BuyerChatTrailStep,
  BuyerRetrievalMode,
  BuyerSearchIntent,
} from "@repo/types";

const RETRIEVAL_MODE_LABEL: Record<BuyerRetrievalMode, string> = {
  hybrid: "Hybrid index + vector",
  indexed_browse: "Indexed crop browse",
  refine: "Refining prior results",
  vector: "Vector inventory search",
};

export function buildFilterLabels(intent: BuyerSearchIntent): string[] {
  const labels: string[] = [];
  if (intent.crop) {
    labels.push(intent.crop);
  }
  if (intent.county) {
    labels.push(intent.county);
  }
  if (intent.grade) {
    labels.push(`grade ${intent.grade}`);
  }
  if (intent.maxPricePerKg !== undefined) {
    labels.push(`≤ KES ${intent.maxPricePerKg}/kg`);
  }
  if (intent.minQuantityKg !== undefined) {
    labels.push(`≥ ${intent.minQuantityKg} kg`);
  }
  if (intent.tags) {
    for (const tag of intent.tags) {
      labels.push(tag.replaceAll("_", " "));
    }
  }
  if (intent.pricePreference === "cheapest") {
    labels.push("cheapest first");
  }
  if (intent.pricePreference === "most_expensive") {
    labels.push("highest price first");
  }
  return labels;
}

export function buildOptimisticTrail(
  phase: "working" | "searching" | "ordering",
): BuyerChatTrailStep[] {
  if (phase === "ordering") {
    return [
      {
        id: "understand",
        label: "Understanding ask",
        state: "done",
      },
      {
        id: "search",
        label: "Preparing order",
        state: "active",
      },
    ];
  }

  if (phase === "searching") {
    return [
      {
        id: "understand",
        label: "Understanding ask",
        state: "done",
      },
      {
        id: "search",
        label: "Searching inventory",
        state: "active",
      },
      {
        id: "filter",
        label: "Applying filters",
        state: "pending",
      },
      {
        id: "rank",
        label: "Ranking matches",
        state: "pending",
      },
    ];
  }

  return [
    {
      id: "understand",
      label: "Understanding ask",
      state: "active",
    },
    {
      id: "search",
      label: "Searching inventory",
      state: "pending",
    },
    {
      id: "filter",
      label: "Applying filters",
      state: "pending",
    },
    {
      id: "rank",
      label: "Ranking matches",
      state: "pending",
    },
  ];
}

export function buildCompletedTrail(args: {
  filterLabels: string[];
  ragCandidateCount: number;
  resultCount: number;
  retrievalMode: BuyerRetrievalMode;
}): BuyerChatTrailStep[] {
  const filterDetail =
    args.filterLabels.length > 0
      ? args.filterLabels.join(" · ")
      : "No hard filters";

  return [
    {
      id: "understand",
      label: "Understanding ask",
      state: "done",
    },
    {
      detail: `${RETRIEVAL_MODE_LABEL[args.retrievalMode]} · ${args.ragCandidateCount} candidates`,
      id: "search",
      label: "Searching inventory",
      state: "done",
    },
    {
      detail: filterDetail,
      id: "filter",
      label: "Applying filters",
      state: "done",
    },
    {
      detail: `${args.resultCount} ranked result${args.resultCount === 1 ? "" : "s"}`,
      id: "rank",
      label: "Ranking matches",
      state: "done",
    },
  ];
}
