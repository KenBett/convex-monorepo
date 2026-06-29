import { ExploreMetricCard } from "@/components/knowledge/ui/explore-metric-card";

interface ExploreHeroProps {
  isAdmin: boolean;
  readyCount: number;
  totalCount: number;
}

export function ExploreHero({
  isAdmin,
  readyCount,
  totalCount,
}: ExploreHeroProps) {
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
          value={isAdmin ? "Admin" : "Member"}
        />
      </div>
    </header>
  );
}
