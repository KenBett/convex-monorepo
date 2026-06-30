import { RouteGuard } from "@/components/auth/route-guard";
import { LayoutShell } from "@/components/layout";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="role" requiredRole="farmer">
      <LayoutShell>{children}</LayoutShell>
    </RouteGuard>
  );
}
