/**
 * Search Page.
 *
 * Global search experience with keyboard navigation and result grouping.
 */
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { useSearch } from "@hooks";
import { SearchBar } from "../components/SearchBar";
import { SearchResults } from "../components/SearchResults";
import type {
  SearchResults as SearchResultsType,
  SearchResultItem,
} from "@types";

export default function SearchPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [results, setResults] = useState<SearchResultsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search hook with debounce
  const { query, setQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
    minLength: 2,
    onSearch: handleSearch,
  });

  // Mock search function - in real implementation, this would call a search service
  async function handleSearch(searchQuery: string): Promise<void> {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Mock results grouped by category
      const mockResults: SearchResultsType = {
        query: searchQuery,
        groups: [
          {
            category: "platform",
            categoryLabelKey: "search:categories.platform",
            items: [
              {
                id: "platform-1",
                category: "platform",
                title: t("navigation:items.platformDashboard"),
                description: t("platform:dashboard.description"),
                path: "/dashboard/platform",
              },
              {
                id: "platform-2",
                category: "platform",
                title: t("navigation:items.settings"),
                description: t("settings:page.description"),
                path: "/dashboard/settings",
              },
              {
                id: "platform-3",
                category: "platform",
                title: t("navigation:items.analytics"),
                description: t("analytics:subtitle"),
                path: "/dashboard/analytics",
              },
            ],
          },
          {
            category: "users",
            categoryLabelKey: "search:categories.users",
            items: [
              {
                id: "user-1",
                category: "users",
                title: t("navigation:items.profile"),
                description: t("profile:sections.personal.title"),
                path: "/dashboard/profile",
              },
            ],
          },
          {
            category: "system",
            categoryLabelKey: "search:categories.system",
            items: [
              {
                id: "system-1",
                category: "system",
                title: t("navigation:items.notifications"),
                description: t("notifications:subtitle"),
                path: "/dashboard/notifications",
              },
              {
                id: "system-2",
                category: "system",
                title: t("navigation:items.billing"),
                description: t("billing:subtitle"),
                path: "/dashboard/billing",
              },
            ],
          },
        ],
        totalCount: 6,
      };

      // Filter results based on search query (case-insensitive)
      const filteredGroups = mockResults.groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((group) => group.items.length > 0);

      const filteredResults: SearchResultsType = {
        query: searchQuery,
        groups: filteredGroups,
        totalCount: filteredGroups.reduce(
          (sum, group) => sum + group.items.length,
          0,
        ),
      };

      setResults(filteredResults);
    } catch (err) {
      setError(t("search:error.message"));
    } finally {
      setIsLoading(false);
    }
  }

  const handleRetry = useCallback(() => {
    if (debouncedQuery) {
      handleSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  const handleResultSelect = useCallback(
    (item: SearchResultItem): void => {
      if (item.path) {
        navigate(item.path);
      }
    },
    [navigate],
  );

  return (
    <PageContainer>
      <PageHeader titleKey="search:title" descriptionKey="search:subtitle" />

      <div className="space-y-6">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          isLoading={isLoading}
          placeholder={t("search:placeholder")}
        />

        {(query.length >= 2 || results || isLoading || error) && (
          <Card>
            <CardContent className="p-0">
              <SearchResults
                results={results}
                isLoading={isLoading}
                error={error}
                onRetry={handleRetry}
                onResultSelect={handleResultSelect}
              />
            </CardContent>
          </Card>
        )}

        {query.length > 0 && query.length < 2 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("search:minLength", { count: 2 })}
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
