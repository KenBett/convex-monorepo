import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { RouteGuard } from "@/components/auth/route-guard";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return (
    <RouteGuard mode="onboarding">
      <OnboardingFlow />
    </RouteGuard>
  );
}
