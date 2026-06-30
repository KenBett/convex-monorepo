import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Buyer Dashboard",
};

export default function BuyerPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface px-10 py-12 text-surface-foreground shadow-sm dark:shadow-none">
        <ShoppingBag className="h-10 w-10" strokeWidth={1.75} />
        <p className="font-mono text-sm text-muted">/buyer</p>
      </div>
    </div>
  );
}
