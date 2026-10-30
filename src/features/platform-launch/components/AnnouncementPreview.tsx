/**
 * B3 — the announcement editor's live preview, in English AND Arabic side
 * by side (stacked on phones): the marketing banner bar on a page frame,
 * the marketing pop-up, or the dashboard banner — built from the same
 * presentation the site and the dashboard use. A language without a
 * message says it will not show in that language.
 */
import { useTranslation } from 'react-i18next';
import type {
  AnnouncementContent,
  AnnouncementSurface,
  AnnouncementTone,
  BlogLocale,
} from '../types';
import { K } from '../utils/launch.utils';
import { AnnouncementBannerView } from './AnnouncementBannerView';
import { PopupPreview } from './PopupPreview';

export interface AnnouncementPreviewProps {
  readonly surface: AnnouncementSurface;
  readonly tone: AnnouncementTone;
  readonly content: Readonly<Record<BlogLocale, AnnouncementContent>>;
  readonly ctaUrl: string;
  readonly imageUrl: string | null;
  readonly dismissible: boolean;
}

function hasContent(content: AnnouncementContent): boolean {
  return Boolean(content.body.trim() || content.title.trim());
}

export function AnnouncementPreview({
  surface,
  tone,
  content,
  ctaUrl,
  imageUrl,
  dismissible,
}: AnnouncementPreviewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(['en', 'ar'] as const).map((locale) => {
        const value = content[locale];
        const language = t(
          `${K}common.${locale === 'en' ? 'english' : 'arabic'}`
        );
        const dir = locale === 'ar' ? 'rtl' : 'ltr';
        return (
          <figure key={locale} className="min-w-0 space-y-2">
            <figcaption className="text-xs font-medium text-muted-foreground">
              {t(`${K}announcementEditor.preview.label`, { language })}
            </figcaption>
            {!hasContent(value) ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t(`${K}announcementEditor.preview.noContent`, { language })}
              </p>
            ) : surface === 'marketing_popup' ? (
              <PopupPreview
                tone={tone}
                title={value.title}
                body={value.body}
                ctaLabel={value.ctaLabel}
                ctaUrl={ctaUrl}
                imageUrl={imageUrl}
                dismissible={dismissible}
                closeLabel={t(`${K}announcementEditor.preview.popupClose`)}
                lang={locale}
                dir={dir}
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div
                  className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-1.5"
                  aria-hidden
                >
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  <span className="ms-2 truncate text-[0.7rem] text-muted-foreground">
                    {t(
                      `${K}announcementEditor.preview.${surface === 'dashboard_banner' ? 'dashboard' : 'marketingPage'}`
                    )}
                  </span>
                </div>
                <div className={surface === 'dashboard_banner' ? 'p-3' : ''}>
                  <AnnouncementBannerView
                    tone={tone}
                    title={value.title || undefined}
                    body={value.body}
                    ctaLabel={value.ctaLabel || undefined}
                    ctaUrl={ctaUrl}
                    dismissible={dismissible}
                    dismissLabel={t(`${K}announcementEditor.preview.dismiss`)}
                    lang={locale}
                    dir={dir}
                    interactive={false}
                    className={
                      surface === 'dashboard_banner'
                        ? ''
                        : 'rounded-none border-x-0 border-t-0'
                    }
                  />
                  <div className="space-y-2 p-4" aria-hidden>
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              </div>
            )}
          </figure>
        );
      })}
    </div>
  );
}
