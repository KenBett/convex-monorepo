import type { KnowledgeSearchResult } from "@repo/types";
import { Chip } from "@heroui/react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { KnowledgeEmptyState } from "@/components/knowledge/ui/knowledge-empty-state";

interface KnowledgeResultsProps {
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  results: KnowledgeSearchResult[];
  showRank?: boolean;
  title?: string;
}

export function KnowledgeResults({
  emptyIcon = Search,
  emptyTitle,
  results,
  showRank = false,
  title = "Results",
}: KnowledgeResultsProps) {
  if (results.length === 0) {
    if (!emptyTitle) {
      return null;
    }

    return <KnowledgeEmptyState icon={emptyIcon} title={emptyTitle} />;
  }

  return (
    <div className="motion-safe-fade-in flex flex-col gap-3">
      <h2 className="text-eyebrow">{title}</h2>
      <ol className="flex flex-col gap-2">
        {results.map((result, index) => (
          <li key={`${result.entryId}:${result.score}:${result.text.slice(0, 12)}`}>
            <article className="flex gap-3 rounded-[0.875rem] bg-default/45 p-3">
              {showRank ? (
                <div className="flex w-7 shrink-0 flex-col items-center pt-0.5">
                  <span className="text-data text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-sm font-medium leading-snug text-foreground">
                    {result.title ?? "Untitled"}
                  </h3>
                  <ScoreChip score={result.score} />
                </div>
                <ScoreMeter score={result.score} />
                <p className="mt-2.5 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted">
                  {result.text}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  return (
    <Chip size="sm" variant="secondary">
      <Chip.Label>{Math.round(score * 100)}%</Chip.Label>
    </Chip>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const width = `${Math.max(8, Math.round(score * 100))}%`;

  return (
    <div aria-hidden className="h-1 overflow-hidden rounded-full bg-default">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width }}
      />
    </div>
  );
}
