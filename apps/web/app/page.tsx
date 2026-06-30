import { RouteGuard } from "@/components/auth/route-guard";

function RoutingSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

export default function IndexPage() {
  return <RouteGuard fallback={<RoutingSpinner />} mode="index" />;
}
