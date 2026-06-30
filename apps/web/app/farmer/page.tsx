import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Farmer Dashboard",
};

export default function FarmerPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">Farmer dashboard</h1>
      <p className="text-muted text-sm">Marketplace farmer area — Phase 1 placeholder</p>
    </main>
  );
}
