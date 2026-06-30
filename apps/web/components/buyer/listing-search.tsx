"use client";

import type { ListingSearchResult } from "@repo/types";
import type { FormEvent } from "react";

import { api } from "@repo/backend/convex/_generated/api";
import {
  getBuyerListingDescription,
  getBuyerListingSnippet,
} from "@repo/types";
import { useAction } from "convex/react";
import { Button, Card, Chip, SearchField } from "@heroui/react";
import { Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { OrderCheckoutDialog } from "@/components/buyer/order-checkout-dialog";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function ListingResultCard({
  onOrder,
  result,
}: {
  onOrder: (result: ListingSearchResult) => void;
  result: ListingSearchResult;
}) {
  const description = getBuyerListingDescription(result.description);
  const snippet = getBuyerListingSnippet(result.snippet, description);

  return (
    <article className="flex flex-col gap-3 rounded-[0.875rem] border border-separator bg-default/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold capitalize text-foreground">
            {result.crop}
          </h3>
          <p className="text-sm text-muted">{result.cooperativeName}</p>
        </div>
        <Chip size="sm" variant="secondary">
          <Chip.Label>{Math.round(result.score * 100)}% match</Chip.Label>
        </Chip>
      </div>

      <p className="text-sm text-foreground">
        {result.quantityKg} kg · KES {result.pricePerKg}/kg · {result.county}
      </p>
      {description ? (
        <p className="line-clamp-2 text-sm text-muted">{description}</p>
      ) : null}
      {snippet ? (
        <p className="line-clamp-2 text-xs leading-5 text-muted">{snippet}</p>
      ) : null}
      <Button
        className="w-fit rounded-full bg-accent font-medium text-accent-foreground"
        size="sm"
        variant="primary"
        onPress={() => onOrder(result)}
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
        Order
      </Button>
    </article>
  );
}

export function BuyerListingSearch() {
  const semanticSearch = useAction(api.listings.search.semanticSearch);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [checkoutListing, setCheckoutListing] =
    useState<ListingSearchResult | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-muted" strokeWidth={1.75} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Find produce
            </h1>
          </div>
        </div>
      </div>

      <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
        <Card.Content className="px-5 py-5 sm:px-6">
          <form className="flex flex-col gap-3" onSubmit={handleSearch}>
            <SearchField className="w-full">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  aria-label="Search listings"
                  placeholder="e.g. 50kg potatoes in Nakuru"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </SearchField.Group>
            </SearchField>
            <Button
              className="w-fit rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
              isDisabled={isSearching || !hasQuery}
              size="sm"
              type="submit"
              variant="primary"
            >
              {isSearching ? "Searching…" : "Search listings"}
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          <div className="mt-5">
            {hasSearched && results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-card border border-separator bg-default/60 px-6 py-10 text-center">
                <Search className="h-5 w-5 text-muted" strokeWidth={1.75} />
                <p className="text-sm font-medium text-foreground">
                  No matching listings
                </p>
                <p className="text-xs text-muted">
                  Try a different crop, county, or quantity.
                </p>
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="motion-safe-fade-in flex flex-col gap-3">
                <h2 className="text-eyebrow">Matching listings</h2>
                <ol className="flex flex-col gap-3">
                  {results.map((result) => (
                    <li key={result.listingId}>
                      <ListingResultCard
                        result={result}
                        onOrder={(listing) => {
                          setCheckoutListing(listing);
                          setCheckoutOpen(true);
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </Card.Content>
      </Card>

      <OrderCheckoutDialog
        listing={checkoutListing}
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setCheckoutListing(null);
        }}
      />
    </div>
  );
}
