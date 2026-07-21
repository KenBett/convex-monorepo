import type { Metadata } from "next";

import { DemoListingDetailClient } from "@/components/demo/demo-listing-detail-client";

export const metadata: Metadata = {
  title: "Demo listing",
};

export default function DemoListingDetailPage() {
  return <DemoListingDetailClient />;
}
