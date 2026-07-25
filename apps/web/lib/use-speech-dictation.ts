"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LANG = "en-KE";
/**
 * Wait this long after the last final speech chunk before auto-sending.
 * Short pauses between crop → location → grade must not submit early;
 * live browse can still update while the session keeps listening.
 */
const DEFAULT_SILENCE_MS = 3500;

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

export type SpeechDictationError =
  | "not-allowed"
  | "not-supported"
  | "audio-capture"
  | "network"
  | "unknown";

export type UseSpeechDictationOptions = {
  lang?: string;
  silenceMs?: number;
  /** Fired after a final result and ~silenceMs with no further speech. */
  onAutoSend?: (text: string) => void;
  /** Combined final + interim transcript for the composer. */
  onTranscriptChange?: (text: string) => void;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function mapRecognitionError(code: string): SpeechDictationError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    default:
      return "unknown";
  }
}

/**
 * Browser-native dictation via the Web Speech API.
 * Free streaming interim transcripts; silence after a final result triggers onAutoSend.
 */
export function useSpeechDictation(options: UseSpeechDictationOptions = {}) {
  const {
    lang = DEFAULT_LANG,
    silenceMs = DEFAULT_SILENCE_MS,
    onAutoSend,
    onTranscriptChange,
  } = options;

  const [supported] = useState(() => isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechDictationError | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sessionActiveRef = useRef(false);
  const pausedRef = useRef(false);
  const startingRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(lang);
  const silenceMsRef = useRef(silenceMs);
  const onAutoSendRef = useRef(onAutoSend);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const startRecognitionInstanceRef = useRef<() => void>(() => {});

  langRef.current = lang;
  silenceMsRef.current = silenceMs;
  onAutoSendRef.current = onAutoSend;
  onTranscriptChangeRef.current = onTranscriptChange;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const emitTranscript = useCallback(() => {
    const combined = [finalTranscriptRef.current, interimTranscriptRef.current]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    onTranscriptChangeRef.current?.(combined);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    clearSilenceTimer();
    onTranscriptChangeRef.current?.("");
  }, [clearSilenceTimer]);

  const scheduleAutoSend = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      const text = finalTranscriptRef.current.trim();

      if (!text || !sessionActiveRef.current || pausedRef.current) {
        return;
      }

      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      onTranscriptChangeRef.current?.("");
      onAutoSendRef.current?.(text);
    }, silenceMsRef.current);
  }, [clearSilenceTimer]);

  const stopRecognitionInstance = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    }

    recognitionRef.current = null;
    startingRef.current = false;
    setListening(false);
  }, []);

  const startRecognitionInstance = useCallback(() => {
    if (
      !sessionActiveRef.current ||
      pausedRef.current ||
      startingRef.current ||
      recognitionRef.current
    ) {
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setError("not-supported");
      sessionActiveRef.current = false;

      return;
    }

    startingRef.current = true;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;

    recognition.onresult = (event) => {
      let interim = "";
      let newlyFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";

        if (!piece) {
          continue;
        }

        if (result.isFinal) {
          newlyFinal += piece;
        } else {
          interim += piece;
        }
      }

      if (newlyFinal) {
        const nextFinal = `${finalTranscriptRef.current} ${newlyFinal}`.trim();

        finalTranscriptRef.current = nextFinal;
        interimTranscriptRef.current = "";
        emitTranscript();
        scheduleAutoSend();
      } else {
        interimTranscriptRef.current = interim;
        emitTranscript();
        clearSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;

      // Benign: no speech yet, or we aborted intentionally.
      if (code === "no-speech" || code === "aborted") {
        return;
      }

      setError(mapRecognitionError(code));

      if (code === "not-allowed" || code === "service-not-allowed") {
        sessionActiveRef.current = false;
        pausedRef.current = false;
        clearSilenceTimer();
        stopRecognitionInstance();
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      startingRef.current = false;
      setListening(false);

      if (sessionActiveRef.current && !pausedRef.current) {
        // Chrome ends recognition periodically; restart while the session is on.
        startRecognitionInstanceRef.current();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      // If en-KE fails, retry once with the browser default language.
      if (langRef.current !== "") {
        try {
          recognition.lang = "";
          recognition.start();
          setListening(true);
          setError(null);
        } catch {
          recognitionRef.current = null;
          startingRef.current = false;
          sessionActiveRef.current = false;
          setError("unknown");
          setListening(false);
        }
      } else {
        recognitionRef.current = null;
        startingRef.current = false;
        sessionActiveRef.current = false;
        setError("unknown");
        setListening(false);
      }
    } finally {
      startingRef.current = false;
    }
  }, [
    clearSilenceTimer,
    emitTranscript,
    scheduleAutoSend,
    stopRecognitionInstance,
  ]);

  startRecognitionInstanceRef.current = startRecognitionInstance;

  const start = useCallback(() => {
    if (!supported) {
      setError("not-supported");

      return;
    }

    sessionActiveRef.current = true;
    pausedRef.current = false;
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    clearSilenceTimer();
    setError(null);
    startRecognitionInstance();
  }, [clearSilenceTimer, startRecognitionInstance, supported]);

  const stop = useCallback(() => {
    sessionActiveRef.current = false;
    pausedRef.current = false;
    clearSilenceTimer();
    stopRecognitionInstance();
  }, [clearSilenceTimer, stopRecognitionInstance]);

  const pause = useCallback(() => {
    if (!sessionActiveRef.current) {
      return;
    }

    pausedRef.current = true;
    clearSilenceTimer();
    stopRecognitionInstance();
  }, [clearSilenceTimer, stopRecognitionInstance]);

  const resume = useCallback(() => {
    if (!sessionActiveRef.current || !pausedRef.current) {
      return;
    }

    pausedRef.current = false;
    startRecognitionInstance();
  }, [startRecognitionInstance]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      pausedRef.current = false;
      clearSilenceTimer();
      stopRecognitionInstance();
    };
  }, [clearSilenceTimer, stopRecognitionInstance]);

  return {
    supported,
    listening,
    error,
    clearError,
    start,
    stop,
    pause,
    resume,
    resetTranscript,
  };
}
