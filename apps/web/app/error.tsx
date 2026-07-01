"use client";

import { AppEmptyState } from "@repo/illustrations";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <AppEmptyState
        action={
          <button
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            type="button"
            onClick={() => reset()}
          >
            Try again
          </button>
        }
        description="An unexpected error occurred. Please try again."
        illustration="error"
        illustrationSize={160}
        title="Something went wrong"
      />
    </div>
  );
}
