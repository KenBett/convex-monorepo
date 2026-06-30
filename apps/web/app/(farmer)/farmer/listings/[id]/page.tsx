import type { Metadata } from "next";

import { ListingDetailClient } from "@/components/farmer/listing-detail-client";

export const metadata: Metadata = {
  title: "Listing",
};

export default function ListingDetailPage() {
  return <ListingDetailClient />;
}
