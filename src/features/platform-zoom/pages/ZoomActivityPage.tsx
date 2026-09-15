/**
 * Zoom Operations — Activity.
 *
 * A chronological timeline of the FIVE Zoom integration audit actions
 * that Atlas actually persists (connect / disconnect / deauthorize /
 * session created / session published). Read-only. No events are invented
 * to fill the timeline; if an action is not written by the system, it does
 * not appear here.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@utils';
import { useZoomActivity } from '../hooks/usePlatformZoom';
import { ZoomPager } from '../components/ZoomPager';
import type { LanguageCode } from '@types';

const ACTIONS = [
  'live_provider.connected',
  'live_provider.disconnected',
  'live_provider.deauthorized',
  'live_session.created',
  'live_session.published',
] as const;

export default function ZoomActivityPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [action, setAction] = useState<(typeof ACTIONS)[number] | undefined>();
  const [page, setPage] = useState(1);
  const query = useZoomActivity({ page, pageSize: 25, action });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const pick = (v?: (typeof ACTIONS)[number]) => { setAction(v); setPage(1); };

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:activity.title" descriptionKey="platformZoom:activity.subtitle" />
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={action === undefined ? 'default' : 'outline'} onClick={() => pick(undefined)}>
          {t('platformZoom:filters.all')}
        </Button>
        {ACTIONS.map((v) => (
          <Button key={v} size="sm" variant={action === v ? 'default' : 'outline'} onClick={() => pick(action === v ? undefined : v)}>
            {t(`platformZoom:action.${v}`)}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={History} titleKey="platformZoom:activity.emptyTitle" descriptionKey="platformZoom:activity.emptyDescription" />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{t(`platformZoom:action.${e.action}`, { defaultValue: e.action })}</p>
                  {e.actorName ? <p className="text-xs text-muted-foreground">{e.actorName}</p> : null}
                </div>
                <span className="text-xs text-muted-foreground" dir="ltr">{formatDate(e.occurredAt, language, 'short')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {pagination ? <ZoomPager page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPage={setPage} /> : null}
    </PageContainer>
  );
}
