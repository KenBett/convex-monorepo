"use client";

import { Button } from "@heroui/react";
import { Mic, Square } from "lucide-react";

import { KnowledgeResults } from "@/components/knowledge/ui/knowledge-results";
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
}: VoiceAssistantPanelProps) {
  const isRecording = phase === "recording";
  const isBusy =
    phase === "transcribing" || phase === "thinking" || phase === "speaking";

  const handleMicPress = (): void => {
    if (!isCallActive || isBusy || !isRecording) {
      return;
    }
    finishRecordingTurn();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 py-2">
        {!isCallActive ? (
          <Button
            className="rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
            onPress={onStartCall}
            size="sm"
            variant="primary"
          >
            Start voice call
          </Button>
        ) : (
          <>
            <button
              aria-label={isRecording ? "Send voice message" : "Waiting to record"}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:cursor-not-allowed"
              disabled={!isRecording}
              onClick={handleMicPress}
              style={{ opacity: isBusy ? 0.5 : 1 }}
              type="button"
            >
              <span
                className={`flex h-18 w-18 items-center justify-center rounded-full ${
                  isRecording ? "bg-accent" : "bg-accent/80"
                }`}
              >
                {isRecording ? (
                  <Square
                    className="h-7 w-7 fill-accent-foreground text-accent-foreground"
                    strokeWidth={1.75}
                  />
                ) : (
                  <Mic
                    className="h-8 w-8 text-accent-foreground"
                    strokeWidth={1.75}
                  />
                )}
              </span>
            </button>

            <Button
              className="rounded-full font-medium"
              onPress={onEndCall}
              size="sm"
              variant="secondary"
            >
              End call
            </Button>
          </>
        )}

        <p className="text-center text-sm text-muted">{PHASE_LABELS[phase]}</p>

        {phase === "speaking" ? (
          <Button
            className="rounded-full font-medium"
            onPress={onStopSpeaking}
            size="sm"
            variant="secondary"
          >
            Stop speaking
          </Button>
        ) : null}

        {turns.length > 0 ? (
          <Button
            className="rounded-full font-medium"
            isDisabled={isBusy || isRecording}
            onPress={onClearConversation}
            size="sm"
            variant="ghost"
          >
            Clear conversation
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-card border border-separator bg-default/60 px-4 py-3">
          <p className="text-sm text-foreground">{error}</p>
        </div>
      ) : null}

      {turns.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          <div className="flex flex-col gap-3">
            {turns.map((turn, index) => (
              <ConversationBubble key={`${turn.role}-${index}`} turn={turn} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConversationBubble({ turn }: { turn: VoiceConversationTurn }) {
  const isUser = turn.role === "user";

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded-card p-3 ${
          isUser
            ? "ml-auto max-w-[85%] bg-accent text-accent-foreground"
            : "mr-auto max-w-[85%] bg-default/60 text-foreground"
        }`}
      >
        <p
          className={`mb-1 text-eyebrow ${
            isUser ? "text-accent-foreground/80" : "text-muted"
          }`}
        >
          {isUser ? "You" : "Assistant"}
        </p>
        <p className="text-sm leading-6">{turn.content}</p>
      </div>
      {!isUser && turn.sources && turn.sources.length > 0 ? (
        <KnowledgeResults results={turn.sources} title="Sources" />
      ) : null}
    </div>
  );
}
