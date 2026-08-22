/**
 * Public Website Status (Prompt 11).
 *
 * Renders every non-`ready` `PublicWebsiteDataState` as a professional,
 * safe public page — never exposing internal implementation details
 * (see `Reports/ARCHITECTURE.md`, Prompt 11, "Public Runtime Error
 * States"). Reuses the existing `ErrorState`/`Skeleton` primitives
 * (plain, chrome-free components — safe outside the dashboard shell).
 */
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicWebsiteDataState } from '../hooks/usePublicWebsiteData';

export interface PublicWebsiteStatusProps {
  readonly state: Exclude<PublicWebsiteDataState, { status: 'ready' }>;
}

export function PublicWebsiteStatus({ state }: PublicWebsiteStatusProps): JSX.Element {
  const { t } = useTranslation();

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const copy = {
    'not-found': {
      titleKey: 'website:public.notFound.title',
      descriptionKey: 'website:public.notFound.description',
    },
    unavailable: {
      titleKey: 'website:public.unavailable.title',
      descriptionKey: 'website:public.unavailable.description',
    },
    unpublished: {
      titleKey: 'website:public.unpublished.title',
      descriptionKey: 'website:public.unpublished.description',
    },
  }[state.status];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-pill bg-muted text-muted-foreground">
          <Globe className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <ErrorState
          kind={state.status === 'unavailable' ? 'server' : 'notFound'}
          titleKey={copy.titleKey}
          descriptionKey={copy.descriptionKey}
        />
        <p className="text-xs text-muted-foreground">{t('website:public.poweredBy')}</p>
      </div>
    </div>
  );
}
