"use client";

import { AppEmptyState } from "@repo/illustrations";
import { useEffect } from "react";

import { fontSans } from "@/config/fonts";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <html className={fontSans.variable} lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
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
      </body>
    </html>
  );
}
