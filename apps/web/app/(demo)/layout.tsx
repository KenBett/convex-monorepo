import { RouteGuard } from "@/components/auth/route-guard";
import { LayoutShell } from "@/components/layout";

/** Temporary demo inventory console — remove this route group when done. */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="signedIn">
      <LayoutShell>{children}</LayoutShell>
    </RouteGuard>
  );
}
