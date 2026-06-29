import type { JSX } from "react";
import { Text, View } from "react-native";

interface ExploreMetricsProps {
  isAdmin: boolean;
  readyCount: number;
  totalCount: number;
}

export function ExploreMetrics({
  isAdmin,
  readyCount,
  totalCount,
}: ExploreMetricsProps): JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-3">
      <MetricCard label="Indexed" value={String(readyCount)} />
      <MetricCard label="Total" value={String(totalCount)} />
      <MetricCard label="Access" value={isAdmin ? "Admin" : "Member"} />
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View className="bg-default min-w-[30%] flex-1 gap-1 rounded-card p-3">
      <Text className="text-caption text-muted">{label}</Text>
      <Text className="text-emphasis text-foreground">{value}</Text>
    </View>
  );
}
