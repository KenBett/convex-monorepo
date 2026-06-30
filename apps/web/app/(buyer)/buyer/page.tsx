import type { Metadata } from "next";

import { BuyerSourcingChat } from "@/components/buyer/buyer-sourcing-chat";

export const metadata: Metadata = {
  title: "Buyer Dashboard",
};

export default function BuyerPage() {
  return <BuyerSourcingChat />;
}
