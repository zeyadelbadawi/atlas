/**
 * CMS phase 4 — the pre-publish page check, shown instead of the plain
 * "Publish this page?" confirmation when the check found something
 * (`collectPagePublishIssues`). Warnings, never a block: "Publish anyway"
 * publishes; each warning is a button that closes the dialog and takes the
 * author to that section — and to the field, when there is one.
 *
 * Grouped by section in page order, each group naming the section as the
 * section list does ("2. Hero"). Every warning carries an icon AND text
 * (never colour alone); rows are at least 44px tall.
 */
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChevronRight,
  Heading1,
  ImageOff,
  Link2Off,
  MessageSquareQuote,
  TextCursorInput,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import type {
  PublishCheckIssue,
  PublishCheckRule,
} from '../utils/page-publish-check.utils';

const RULE_ICON: Record<PublishCheckRule, typeof AlertTriangle> = {
  imageAlt: ImageOff,
  buttonNoLink: Link2Off,
  buttonMissingPage: Link2Off,
  buttonHiddenPage: Link2Off,
  multipleH1: Heading1,
  placeholder: TextCursorInput,
  sample: MessageSquareQuote,
};

/**
 * The author's own text (a placeholder, a page title) keeps its own
 * direction inside the sentence: an Arabic placeholder in an English
 * sentence (or the reverse) is wrapped in Unicode isolates (FSI … PDI),
 * the plain-text equivalent of `<bdi>`.
 */
function isolated(
  values: PublishCheckIssue['values']
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(values ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' ? `\u2068${value}\u2069` : value,
    ])
  );
}

export interface PrePublishCheckDialogProps {
  /** The warnings; the dialog is open while this is not `null`. */
  readonly issues: readonly PublishCheckIssue[] | null;
  readonly onCancel: () => void;
  readonly onPublishAnyway: () => void;
  readonly onJump: (issue: PublishCheckIssue) => void;
}

export function PrePublishCheckDialog({
  issues,
  onCancel,
  onPublishAnyway,
  onJump,
}: PrePublishCheckDialogProps): JSX.Element {
  const { t } = useTranslation();
  const groups: { sectionId: string; items: PublishCheckIssue[] }[] = [];
  for (const issue of issues ?? []) {
    const last = groups[groups.length - 1];
    if (last?.sectionId === issue.sectionId) last.items.push(issue);
    else groups.push({ sectionId: issue.sectionId, items: [issue] });
  }
  const languageOf = (locale: PublishCheckIssue['locale']) =>
    locale === 'ar'
      ? t('website:editor.languageArabic')
      : t('website:editor.languageEnglish');

  return (
    <AlertDialog
      open={issues !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        className="flex max-h-[90dvh] flex-col sm:max-w-xl"
        data-testid="pre-publish-check"
      >
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="size-5 shrink-0 text-warning"
              aria-hidden
            />
            {t('website:publishCheck.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('website:publishCheck.description', {
              count: issues?.length ?? 0,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <ol className="space-y-3">
            {groups.map((group) => {
              const first = group.items[0];
              return (
                <li key={group.sectionId}>
                  <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    {t('website:publishCheck.sectionHeading', {
                      position: first.sectionIndex + 1,
                      section: t(SECTION_METADATA[first.sectionType].labelKey),
                    })}
                  </h3>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {group.items.map((issue) => {
                      const Icon = RULE_ICON[issue.rule];
                      return (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => onJump(issue)}
                            data-rule={issue.rule}
                            className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                          >
                            <Icon
                              className="size-4 shrink-0 text-warning"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 text-foreground">
                              {t(`website:publishCheck.rules.${issue.rule}`, {
                                ...isolated(issue.values),
                                language: languageOf(issue.locale),
                              })}
                              <span className="sr-only">
                                {' '}
                                {t('website:publishCheck.goTo')}
                              </span>
                            </span>
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                              aria-hidden
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('website:publishCheck.review')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onPublishAnyway}
            data-testid="pre-publish-anyway"
          >
            {t('website:publishCheck.publishAnyway')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
