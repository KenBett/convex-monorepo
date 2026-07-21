import { RouteGuard } from "@/components/auth/route-guard";
import { LayoutShell } from "@/components/layout";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="signedIn">
      <LayoutShell hideNavbar>{children}</LayoutShell>
    </RouteGuard>
  );
}
