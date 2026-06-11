import { AuthGate } from "@/components/auth/auth-gate";
import { LayoutShell } from "@/components/layout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <LayoutShell>{children}</LayoutShell>
    </AuthGate>
  );
}
