# Reduce UI Bloat — Reference

Before/after patterns from the Knowledge Explore refactor (`apps/web/components/knowledge/`).

## Copy trimming

### Page metadata

```tsx
// Before
export const metadata: Metadata = {
  title: "Knowledge",
  description: "Search and ask questions across your team's indexed library.",
};

// After
export const metadata: Metadata = {
  title: "Knowledge",
};
```

### Hero

```tsx
// Before — subtitle repeats the page
<h1>Explore your library</h1>
<p>Search indexed documents or ask questions in natural language.</p>

// After — metrics carry context
<p className="text-eyebrow">Knowledge</p>
<h1 className="text-display">Explore</h1>
<ExploreMetricCard label="Indexed" value={readyCount} />
```

### Empty states

```tsx
// Before
<div>
  <p>No documents yet</p>
  <p>Upload files or paste text to build your team's knowledge base.</p>
</div>

// After
<KnowledgeEmptyState icon={BookOpen} title="Empty" />
```

### Buttons

| Before | After |
|--------|-------|
| Search library | Search |
| Ask a question | Ask |
| Add to index | Index |
| Upload document | Upload |

## Container vs UI split

### Before (monolith)

One file with ~400 lines: hooks, handlers, hero JSX, search form, results list, corpus sidebar, admin forms, delete handlers.

### After (container ~210 lines)

```tsx
export function KnowledgeExplore() {
  // hooks + state + handlers only

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-4">
      <ExploreHero isAdmin={isAdmin} readyCount={...} totalCount={...} />
      {statusMessage ? <ExploreStatusAlert message={statusMessage} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <CommandDeck {...deckProps} />
        <CorpusPanel documents={documents} isLoading={documents === undefined} />
      </div>
      {isAdmin ? <AdminSection {...adminProps} /> : null}
    </div>
  );
}
```

## Custom markup → HeroUI

### Status banner

```tsx
// Before
<div className="rounded-lg bg-default p-3 text-sm">{message}</div>

// After
<Alert className="rounded-card shadow-sm dark:shadow-none" role="status">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title className="text-sm font-normal">{message}</Alert.Title>
  </Alert.Content>
</Alert>
```

### Document status

```tsx
// Before
<span className="rounded-full px-2 py-0.5 text-xs capitalize">{status}</span>

// After
<Chip className={clsx(STATUS_CLASS[status])} size="sm" variant="soft">
  <Chip.Label>{status}</Chip.Label>
</Chip>
```

### Search input

```tsx
// Before
<Input placeholder="Search..." startContent={<SearchIcon />} />

// After
<SearchField className="w-full">
  <SearchField.Group>
    <SearchField.SearchIcon />
    <SearchField.Input
      aria-label="Search query"
      placeholder="Search the library…"
      value={searchQuery}
      onChange={(e) => onSearchQueryChange(e.target.value)}
    />
  </SearchField.Group>
</SearchField>
```

### Mode switch

```tsx
// Before — two buttons or links toggling mode

// After
<Tabs selectedKey={mode} onSelectionChange={(key) => onModeChange(key as ExploreMode)}>
  <Tabs.ListContainer>
    <Tabs.List aria-label="Explore mode" className="rounded-full bg-default p-1">
      <Tabs.Tab id="search">…</Tabs.Tab>
      <Tabs.Tab id="ask">…</Tabs.Tab>
    </Tabs.List>
  </Tabs.ListContainer>
  <Tabs.Panel id="search">…</Tabs.Panel>
  <Tabs.Panel id="ask">…</Tabs.Panel>
</Tabs>
```

## UX guard: empty search results

Do not show "No results" before the user searches.

```tsx
const [hasSearched, setHasSearched] = useState(false);

const handleSearch = async (event: FormEvent) => {
  event.preventDefault();
  const response = await searchKnowledge({ query, limit: 8 });
  setHasSearched(true);
  setSearchResults(response.results);
};

// In CommandDeck
{hasSearched || searchResults.length > 0 ? (
  <KnowledgeResults emptyTitle="No results" results={searchResults} showRank />
) : null}
```

## File map (Knowledge Explore)

| File | Role |
|------|------|
| `knowledge-explore.tsx` | Container — data + handlers |
| `types.ts` | `ExploreMode` |
| `utils.ts` | `getErrorMessage` |
| `ui/explore-hero.tsx` | Title + metric cards |
| `ui/explore-metric-card.tsx` | Single stat tile |
| `ui/explore-status-alert.tsx` | Transient feedback |
| `ui/command-deck.tsx` | Tabs, search, ask, results |
| `ui/knowledge-results.tsx` | Result list + score chip |
| `ui/knowledge-empty-state.tsx` | Shared empty pattern |
| `ui/corpus-panel.tsx` | Sidebar document list |
| `ui/document-row.tsx` | Single corpus row |
| `ui/document-status-chip.tsx` | Status chip |
| `ui/admin-section.tsx` | Admin-only library management |
