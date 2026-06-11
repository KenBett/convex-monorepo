"use client";

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
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            Something went wrong!
          </h2>
          <button
            className="rounded-lg bg-default px-4 py-2 text-sm font-semibold text-default-foreground transition-colors hover:bg-default/80"
            type="button"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
