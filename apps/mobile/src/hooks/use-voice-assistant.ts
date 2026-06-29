import type { KnowledgeSearchResult } from "@repo/types";
import type { VoiceStreamClient } from "@repo/utils";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "@/components/knowledge/utils";
import {
  enqueueSpeechChunk,
  finalizeSpeechQueue,
  stopOpenAiSpeech,
  waitForSpeechQueueDrain,
} from "@/lib/play-openai-speech";
import {
  readRecordingPayload,
  stopAndResolveRecordingUri,
  voiceRecordingOptions,
} from "@/lib/voice-recording";

export type VoiceCallPhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

export type VoiceConversationTurn = {
  content: string;
  role: "assistant" | "user";
  sources?: KnowledgeSearchResult[];
};

type ChatTurn = {
  content: string;
  role: "assistant" | "user";
};

type UseVoiceCallOptions = {
  voiceClient: VoiceStreamClient;
};

export function useVoiceCall({ voiceClient }: UseVoiceCallOptions) {
  const audioRecorder = useAudioRecorder(voiceRecordingOptions);

  const [phase, setPhase] = useState<VoiceCallPhase>("idle");
  const [isCallActive, setIsCallActive] = useState(false);
  const [turns, setTurns] = useState<VoiceConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const phaseRef = useRef(phase);
  const isCallActiveRef = useRef(isCallActive);
  const turnsRef = useRef(turns);
  const runTurnRef = useRef<(payload: {
    audioBase64: string;
    filename: string;
    mimeType: string;
  }) => Promise<void>>(async () => {});
  const isPreparingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  const stopSpeaking = useCallback(() => {
    void stopOpenAiSpeech();
    if (phaseRef.current === "speaking") setPhase("idle");
  }, []);

  const beginRecording = useCallback(async () => {
    if (
      isPreparingRef.current ||
      phaseRef.current === "recording" ||
      phaseRef.current === "transcribing" ||
      phaseRef.current === "thinking" ||
      phaseRef.current === "speaking"
    ) return;

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setError("Microphone permission is required for voice calls.");
      return;
    }

    isPreparingRef.current = true;

    try {
      setError(null);
      void stopOpenAiSpeech();

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingStartedAtRef.current = Date.now();
      setPhase("recording");
    } finally {
      isPreparingRef.current = false;
    }
  }, [audioRecorder]);

  const resumeListeningIfCallActive = useCallback(async () => {
    if (!isCallActiveRef.current) return;
    await beginRecording();
  }, [beginRecording]);

  const processTurn = useCallback(
    async (payload: { audioBase64: string; filename: string; mimeType: string }) => {
      setPhase("transcribing");
      setError(null);

      const history: ChatTurn[] = turnsRef.current.map((t) => ({
        content: t.content,
        role: t.role,
      }));

      let assistantText = "";
      let assistantSources: KnowledgeSearchResult[] = [];

      try {
        await voiceClient.streamTurn(
          {
            audioBase64: payload.audioBase64,
            filename: payload.filename,
            history,
            mimeType: payload.mimeType,
          },
          {
            onStt(text) {
              setTurns((prev) => [...prev, { content: text, role: "user" }]);
              setPhase("thinking");
            },
            onSources(sources) {
              assistantSources = sources;
            },
            onLlmDelta(text) {
              assistantText += text;
            },
            onTtsChunk(audioBase64, index) {
              if (phaseRef.current === "thinking") setPhase("speaking");
              void enqueueSpeechChunk(audioBase64, index);
            },
            onDone(answer, sources) {
              assistantText = answer;
              assistantSources = sources;
              finalizeSpeechQueue();
              setTurns((prev) => [
                ...prev,
                { content: answer, role: "assistant", sources },
              ]);
            },
            onError(message) {
              setError(message);
              setPhase("idle");
            },
          },
        );

        await waitForSpeechQueueDrain();

        if (phaseRef.current === "speaking") setPhase("idle");
        await resumeListeningIfCallActive();
      } catch (turnError) {
        setError(getErrorMessage(turnError, "Voice turn failed"));
        setPhase("idle");
      }

      void assistantText;
      void assistantSources;
    },
    [voiceClient, resumeListeningIfCallActive],
  );

  useEffect(() => { runTurnRef.current = processTurn; }, [processTurn]);

  const startCall = useCallback(async () => {
    setIsCallActive(true);
    isCallActiveRef.current = true;
    setTurns([]);
    turnsRef.current = [];
    setError(null);
    await beginRecording();
  }, [beginRecording]);

  const endCall = useCallback(async () => {
    setIsCallActive(false);
    isCallActiveRef.current = false;

    if (audioRecorder.isRecording) {
      try { await audioRecorder.stop(); } catch { /* already stopped */ }
    }

    void stopOpenAiSpeech();
    setPhase("idle");
  }, [audioRecorder]);

  const finishRecordingTurn = useCallback(async () => {
    if (phaseRef.current !== "recording" || !audioRecorder.isRecording) return;

    try {
      const uri = await stopAndResolveRecordingUri(
        audioRecorder,
        recordingStartedAtRef.current,
      );
      const payload = await readRecordingPayload(uri);
      await runTurnRef.current(payload);
    } catch (recordingError) {
      setError(getErrorMessage(recordingError, "Recording failed"));
      setPhase("idle");
    }
  }, [audioRecorder]);

  const clearConversation = useCallback(async () => {
    if (audioRecorder.isRecording) {
      try { await audioRecorder.stop(); } catch { /* already stopped */ }
    }

    void stopOpenAiSpeech();
    setTurns([]);
    turnsRef.current = [];
    setError(null);
    setPhase("idle");
    setIsCallActive(false);
    isCallActiveRef.current = false;
  }, [audioRecorder]);

  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) void audioRecorder.stop();
      void stopOpenAiSpeech();
    };
  }, [audioRecorder]);

  return {
    clearConversation,
    endCall,
    error,
    finishRecordingTurn,
    isCallActive,
    phase,
    startCall,
    stopSpeaking,
    turns,
  };
}
