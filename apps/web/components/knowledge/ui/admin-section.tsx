import type { DocumentSummary } from "@repo/types";
import { Button, Card, Input, TextArea } from "@heroui/react";
import { BookOpen, FileText, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { DocumentStatusChip } from "@/components/knowledge/ui/document-status-chip";
import { KnowledgeEmptyState } from "@/components/knowledge/ui/knowledge-empty-state";

interface AdminSectionProps {
  busyState: string | null;
  documents: DocumentSummary[] | undefined;
  fileTitle: string;
  onAddFile: (event: FormEvent<HTMLFormElement>) => void;
  onAddText: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (document: DocumentSummary) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileTitleChange: (value: string) => void;
  onTextBodyChange: (value: string) => void;
  onTextTitleChange: (value: string) => void;
  selectedFile: File | null;
  textBody: string;
  textTitle: string;
}

export function AdminSection({
  busyState,
  documents,
  fileTitle,
  onAddFile,
  onAddText,
  onDelete,
  onFileChange,
  onFileTitleChange,
  onTextBodyChange,
  onTextTitleChange,
  selectedFile,
  textBody,
  textTitle,
}: AdminSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow">Admin</p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Library
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminPanel icon={FileText} title="Add text">
          <form className="flex flex-col gap-3" onSubmit={onAddText}>
            <Input
              aria-label="Document title"
              fullWidth
              onChange={(event) => onTextTitleChange(event.target.value)}
              placeholder="Title"
              value={textTitle}
              variant="secondary"
            />
            <TextArea
              aria-label="Document text"
              fullWidth
              onChange={(event) => onTextBodyChange(event.target.value)}
              placeholder="Paste text"
              value={textBody}
              variant="secondary"
            />
            <Button
              className="w-fit rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
              isDisabled={busyState === "text"}
              size="sm"
              type="submit"
              variant="primary"
            >
              {busyState === "text" ? "Indexing…" : "Index"}
            </Button>
          </form>
        </AdminPanel>

        <AdminPanel icon={Upload} title="Add file">
          <form className="flex flex-col gap-3" onSubmit={onAddFile}>
            <Input
              aria-label="Optional file title"
              fullWidth
              onChange={(event) => onFileTitleChange(event.target.value)}
              placeholder="Title (optional)"
              value={fileTitle}
              variant="secondary"
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full bg-default/50 px-4 py-2.5 text-sm text-muted transition-opacity hover:opacity-80">
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {selectedFile?.name ?? "Choose file…"}
              </span>
              <input
                accept=".pdf,.txt,.md,text/plain,application/pdf,text/markdown"
                aria-label="Choose file"
                className="sr-only"
                onChange={onFileChange}
                type="file"
              />
            </label>
            <Button
              className="w-fit rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
              isDisabled={busyState === "file" || !selectedFile}
              size="sm"
              type="submit"
              variant="primary"
            >
              {busyState === "file" ? "Indexing…" : "Upload"}
            </Button>
          </form>
        </AdminPanel>
      </div>

      <AdminPanel icon={BookOpen} title="Documents">
        <div className="flex flex-col gap-2">
          {(documents ?? []).map((document) => (
            <div
              className="flex items-center gap-3 rounded-[0.875rem] bg-default/45 px-3 py-2.5"
              key={document._id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {document.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <DocumentStatusChip status={document.status} />
                </div>
              </div>
              <Button
                className="rounded-full focus-visible:outline-none focus-visible:opacity-80"
                isDisabled={busyState === `delete:${document._id}`}
                onPress={() => onDelete(document)}
                size="sm"
                variant="danger-soft"
              >
                Delete
              </Button>
            </div>
          ))}
          {documents?.length === 0 ? (
            <KnowledgeEmptyState icon={FileText} title="Empty" />
          ) : null}
        </div>
      </AdminPanel>
    </section>
  );
}

function AdminPanel({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: typeof FileText;
  title: string;
}) {
  return (
    <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
      <Card.Header className="px-5 pb-0 pt-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />
          <Card.Title className="text-sm font-semibold text-foreground">
            {title}
          </Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="px-5 py-4">{children}</Card.Content>
    </Card>
  );
}
