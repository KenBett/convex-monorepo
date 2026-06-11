"use client";

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
  );
}
