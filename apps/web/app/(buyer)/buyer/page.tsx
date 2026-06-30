import type { Metadata } from "next";

import { BuyerListingSearch } from "@/components/buyer/listing-search";

export const metadata: Metadata = {
  title: "Buyer Dashboard",
};

export default function BuyerPage() {
  return <BuyerListingSearch />;
}
