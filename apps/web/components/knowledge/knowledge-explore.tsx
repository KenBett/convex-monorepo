"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { DocumentSummary } from "@repo/types";
import { useAction, useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { extractPdfText } from "@/components/knowledge/pdf-text-extractor";
import type { ExploreMode } from "@/components/knowledge/types";
import { AdminSection } from "@/components/knowledge/ui/admin-section";
import { CommandDeck } from "@/components/knowledge/ui/command-deck";
import { CorpusPanel } from "@/components/knowledge/ui/corpus-panel";
import { ExploreHero } from "@/components/knowledge/ui/explore-hero";
import { ExploreStatusAlert } from "@/components/knowledge/ui/explore-status-alert";
import { getErrorMessage } from "@/components/knowledge/utils";
import { useVoiceCall } from "@/hooks/use-voice-assistant";

const MIN_INDEXABLE_TEXT_LENGTH = 20;

export function KnowledgeExplore() {
  const viewer = useQuery(api.users.viewer);
  const documents = useQuery(api.knowledge.listDocuments);
  const searchKnowledge = useAction(api.knowledge.search);
  const askKnowledge = useAction(api.knowledge.ask);
  const askWithHistory = useAction(api.knowledge.askWithHistory);
  const transcribeSpeech = useAction(api.knowledgeSpeech.transcribeSpeech);
  const synthesizeSpeech = useAction(api.knowledgeSpeech.synthesizeSpeech);
  const addTextDocument = useAction(api.knowledge.addTextDocument);
  const addFileDocument = useAction(api.knowledge.addFileDocument);
  const deleteDocument = useMutation(api.knowledge.deleteDocument);

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
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<string | null>(null);

  const isAdmin = viewer?.role === "admin";
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

  const handleAddText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = textTitle.trim();
    const text = textBody.trim();
    if (!title || text.length < MIN_INDEXABLE_TEXT_LENGTH) {
      setStatusMessage(
        `Text must be at least ${MIN_INDEXABLE_TEXT_LENGTH} characters.`,
      );
      return;
    }
    setBusyState("text");
    setStatusMessage(null);
    try {
      await addTextDocument({ text, title });
      setTextTitle("");
      setTextBody("");
      setStatusMessage("Indexed.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Upload failed"));
    } finally {
      setBusyState(null);
    }
  };

  const handleAddFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    setBusyState("file");
    setStatusMessage(null);
    try {
      const text =
        selectedFile.type === "application/pdf" ||
        selectedFile.name.toLowerCase().endsWith(".pdf")
          ? await extractPdfText(selectedFile)
          : await selectedFile.text();
      const trimmedText = text.trim();
      if (trimmedText.length < MIN_INDEXABLE_TEXT_LENGTH) {
        setStatusMessage("No extractable text found in this file.");
        return;
      }
      const title = fileTitle.trim() || selectedFile.name;
      await addFileDocument({
        filename: selectedFile.name,
        text: trimmedText,
        title,
      });
      setFileTitle("");
      setSelectedFile(null);
      setStatusMessage("Indexed.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Upload failed"));
    } finally {
      setBusyState(null);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleDelete = async (document: DocumentSummary) => {
    setBusyState(`delete:${document._id}`);
    setStatusMessage(null);
    try {
      await deleteDocument({ documentId: document._id as Id<"documents"> });
      setStatusMessage(`Deleted ${document.title}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Delete failed"));
    } finally {
      setBusyState(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-4">
      <ExploreHero
        isAdmin={isAdmin}
        readyCount={corpusStats.readyCount}
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

      {isAdmin ? (
        <AdminSection
          busyState={busyState}
          documents={documents}
          fileTitle={fileTitle}
          onAddFile={handleAddFile}
          onAddText={handleAddText}
          onDelete={(document) => void handleDelete(document)}
          onFileChange={handleFileChange}
          onFileTitleChange={setFileTitle}
          onTextBodyChange={setTextBody}
          onTextTitleChange={setTextTitle}
          selectedFile={selectedFile}
          textBody={textBody}
          textTitle={textTitle}
        />
      ) : null}
    </div>
  );
}
