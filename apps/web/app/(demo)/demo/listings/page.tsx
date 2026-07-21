import type { Metadata } from "next";

import { DemoListingsClient } from "@/components/demo/demo-listings-client";

export const metadata: Metadata = {
  title: "Demo listings",
};

export default function DemoListingsPage() {
  return <DemoListingsClient />;
}
