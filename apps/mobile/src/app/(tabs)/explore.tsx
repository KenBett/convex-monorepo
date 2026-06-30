import { api } from "@repo/backend/convex/_generated/api";
import type { KnowledgeSearchResult } from "@repo/types";
import { useAction, useQuery } from "convex/react";
import { Button, Surface, useThemeColor } from "heroui-native";
import { MessageSquareQuote, Mic, Search, Sparkles } from "lucide-react-native";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CorpusPanel } from "@/components/knowledge/corpus-panel";
import { ExploreMetrics } from "@/components/knowledge/explore-metrics";
import { KnowledgeResults } from "@/components/knowledge/knowledge-results";
import { VoiceAssistantPanel } from "@/components/knowledge/voice-assistant-panel";
import { getErrorMessage } from "@/components/knowledge/utils";
import { ScreenShell } from "@/components/screen-shell";
import { useVoiceCall } from "@/hooks/use-voice-assistant";

type ExploreMode = "search" | "ask" | "voice";

export default function ExploreScreen(): JSX.Element {
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const accentForegroundColor = useThemeColor("accent-foreground");

  const viewer = useQuery(api.users.viewer);
  const documents = useQuery(api.knowledge.listDocuments);
  const searchKnowledge = useAction(api.knowledge.search);
  const askKnowledge = useAction(api.knowledge.ask);
  const askWithHistory = useAction(api.knowledge.askWithHistory);
  const transcribeSpeech = useAction(api.knowledgeSpeech.transcribeSpeech);
  const synthesizeSpeech = useAction(api.knowledgeSpeech.synthesizeSpeech);

  const voiceCall = useVoiceCall({
    askWithHistory,
    synthesizeSpeech,
    transcribeSpeech,
  });

  const [mode, setMode] = useState<ExploreMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerSources, setAnswerSources] = useState<KnowledgeSearchResult[]>([]);
  const [busyState, setBusyState] = useState<"search" | "ask" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const corpusStats = useMemo(() => {
    const items = documents ?? [];
    return {
      readyCount: items.filter((doc) => doc.status === "ready").length,
      totalCount: items.length,
    };
  }, [documents]);

  const hasSearchInput = searchQuery.trim().length > 0;
  const hasAskInput = question.trim().length > 0;
  const hasAskOutput = answer.length > 0 || answerSources.length > 0;

  const handleSearch = async (): Promise<void> => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }
    setBusyState("search");
    setError(null);
    try {
      const response = await searchKnowledge({ limit: 8, query });
      setHasSearched(true);
      setSearchResults(response.results);
    } catch (searchError) {
      setError(getErrorMessage(searchError, "Search failed"));
    } finally {
      setBusyState(null);
    }
  };

  const handleAsk = async (): Promise<void> => {
    const prompt = question.trim();
    if (!prompt) {
      return;
    }
    setBusyState("ask");
    setError(null);
    try {
      const response = await askKnowledge({ prompt });
      setAnswer(response.answer);
      setAnswerSources(response.sources);
    } catch (askError) {
      setError(getErrorMessage(askError, "Question failed"));
    } finally {
      setBusyState(null);
    }
  };

  return (
    <ScreenShell title="Explore">
      <View className="gap-1">
        <Text className="text-caption font-semibold uppercase tracking-wide text-muted">
          Knowledge
        </Text>
        <Text className="text-page-title text-foreground">Explore</Text>
        <Text className="text-caption text-muted">
          Search, ask, or start a voice call with the shared corpus.
        </Text>
      </View>

      <ExploreMetrics
        readyCount={corpusStats.readyCount}
        role={viewer?.role}
        totalCount={corpusStats.totalCount}
      />

      {error ? (
        <Surface variant="default" className="rounded-card p-card shadow-elevated">
          <Text className="text-sm text-foreground">{error}</Text>
        </Surface>
      ) : null}

      <Surface variant="default" className="gap-4 rounded-card p-card shadow-elevated">
        <View className="bg-default flex-row gap-1 rounded-full p-1">
          <ModeTab
            accentColor={accentColor}
            accentForegroundColor={accentForegroundColor}
            icon={Search}
            isActive={mode === "search"}
            label="Search"
            mutedColor={mutedColor}
            onPress={() => setMode("search")}
          />
          <ModeTab
            accentColor={accentColor}
            accentForegroundColor={accentForegroundColor}
            icon={Sparkles}
            isActive={mode === "ask"}
            label="Ask"
            mutedColor={mutedColor}
            onPress={() => setMode("ask")}
          />
          <ModeTab
            accentColor={accentColor}
            accentForegroundColor={accentForegroundColor}
            icon={Mic}
            isActive={mode === "voice"}
            label="Voice"
            mutedColor={mutedColor}
            onPress={() => setMode("voice")}
          />
        </View>

        {mode === "search" ? (
          <View className="gap-3">
            <TextInput
              className="field-inset min-h-touch rounded-control px-3 py-2 text-sm text-foreground"
              onChangeText={setSearchQuery}
              placeholder="Search the library…"
              placeholderTextColor={mutedColor}
              returnKeyType="search"
              value={searchQuery}
              onSubmitEditing={() => void handleSearch()}
            />
            <Button
              className="self-start rounded-full font-semibold"
              isDisabled={busyState === "search" || !hasSearchInput}
              onPress={() => void handleSearch()}
              size="sm"
              variant="primary"
            >
              {busyState === "search" ? "Searching…" : "Search"}
            </Button>
            {hasSearched || searchResults.length > 0 ? (
              <KnowledgeResults
                emptyTitle="No results"
                results={searchResults}
                showRank
              />
            ) : null}
          </View>
        ) : mode === "ask" ? (
          <View className="gap-3">
            <TextInput
              className="field-inset min-h-28 rounded-control px-3 py-2 text-sm text-foreground"
              multiline
              onChangeText={setQuestion}
              placeholder="Ask a question…"
              placeholderTextColor={mutedColor}
              textAlignVertical="top"
              value={question}
            />
            <Button
              className="self-start rounded-full font-semibold"
              isDisabled={busyState === "ask" || !hasAskInput}
              onPress={() => void handleAsk()}
              size="sm"
              variant="primary"
            >
              {busyState === "ask" ? "Thinking…" : "Ask"}
            </Button>
            {hasAskOutput ? (
              <View className="gap-4">
                {answer && answerSources.length === 0 ? (
                  <Text className="text-caption rounded-card border border-separator bg-default px-3 py-3 text-muted">
                    No matching sources found in the knowledge base.
                  </Text>
                ) : null}
                {answer ? (
                  <View className="bg-default gap-2 rounded-card p-3">
                    <View className="flex-row items-center gap-2">
                      <MessageSquareQuote color={mutedColor} size={14} strokeWidth={1.75} />
                      <Text className="text-caption font-semibold uppercase tracking-wide text-muted">
                        Answer
                      </Text>
                    </View>
                    <Text className="text-sm leading-6 text-foreground">{answer}</Text>
                  </View>
                ) : null}
                <KnowledgeResults results={answerSources} title="Sources" />
              </View>
            ) : null}
          </View>
        ) : (
          <VoiceAssistantPanel
            error={voiceCall.error}
            finishRecordingTurn={() => void voiceCall.finishRecordingTurn()}
            isCallActive={voiceCall.isCallActive}
            onClearConversation={() => void voiceCall.clearConversation()}
            onEndCall={() => void voiceCall.endCall()}
            onStartCall={() => void voiceCall.startCall()}
            onStopSpeaking={voiceCall.stopSpeaking}
            phase={voiceCall.phase}
            turns={voiceCall.turns}
          />
        )}
      </Surface>

      <Surface variant="default" className="rounded-card p-card shadow-elevated">
        <CorpusPanel documents={documents} isLoading={documents === undefined} />
      </Surface>
    </ScreenShell>
  );
}

function ModeTab({
  accentColor,
  accentForegroundColor,
  icon: Icon,
  isActive,
  label,
  mutedColor,
  onPress,
}: {
  accentColor: string;
  accentForegroundColor: string;
  icon: typeof Search;
  isActive: boolean;
  label: string;
  mutedColor: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      className="min-h-touch flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-3 py-2"
      onPress={onPress}
      style={isActive ? { backgroundColor: accentColor } : undefined}
    >
      <Icon
        color={isActive ? accentForegroundColor : mutedColor}
        size={14}
        strokeWidth={1.75}
      />
      <Text
        className="text-sm font-semibold"
        style={{ color: isActive ? accentForegroundColor : mutedColor }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
