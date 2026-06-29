import { EmptyState } from "@heroui/react";
import type { LucideIcon } from "lucide-react";

interface KnowledgeEmptyStateProps {
  icon: LucideIcon;
  title: string;
}

export function KnowledgeEmptyState({
  icon: Icon,
  title,
}: KnowledgeEmptyStateProps) {
  return (
    <EmptyState className="py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm dark:shadow-none">
          <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
    </EmptyState>
  );
}
