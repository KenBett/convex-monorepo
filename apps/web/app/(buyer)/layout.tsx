import { RouteGuard } from "@/components/auth/route-guard";
import { LayoutShell } from "@/components/layout";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="role" requiredRole="buyer">
      <LayoutShell>{children}</LayoutShell>
    </RouteGuard>
  );
}
