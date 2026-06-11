import NextLink from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="text-2xl font-semibold text-foreground">Page not found</h2>
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <NextLink
        className="rounded-lg bg-default px-4 py-2 text-sm font-semibold text-default-foreground transition-colors hover:bg-default/80"
        href="/"
      >
        Go back home
      </NextLink>
    </div>
  );
}
