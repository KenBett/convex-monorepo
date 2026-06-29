import type { DocumentStatus } from "@repo/types";
import { Chip } from "@heroui/react";
import clsx from "clsx";

const STATUS_CLASS: Record<DocumentStatus, string> = {
  ready: "text-success",
  error: "text-danger",
  processing: "text-muted",
};

interface DocumentStatusChipProps {
  status: DocumentStatus;
}

export function DocumentStatusChip({ status }: DocumentStatusChipProps) {
  return (
    <Chip className={clsx(STATUS_CLASS[status])} size="sm" variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}
