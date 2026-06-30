"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import type { ExploreMode } from "@/components/knowledge/types";
import { CommandDeck } from "@/components/knowledge/ui/command-deck";
import { CorpusPanel } from "@/components/knowledge/ui/corpus-panel";
import { ExploreHero } from "@/components/knowledge/ui/explore-hero";
import { ExploreStatusAlert } from "@/components/knowledge/ui/explore-status-alert";
import { getErrorMessage } from "@/components/knowledge/utils";
import { useVoiceCall } from "@/hooks/use-voice-assistant";

export function KnowledgeExplore() {
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
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof searchKnowledge>>["results"]
  >([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerSources, setAnswerSources] = useState<
    Awaited<ReturnType<typeof askKnowledge>>["sources"]
  >([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<string | null>(null);

  const corpusStats = useMemo(() => {
    const items = documents ?? [];
    return {
      readyCount: items.filter((doc) => doc.status === "ready").length,
      totalCount: items.length,
    };
  }, [documents]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      return;
    }
    setBusyState("search");
    setStatusMessage(null);
    try {
      const response = await searchKnowledge({ limit: 8, query });
      setHasSearched(true);
      setSearchResults(response.results);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Search failed"));
    } finally {
      setBusyState(null);
    }
  };

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt) {
      return;
    }
    setBusyState("ask");
    setStatusMessage(null);
    try {
      const response = await askKnowledge({ prompt });
      setAnswer(response.answer);
      setAnswerSources(response.sources);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Question failed"));
    } finally {
      setBusyState(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-4">
      <ExploreHero
        readyCount={corpusStats.readyCount}
        role={viewer?.role}
        totalCount={corpusStats.totalCount}
      />

      {statusMessage ? <ExploreStatusAlert message={statusMessage} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <CommandDeck
          answer={answer}
          answerSources={answerSources}
          busyState={busyState}
          hasSearched={hasSearched}
          mode={mode}
          onAsk={handleAsk}
          onModeChange={setMode}
          onQuestionChange={setQuestion}
          onSearch={handleSearch}
          onSearchQueryChange={setSearchQuery}
          question={question}
          searchQuery={searchQuery}
          searchResults={searchResults}
          voice={{
            error: voiceCall.error,
            finishRecordingTurn: () => void voiceCall.finishRecordingTurn(),
            isCallActive: voiceCall.isCallActive,
            onClearConversation: () => void voiceCall.clearConversation(),
            onEndCall: () => void voiceCall.endCall(),
            onStartCall: () => void voiceCall.startCall(),
            onStopSpeaking: voiceCall.stopSpeaking,
            phase: voiceCall.phase,
            turns: voiceCall.turns,
          }}
        />

        <CorpusPanel
          documents={documents}
          isLoading={documents === undefined}
        />
      </div>
    </div>
  );
}
