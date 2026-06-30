import type { Metadata } from "next";

import { MyProductsClient } from "@/components/farmer/my-products-client";

export const metadata: Metadata = {
  title: "My Products",
};

export default function MyProductsPage() {
  return <MyProductsClient />;
}
