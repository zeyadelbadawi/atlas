/**
 * Search Page.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — the mock result
 * array and `setTimeout`-as-latency are gone. Real query via
 * `useGlobalSearch`, real loading/error/retry states from TanStack Query,
 * and a client-side permission-aware filter before anything renders.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { useSearch, useAuth } from '@hooks';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { useGlobalSearch } from '../hooks';
import { filterSearchResultsByRole } from '../utils/filter-search-results.utils';
import type { SearchResultItem } from '@types';

const MIN_QUERY_LENGTH = 2;

export default function SearchPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { query, setQuery, debouncedQuery } = useSearch({ debounceMs: 300, minLength: MIN_QUERY_LENGTH });

  const { data, isLoading, error, refetch } = useGlobalSearch(debouncedQuery);

  const results = useMemo(() => {
    if (!data) return null;
    return filterSearchResultsByRole(data, user?.roles ?? []);
  }, [data, user?.roles]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleResultSelect = useCallback(
    (item: SearchResultItem): void => {
      if (item.path) {
        navigate(item.path);
      }
    },
    [navigate]
  );

  const errorMessage = error ? t('search:error.message') : null;

  return (
    <PageContainer>
      <PageHeader titleKey="search:title" descriptionKey="search:subtitle" />

      <div className="space-y-6">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          isLoading={isLoading}
          placeholder={t('search:placeholder')}
        />

        {query.length >= MIN_QUERY_LENGTH || results || isLoading || errorMessage ? (
          <Card>
            <CardContent className="p-0">
              <SearchResults
                results={results}
                isLoading={isLoading}
                error={errorMessage}
                onRetry={handleRetry}
                onResultSelect={handleResultSelect}
              />
            </CardContent>
          </Card>
        ) : null}

        {query.length > 0 && query.length < MIN_QUERY_LENGTH ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('search:minLength', { count: MIN_QUERY_LENGTH })}
            </p>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
