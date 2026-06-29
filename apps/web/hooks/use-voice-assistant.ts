"use client";

import type { KnowledgeSearchResult } from "@repo/types";
import type { VoiceStreamClient } from "@repo/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "@/components/knowledge/utils";
import {
  enqueueSpeechChunk,
  finalizeSpeechQueue,
  stopOpenAiSpeech,
  waitForSpeechQueueDrain,
} from "@/lib/play-openai-speech";
import {
  blobToRecordingPayload,
  getSupportedRecordingMimeType,
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  const stopMediaCapture = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch { /* already stopped */ }
    }
    mediaRecorderRef.current = null;
    for (const track of mediaStreamRef.current?.getTracks() ?? []) track.stop();
    mediaStreamRef.current = null;
    chunksRef.current = [];
  }, []);

  const stopSpeaking = useCallback(() => {
    void stopOpenAiSpeech();
    if (phaseRef.current === "speaking") setPhase("idle");
  }, []);

  const beginRecording = useCallback(async () => {
    if (
      phaseRef.current === "recording" ||
      phaseRef.current === "transcribing" ||
      phaseRef.current === "thinking" ||
      phaseRef.current === "speaking"
    ) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      return;
    }

    const mimeType = getSupportedRecordingMimeType();
    if (!mimeType) {
      setError("This browser does not support voice recording.");
      return;
    }

    setError(null);
    void stopOpenAiSpeech();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      // 250ms timeslice micro-buffers reduce post-stop assembly time.
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(250);
      setPhase("recording");
    } catch (permissionError) {
      setError(
        getErrorMessage(permissionError, "Microphone permission is required for voice calls."),
      );
    }
  }, []);

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

      // Pending assistant turn we'll fill in incrementally.
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

        // Wait for all queued audio to finish before resuming the mic.
        await waitForSpeechQueueDrain();

        if (phaseRef.current === "speaking") setPhase("idle");
        await resumeListeningIfCallActive();
      } catch (turnError) {
        setError(getErrorMessage(turnError, "Voice turn failed"));
        setPhase("idle");
      }

      // Keep compiler happy: these are used inside callbacks.
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
    stopMediaCapture();
    void stopOpenAiSpeech();
    setPhase("idle");
  }, [stopMediaCapture]);

  const finishRecordingTurn = useCallback(async () => {
    if (phaseRef.current !== "recording" || !mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const recorded = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          resolve(recorded);
        };
        recorder.onerror = () => reject(new Error("Recording failed"));
        recorder.stop();
      });

      for (const track of mediaStreamRef.current?.getTracks() ?? []) track.stop();
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];

      if (blob.size === 0) throw new Error("Recording was empty");

      const recordingPayload = await blobToRecordingPayload(blob);
      await runTurnRef.current(recordingPayload);
    } catch (recordingError) {
      stopMediaCapture();
      setError(getErrorMessage(recordingError, "Recording failed"));
      setPhase("idle");
    }
  }, [stopMediaCapture]);

  const clearConversation = useCallback(async () => {
    stopMediaCapture();
    void stopOpenAiSpeech();
    setTurns([]);
    turnsRef.current = [];
    setError(null);
    setPhase("idle");
    setIsCallActive(false);
    isCallActiveRef.current = false;
  }, [stopMediaCapture]);

  useEffect(() => {
    return () => {
      stopMediaCapture();
      void stopOpenAiSpeech();
    };
  }, [stopMediaCapture]);

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
