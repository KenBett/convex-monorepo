import { Card } from "@heroui/react";

interface ExploreMetricCardProps {
  className?: string;
  label: string;
  value: number | string;
}

export function ExploreMetricCard({
  className,
  label,
  value,
}: ExploreMetricCardProps) {
  return (
    <Card
      className={`rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none ${className ?? ""}`}
    >
      <Card.Content className="flex flex-col gap-1 px-4 py-3">
        <span className="text-eyebrow">{label}</span>
        <span className="text-data text-lg font-medium text-foreground">
          {value}
        </span>
      </Card.Content>
    </Card>
  );
}
