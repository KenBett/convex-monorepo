import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Dashboard",
};

export default function BuyerPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">Buyer dashboard</h1>
      <p className="text-muted text-sm">Marketplace buyer area — Phase 1 placeholder</p>
    </main>
  );
}
