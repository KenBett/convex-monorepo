import { RouteGuard } from "@/components/auth/route-guard";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { AuthSplitLayoutSkeleton } from "@/components/auth/auth-split-layout-skeleton";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard fallback={<AuthSplitLayoutSkeleton />} mode="guest">
      <AuthSplitLayout>{children}</AuthSplitLayout>
    </RouteGuard>
  );
}
