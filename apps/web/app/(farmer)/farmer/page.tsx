import type { Metadata } from "next";

import { FarmerDashboardClient } from "@/components/farmer/farmer-dashboard-client";

export const metadata: Metadata = {
  title: "Farmer Dashboard",
};

export default function FarmerPage() {
  return <FarmerDashboardClient />;
}
