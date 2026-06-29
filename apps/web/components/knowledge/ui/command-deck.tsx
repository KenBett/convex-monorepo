import type { KnowledgeSearchResult } from "@repo/types";
import {
  Button,
  Card,
  SearchField,
  Tabs,
  TextArea,
} from "@heroui/react";
import { MessageSquareQuote, Mic, Search, Sparkles } from "lucide-react";
import type { FormEvent, Key } from "react";

import type { ExploreMode } from "@/components/knowledge/types";
import { KnowledgeResults } from "@/components/knowledge/ui/knowledge-results";
import { VoiceAssistantPanel } from "@/components/knowledge/ui/voice-assistant-panel";
import type {
  VoiceCallPhase,
  VoiceConversationTurn,
} from "@/hooks/use-voice-assistant";

interface CommandDeckProps {
  answer: string;
  answerSources: KnowledgeSearchResult[];
  busyState: string | null;
  hasSearched: boolean;
  mode: ExploreMode;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: ExploreMode) => void;
  onQuestionChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSearchQueryChange: (value: string) => void;
  question: string;
  searchQuery: string;
  searchResults: KnowledgeSearchResult[];
  voice: {
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
}

export function CommandDeck({
  answer,
  answerSources,
  busyState,
  hasSearched,
  mode,
  onAsk,
  onModeChange,
  onQuestionChange,
  onSearch,
  onSearchQueryChange,
  question,
  searchQuery,
  searchResults,
  voice,
}: CommandDeckProps) {
  const isSearchBusy = busyState === "search";
  const isAskBusy = busyState === "ask";
  const hasSearchInput = searchQuery.trim().length > 0;
  const hasAskInput = question.trim().length > 0;
  const hasAskOutput = answer.length > 0 || answerSources.length > 0;

  return (
    <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
      <Card.Content className="px-5 py-5 sm:px-6">
        <Tabs
          className="w-full"
          onSelectionChange={(key: Key) => onModeChange(key as ExploreMode)}
          selectedKey={mode}
        >
          <Tabs.ListContainer>
            <Tabs.List
              aria-label="Explore mode"
              className="w-full gap-1 rounded-full bg-default p-1 sm:w-fit"
            >
              <Tabs.Tab className="flex-1 sm:flex-initial" id="search">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Search
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab className="flex-1 sm:flex-initial" id="ask">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Ask
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab className="flex-1 sm:flex-initial" id="voice">
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Voice
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="pt-5" id="search">
            <form className="flex flex-col gap-3" onSubmit={onSearch}>
              <SearchField className="w-full">
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    aria-label="Search query"
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    placeholder="Search the library…"
                    value={searchQuery}
                  />
                </SearchField.Group>
              </SearchField>
              <Button
                className="w-fit rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
                isDisabled={isSearchBusy || !hasSearchInput}
                size="sm"
                type="submit"
                variant="primary"
              >
                {isSearchBusy ? "Searching…" : "Search"}
              </Button>
            </form>
            <div className="mt-5">
              {hasSearched || searchResults.length > 0 ? (
                <KnowledgeResults
                  emptyTitle="No results"
                  results={searchResults}
                  showRank
                />
              ) : null}
            </div>
          </Tabs.Panel>

          <Tabs.Panel className="pt-5" id="ask">
            <form className="flex flex-col gap-3" onSubmit={onAsk}>
              <TextArea
                aria-label="Question"
                fullWidth
                onChange={(event) => onQuestionChange(event.target.value)}
                placeholder="Ask a question…"
                value={question}
                variant="secondary"
              />
              <Button
                className="w-fit rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
                isDisabled={isAskBusy || !hasAskInput}
                size="sm"
                type="submit"
                variant="primary"
              >
                {isAskBusy ? "Thinking…" : "Ask"}
              </Button>
            </form>
            {hasAskOutput ? (
              <div className="motion-safe-fade-in mt-5 flex flex-col gap-4">
                {answer && answerSources.length === 0 ? (
                  <p className="rounded-card border border-separator bg-default/60 px-4 py-3 text-sm text-muted">
                    No matching sources found in the knowledge base.
                  </p>
                ) : null}
                {answer ? (
                  <div className="rounded-card bg-default/60 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquareQuote
                        className="h-3.5 w-3.5 text-muted"
                        strokeWidth={1.75}
                      />
                      <p className="text-eyebrow">Answer</p>
                    </div>
                    <p className="text-sm leading-7 text-foreground">{answer}</p>
                  </div>
                ) : null}
                <KnowledgeResults results={answerSources} title="Sources" />
              </div>
            ) : null}
          </Tabs.Panel>

          <Tabs.Panel className="pt-5" id="voice">
            <VoiceAssistantPanel
              error={voice.error}
              finishRecordingTurn={voice.finishRecordingTurn}
              isCallActive={voice.isCallActive}
              onClearConversation={voice.onClearConversation}
              onEndCall={voice.onEndCall}
              onStartCall={voice.onStartCall}
              onStopSpeaking={voice.onStopSpeaking}
              phase={voice.phase}
              turns={voice.turns}
            />
          </Tabs.Panel>
        </Tabs>
      </Card.Content>
    </Card>
  );
}
