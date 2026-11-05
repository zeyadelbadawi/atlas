/**
 * B0 (UX audit) — the ONE toast a failed mutation shows.
 *
 * Before: `useApiMutation` raised its own generic toast ("That action could
 * not be completed") on every failure, and the app-wide reporter
 * (`AtlasQueryProvider`) raised a second one with the real reason. A
 * customer who hit a conflict saw "This item was changed elsewhere — reload"
 * stacked on "Please try again", and a rejected form only ever said "try
 * again" without saying what was wrong.
 *
 * Now the mutation's own toast carries the specific reason, and the hook
 * marks the mutation `inlineErrors` so the app-wide reporter stays quiet.
 * Pure, so every rule below is unit-tested without rendering.
 */
import { errorMessageKey, errorTitleKey } from '@services';
import type { ApiError } from '@services';
import { humanizeFieldName, toErrorsNamespaceKey } from '@utils';

export interface MutationErrorToast {
  readonly titleKey: string;
  readonly descriptionKey?: string;
  readonly values?: Record<string, string | number>;
}

export interface MutationErrorToastOptions {
  /** A caller's explicit message replaces the derived one (legacy option). */
  readonly errorMessageKey?: string;
  /** Whether a translation key exists — a raw key never reaches the screen. */
  readonly exists: (key: string) => boolean;
  /** `navigator.onLine`; `false` explains that nothing was saved offline. */
  readonly online: boolean;
}

/**
 * Page-oriented copy reads wrong after an ACTION: "the page you are looking
 * for does not exist" after pressing Save. These kinds get action copy.
 */
const ACTION_TITLE: Partial<Record<ApiError['kind'], string>> = {
  notFound: 'errors:mutation.notFoundTitle',
  forbidden: 'errors:mutation.forbiddenTitle',
};

const ACTION_FALLBACK: Partial<Record<ApiError['kind'], string>> = {
  notFound: 'errors:mutation.notFound',
  forbidden: 'errors:mutation.forbidden',
  unknown: 'errors:mutation.failed',
};

export function mutationErrorToast(
  error: Pick<ApiError, 'kind' | 'messageKey' | 'violations'>,
  options: MutationErrorToastOptions
): MutationErrorToast | null {
  // Nothing failed from the customer's point of view.
  if (error.kind === 'cancelled') return null;

  if (options.errorMessageKey) return { titleKey: options.errorMessageKey };

  if (
    (error.kind === 'network' || error.kind === 'timeout') &&
    !options.online
  ) {
    return {
      titleKey: 'common:connectivity.actionNeedsConnection.title',
      descriptionKey: 'common:connectivity.actionNeedsConnection.description',
    };
  }

  // A rejected form says WHAT is wrong, not only that something is: the
  // first violation in words, with the field it belongs to. Forms that map
  // violations onto their fields show every one of them there too.
  if (error.kind === 'validation') {
    const first = error.violations?.find((v) => options.exists(v.messageKey));
    if (first) {
      return {
        titleKey: 'errors:validation.title',
        descriptionKey: first.messageKey,
        values: {
          field: humanizeFieldName(first.field),
          ...(first.values ?? {}),
        },
      };
    }
  }

  const specific = toErrorsNamespaceKey(error.messageKey);
  const isGenericForKind = specific === errorMessageKey(error.kind);
  const descriptionKey =
    !isGenericForKind && options.exists(specific)
      ? specific
      : (ACTION_FALLBACK[error.kind] ?? errorMessageKey(error.kind));

  return {
    titleKey: ACTION_TITLE[error.kind] ?? errorTitleKey(error.kind),
    descriptionKey,
  };
}
