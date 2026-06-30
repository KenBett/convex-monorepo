import { api } from "@repo/backend/convex/_generated/api";
import type { ListingSearchResult } from "@repo/types";
import { useAction } from "convex/react";
import { Button, Input, Surface, TextField } from "heroui-native";
import type { JSX } from "react";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function ListingResultCard({ result }: { result: ListingSearchResult }): JSX.Element {
  return (
    <Surface className="gap-2 rounded-card border border-separator bg-surface p-card">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-section-title capitalize text-foreground">{result.crop}</Text>
          <Text className="text-caption text-muted">{result.cooperativeName}</Text>
        </View>
        <Text className="text-caption text-muted">
          {Math.round(result.score * 100)}% match
        </Text>
      </View>
      <Text className="text-emphasis text-foreground">
        {result.quantityKg} kg · KES {result.pricePerKg}/kg · {result.county}
      </Text>
      <Text className="text-caption text-muted" numberOfLines={2}>
        {result.description}
      </Text>
    </Surface>
  );
}

export function BuyerListingSearch(): JSX.Element {
  const semanticSearch = useAction(api.listings.search.semanticSearch);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (): Promise<void> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const response = await semanticSearch({ limit: 8, query: trimmedQuery });
      setHasSearched(true);
      setResults(response.results);
    } catch (searchError) {
      setError(getErrorMessage(searchError, "Search failed"));
    } finally {
      setIsSearching(false);
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <ScreenShell title="Buyer">
      <View className="gap-section">
        <View className="gap-2">
          <Text className="text-page-title text-foreground">Find produce</Text>
          <Text className="text-caption text-muted">
            Search listings by crop, county, quantity, or natural language.
          </Text>
        </View>

        <Surface className="gap-3 rounded-card bg-surface p-card">
          <TextField>
            <Input
              placeholder="e.g. 50kg potatoes in Nakuru"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                void handleSearch();
              }}
            />
          </TextField>

          <Button
            size="sm"
            isDisabled={isSearching || !hasQuery}
            onPress={() => {
              void handleSearch();
            }}
          >
            {isSearching ? "Searching…" : "Search listings"}
          </Button>

          {error ? <Text className="text-caption text-danger">{error}</Text> : null}

          {isSearching ? (
            <ActivityIndicator className="py-4" />
          ) : null}

          {hasSearched && results.length === 0 ? (
            <View className="items-center gap-2 py-6">
              <Text className="text-emphasis text-foreground">No matching listings</Text>
              <Text className="text-center text-caption text-muted">
                Try a different crop, county, or quantity.
              </Text>
            </View>
          ) : null}

          {results.length > 0 ? (
            <View className="gap-3">
              <Text className="text-section-title text-foreground">Matching listings</Text>
              {results.map((result) => (
                <ListingResultCard key={result.listingId} result={result} />
              ))}
            </View>
          ) : null}
        </Surface>
      </View>
    </ScreenShell>
  );
}
