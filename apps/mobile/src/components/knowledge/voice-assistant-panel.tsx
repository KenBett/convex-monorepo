import type { KnowledgeSearchResult } from "@repo/types";
import { Button, useThemeColor } from "heroui-native";
import { Mic, Square } from "lucide-react-native";
import type { JSX } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { KnowledgeResults } from "@/components/knowledge/knowledge-results";
import type {
  VoiceCallPhase,
  VoiceConversationTurn,
} from "@/hooks/use-voice-assistant";

type VoiceAssistantPanelProps = {
  error: string | null;
  finishRecordingTurn: () => void;
  isCallActive: boolean;
  onClearConversation: () => void;
  onEndCall: () => void;
  onStartCall: () => void;
  onStopSpeaking: () => void;
  phase: VoiceCallPhase;
  turns: VoiceConversationTurn[];
};

const PHASE_LABELS: Record<VoiceCallPhase, string> = {
  idle: "Start a voice call to talk with your knowledge base",
  recording: "Speak now, then tap stop to send",
  transcribing: "Transcribing…",
  thinking: "Searching the knowledge base…",
  speaking: "Speaking…",
};

export function VoiceAssistantPanel({
  error,
  finishRecordingTurn,
  isCallActive,
  onClearConversation,
  onEndCall,
  onStartCall,
  onStopSpeaking,
  phase,
  turns,
}: VoiceAssistantPanelProps): JSX.Element {
  const accentColor = useThemeColor("accent");
  const accentForegroundColor = useThemeColor("accent-foreground");

  const isRecording = phase === "recording";
  const isBusy = phase === "transcribing" || phase === "thinking" || phase === "speaking";

  const handleMicPress = (): void => {
    if (!isCallActive || isBusy) {
      return;
    }
    if (isRecording) {
      finishRecordingTurn();
    }
  };

  return (
    <View className="gap-4">
      <View className="items-center gap-3 py-2">
        {!isCallActive ? (
          <Button
            className="rounded-full font-semibold"
            onPress={onStartCall}
            size="sm"
            variant="primary"
          >
            Start voice call
          </Button>
        ) : (
          <>
            <Pressable
              accessibilityLabel={isRecording ? "Send voice message" : "Waiting to record"}
              accessibilityRole="button"
              className="min-h-touch min-w-touch items-center justify-center rounded-full"
              disabled={!isRecording}
              onPress={handleMicPress}
              style={{
                backgroundColor: isRecording ? accentColor : undefined,
                opacity: isBusy ? 0.5 : 1,
              }}
            >
              <View
                className="min-h-[72px] min-w-[72px] items-center justify-center rounded-full"
                style={isRecording ? undefined : { backgroundColor: accentColor }}
              >
                {isRecording ? (
                  <Square
                    color={accentForegroundColor}
                    fill={accentForegroundColor}
                    size={28}
                  />
                ) : (
                  <Mic color={accentForegroundColor} size={32} strokeWidth={1.75} />
                )}
              </View>
            </Pressable>

            <Button
              className="rounded-full font-semibold"
              onPress={onEndCall}
              size="sm"
              variant="secondary"
            >
              End call
            </Button>
          </>
        )}

        <Text className="text-caption text-center text-muted">{PHASE_LABELS[phase]}</Text>

        {phase === "speaking" ? (
          <Button
            className="rounded-full font-semibold"
            onPress={onStopSpeaking}
            size="sm"
            variant="secondary"
          >
            Stop speaking
          </Button>
        ) : null}

        {turns.length > 0 ? (
          <Button
            className="rounded-full font-semibold"
            isDisabled={isBusy || isRecording}
            onPress={onClearConversation}
            size="sm"
            variant="ghost"
          >
            Clear conversation
          </Button>
        ) : null}
      </View>

      {error ? (
        <View className="bg-default rounded-card px-3 py-3">
          <Text className="text-sm text-foreground">{error}</Text>
        </View>
      ) : null}

      {turns.length > 0 ? (
        <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
          <View className="gap-3">
            {turns.map((turn, index) => (
              <ConversationBubble key={`${turn.role}-${index}`} turn={turn} />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function ConversationBubble({
  turn,
}: {
  turn: VoiceConversationTurn;
}): JSX.Element {
  const isUser = turn.role === "user";

  return (
    <View className="gap-2">
      <View
        className={`rounded-card p-3 ${isUser ? "bg-accent self-end" : "bg-default self-start"}`}
      >
        <Text
          className={`text-caption mb-1 font-semibold uppercase tracking-wide ${isUser ? "text-accent-foreground" : "text-muted"}`}
        >
          {isUser ? "You" : "Assistant"}
        </Text>
        <Text
          className={`text-sm leading-6 ${isUser ? "text-accent-foreground" : "text-foreground"}`}
        >
          {turn.content}
        </Text>
      </View>
      {!isUser && turn.sources && turn.sources.length > 0 ? (
        <KnowledgeResults results={turn.sources} title="Sources" />
      ) : null}
    </View>
  );
}
