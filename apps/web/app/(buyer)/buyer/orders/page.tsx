import { BuyerOrdersClient } from "@/components/buyer/buyer-orders-client";

export default function BuyerOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Track orders
        </h1>
      </header>
      <BuyerOrdersClient />
    </div>
  );
}
