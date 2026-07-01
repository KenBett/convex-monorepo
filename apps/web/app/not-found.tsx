import { AppEmptyState } from "@repo/illustrations";
import NextLink from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <AppEmptyState
        action={
          <NextLink
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            href="/"
          >
            Go back home
          </NextLink>
        }
        description="The page you are looking for does not exist."
        illustration="not-found"
        illustrationSize={160}
        title="Page not found"
      />
    </div>
  );
}
