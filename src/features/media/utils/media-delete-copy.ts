/**
 * Copy for deleting media.
 *
 * The backend refuses to delete an asset that something still uses and
 * says exactly what (`details.usages = [{ kind, count }]`). These helpers
 * turn that into a sentence a person can act on — "used by a lesson video
 * and 2 course thumbnails" — instead of a bare "conflict".
 */
import type { TFunction, i18n as I18nInstance } from 'i18next';
import { isApiError } from '@api';
import { apiErrorMessage, hasMessageKey } from '@utils';
import type { MediaUsage, MediaUsageKind } from '@types';

export const MEDIA_USAGE_KINDS: readonly MediaUsageKind[] = [
  'lessonVideo',
  'lessonContent',
  'lessonResource',
  'courseIntroVideo',
  'submissionAttachment',
  'liveSessionRecording',
  'academyLogo',
  'courseThumbnail',
  'certificateTemplateLogo',
  'websiteContent',
];

const KNOWN_KINDS = new Set<string>(MEDIA_USAGE_KINDS);

/** Narrows `error.details.usages` (untyped JSON) to the usages the UI knows how to name. */
export function readMediaUsages(error: unknown): readonly MediaUsage[] {
  if (!isApiError(error)) return [];
  const raw = error.details?.usages;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const { kind, count } = entry as Record<string, unknown>;
    if (typeof kind !== 'string' || !KNOWN_KINDS.has(kind)) return [];
    const safeCount = typeof count === 'number' && count > 0 ? count : 1;
    return [{ kind: kind as MediaUsageKind, count: safeCount }];
  });
}

/** "a lesson video and 2 course thumbnails", in the active language's list style. */
export function describeMediaUsages(
  t: TFunction,
  language: string,
  usages: readonly MediaUsage[]
): string {
  const parts = usages.map((usage) =>
    t(`media:delete.usage.${usage.kind}`, { count: usage.count })
  );
  if (parts.length === 0) return t('media:delete.usage.unknown');
  // `Intl.ListFormat` is in every supported browser but not in this
  // project's TS `lib`, so it is reached through a narrow structural type.
  const ListFormat = (
    Intl as unknown as {
      readonly ListFormat?: new (
        locale: string,
        options: { readonly style: 'long'; readonly type: 'conjunction' }
      ) => { format: (list: readonly string[]) => string };
    }
  ).ListFormat;
  if (!ListFormat) return parts.join(', ');
  try {
    return new ListFormat(language, {
      style: 'long',
      type: 'conjunction',
    }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

/** A learner's submission is part of their record, which is worth saying explicitly. */
export function includesSubmission(usages: readonly MediaUsage[]): boolean {
  return usages.some((usage) => usage.kind === 'submissionAttachment');
}

/** The sentence shown when a single delete fails. */
export function mediaDeleteErrorMessage(
  t: TFunction,
  i18n: Pick<I18nInstance, 'exists' | 'language'>,
  error: unknown,
  fileName: string
): string {
  if (hasMessageKey(error, 'errors.media.inUse')) {
    const usages = readMediaUsages(error);
    const sentence = t('media:delete.inUse', {
      fileName,
      usages: describeMediaUsages(t, i18n.language, usages),
    });
    return includesSubmission(usages)
      ? `${sentence} ${t('media:delete.submissionNote')}`
      : sentence;
  }
  if (isApiError(error) && error.kind === 'forbidden') {
    return t('media:delete.forbidden');
  }
  if (isApiError(error) && error.kind === 'notFound') {
    return t('media:delete.notFound', { fileName });
  }
  return apiErrorMessage(t, i18n, error, {
    fallbackKey: 'media:delete.failed',
  });
}
