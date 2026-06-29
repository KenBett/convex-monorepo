import type { DocumentSummary } from "@repo/types";
import { useThemeColor } from "heroui-native";
import { BookOpen, FileText, Library } from "lucide-react-native";
import type { JSX } from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface CorpusPanelProps {
  documents: DocumentSummary[] | undefined;
  isLoading: boolean;
}

export function CorpusPanel({ documents, isLoading }: CorpusPanelProps): JSX.Element {
  const foregroundColor = useThemeColor("foreground");
  const mutedColor = useThemeColor("muted");
  const recentDocuments = (documents ?? []).slice(0, 6);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Library color={mutedColor} size={16} strokeWidth={1.75} />
        <Text className="text-section-title text-foreground">Corpus</Text>
      </View>

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={foregroundColor} />
        </View>
      ) : recentDocuments.length > 0 ? (
        <View className="gap-2">
          {recentDocuments.map((document) => (
            <DocumentRow document={document} key={document._id} />
          ))}
        </View>
      ) : (
        <View className="items-center gap-2 py-6">
          <View className="bg-surface size-9 items-center justify-center rounded-full shadow-elevated">
            <BookOpen color={mutedColor} size={16} strokeWidth={1.75} />
          </View>
          <Text className="text-sm font-semibold text-foreground">Empty</Text>
        </View>
      )}
    </View>
  );
}

function DocumentRow({ document }: { document: DocumentSummary }): JSX.Element {
  const mutedColor = useThemeColor("muted");

  return (
    <View className="bg-default flex-row items-start gap-3 rounded-card p-3">
      <View className="bg-surface size-8 items-center justify-center rounded-full shadow-elevated">
        <FileText color={mutedColor} size={14} strokeWidth={1.75} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {document.title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-caption capitalize text-muted">{document.status}</Text>
          <Text className="text-caption text-muted">·</Text>
          <Text className="text-caption capitalize text-muted">{document.sourceType}</Text>
        </View>
      </View>
    </View>
  );
}
