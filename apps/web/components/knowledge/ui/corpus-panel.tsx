import type { DocumentSummary } from "@repo/types";
import { Card, Skeleton } from "@heroui/react";
import { BookOpen, Library } from "lucide-react";

import { DocumentRow } from "@/components/knowledge/ui/document-row";
import { KnowledgeEmptyState } from "@/components/knowledge/ui/knowledge-empty-state";

interface CorpusPanelProps {
  documents: DocumentSummary[] | undefined;
  isLoading: boolean;
}

export function CorpusPanel({ documents, isLoading }: CorpusPanelProps) {
  const recentDocuments = (documents ?? []).slice(0, 6);

  return (
    <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm lg:sticky lg:top-28 dark:shadow-none">
      <Card.Header className="px-5 pb-0 pt-5">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted" strokeWidth={1.75} />
          <Card.Title className="text-sm font-semibold text-foreground">
            Corpus
          </Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="px-5 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                className="h-14 rounded-[0.875rem]"
                key={index}
              />
            ))}
          </div>
        ) : recentDocuments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {recentDocuments.map((document) => (
              <DocumentRow document={document} key={document._id} />
            ))}
          </ul>
        ) : (
          <KnowledgeEmptyState icon={BookOpen} title="Empty" />
        )}
      </Card.Content>
    </Card>
  );
}
