"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";

type PromptBlockProps = {
  compact?: boolean;
  copied: boolean;
  label: string;
  onCopy: () => void;
  prompt: string;
  tone: "amber" | "rose";
};

function PromptBlock({
  compact = false,
  copied,
  label,
  onCopy,
  prompt,
  tone,
}: PromptBlockProps) {
  const shell =
    tone === "amber"
      ? "border-amber-500/25 bg-amber-500/10"
      : "border-rose-500/25 bg-rose-500/10";
  const title =
    tone === "amber"
      ? "text-amber-950 dark:text-amber-100"
      : "text-rose-950 dark:text-rose-100";
  const body =
    tone === "amber"
      ? "text-amber-950/90 dark:text-amber-50/90"
      : "text-rose-950/90 dark:text-rose-50/90";

  return (
    <div
      className={clsx(
        "flex flex-col gap-1.5 rounded-lg border",
        shell,
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={clsx(
            "font-medium",
            title,
            compact ? "text-[10px] uppercase tracking-wide" : "text-xs",
          )}
        >
          {label}
        </p>
        <Button
          aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
          className={clsx(
            "min-w-0 shrink-0 rounded-md px-1.5",
            compact ? "h-6" : "h-7",
          )}
          size="sm"
          variant="ghost"
          onPress={onCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" strokeWidth={2} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          {!compact ? (
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          ) : null}
        </Button>
      </div>
      <p
        className={clsx(
          body,
          compact
            ? "line-clamp-3 text-[11px] leading-snug"
            : "text-sm leading-relaxed",
        )}
      >
        {prompt}
      </p>
    </div>
  );
}

type DemoSearchPromptPanelProps = {
  compact?: boolean;
  pinterestQuery?: string | null;
  prompt: string;
};

export function DemoSearchPromptPanel({
  compact = false,
  pinterestQuery,
  prompt,
}: DemoSearchPromptPanelProps) {
  const [copiedKey, setCopiedKey] = useState<"query" | "pinterest" | null>(
    null,
  );

  const copyText = async (text: string, key: "query" | "pinterest") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Clipboard may be blocked; leave UI unchanged.
    }
  };

  return (
    <div className={clsx("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      <PromptBlock
        compact={compact}
        copied={copiedKey === "query"}
        label="Demo query"
        prompt={prompt}
        tone="amber"
        onCopy={() => {
          void copyText(prompt, "query");
        }}
      />
      {pinterestQuery ? (
        <PromptBlock
          compact={compact}
          copied={copiedKey === "pinterest"}
          label="Pinterest search"
          prompt={pinterestQuery}
          tone="rose"
          onCopy={() => {
            void copyText(pinterestQuery, "pinterest");
          }}
        />
      ) : null}
    </div>
  );
}
