import type { DocumentSummary } from "@repo/types";
import { Chip } from "@heroui/react";
import { FileText } from "lucide-react";

import { DocumentStatusChip } from "@/components/knowledge/ui/document-status-chip";

interface DocumentRowProps {
  document: DocumentSummary;
}

export function DocumentRow({ document }: DocumentRowProps) {
  return (
    <li className="flex items-start gap-3 rounded-[0.875rem] bg-default/45 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm dark:shadow-none">
        <FileText className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {document.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <DocumentStatusChip status={document.status} />
          <Chip size="sm" variant="secondary">
            <Chip.Label>{document.sourceType}</Chip.Label>
          </Chip>
        </div>
      </div>
    </li>
  );
}
