import { RouteGuard } from "@/components/auth/route-guard";
import { VunrLogoLoader } from "@/components/layout/vunr-logo-loader";
import { LandingPage } from "@/components/marketing/landing-page";

export default function IndexPage() {
  return (
    <RouteGuard fallback={<VunrLogoLoader />} mode="index">
      <LandingPage />
    </RouteGuard>
  );
}
