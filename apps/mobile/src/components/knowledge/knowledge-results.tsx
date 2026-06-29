import type { KnowledgeSearchResult } from "@repo/types";
import { useThemeColor } from "heroui-native";
import { Search } from "lucide-react-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

interface KnowledgeResultsProps {
  emptyTitle?: string;
  results: KnowledgeSearchResult[];
  showRank?: boolean;
  title?: string;
}

export function KnowledgeResults({
  emptyTitle,
  results,
  showRank = false,
  title = "Results",
}: KnowledgeResultsProps): JSX.Element | null {
  const mutedColor = useThemeColor("muted");

  if (results.length === 0) {
    if (!emptyTitle) {
      return null;
    }

    return (
      <View className="items-center gap-2 py-6">
        <View className="bg-surface size-9 items-center justify-center rounded-full shadow-elevated">
          <Search color={mutedColor} size={16} strokeWidth={1.75} />
        </View>
        <Text className="text-sm font-semibold text-foreground">{emptyTitle}</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-caption font-semibold uppercase tracking-wide text-muted">
        {title}
      </Text>
      {results.map((result, index) => (
        <View
          className="bg-default gap-2 rounded-card p-3"
          key={`${result.entryId}:${result.score}:${result.text.slice(0, 12)}`}
        >
          <View className="flex-row items-start gap-3">
            {showRank ? (
              <Text className="text-caption w-6 pt-0.5 text-muted">
                {String(index + 1).padStart(2, "0")}
              </Text>
            ) : null}
            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="min-w-0 flex-1 text-sm font-semibold text-foreground"
                  numberOfLines={2}
                >
                  {result.title ?? "Untitled"}
                </Text>
                <Text className="text-xs text-muted">{Math.round(result.score * 100)}%</Text>
              </View>
              <ScoreMeter score={result.score} />
              <Text className="text-caption text-muted" numberOfLines={6}>
                {result.text}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function ScoreMeter({ score }: { score: number }): JSX.Element {
  const accentColor = useThemeColor("accent");
  const widthPercent = Math.max(8, Math.round(score * 100));

  return (
    <View className="bg-default h-1 overflow-hidden rounded-full">
      <View
        className="h-full rounded-full"
        style={{ backgroundColor: accentColor, width: `${widthPercent}%` }}
      />
    </View>
  );
}
