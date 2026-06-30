import { ExploreMetricCard } from "@/components/knowledge/ui/explore-metric-card";
import type { MarketplaceRole } from "@repo/types";

interface ExploreHeroProps {
  readyCount: number;
  role?: MarketplaceRole;
  totalCount: number;
}

function formatAccessLabel(role?: MarketplaceRole): string {
  if (role === "farmer") {
    return "Farmer";
  }
  if (role === "buyer") {
    return "Buyer";
  }
  return "Unassigned";
}

export function ExploreHero({ readyCount, role, totalCount }: ExploreHeroProps) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow">Knowledge</p>
        <h1 className="text-display text-foreground">Explore</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <ExploreMetricCard label="Indexed" value={readyCount} />
        <ExploreMetricCard label="Total" value={totalCount} />
        <ExploreMetricCard
          className="col-span-2 sm:col-span-1"
          label="Access"
          value={formatAccessLabel(role)}
        />
      </div>
    </header>
  );
}
