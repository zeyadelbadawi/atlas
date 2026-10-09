/**
 * A gentle, dismissible nudge for accounts with no phone number — people
 * who signed up before the field existed, or with Google. Never a blocker:
 * "Not now" hides it in this browser for 30 days, and it renders nothing
 * while loading, on error, or once a number exists.
 *
 * The dismissal is a per-browser convenience in `localStorage` (one
 * timestamp per account id, no personal data); storage that throws or is
 * empty simply means the prompt may show again.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@hooks';
import { useUserPhone } from '../hooks';

export const PHONE_PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const storageKey = (userId: string) => `atlas:phone-prompt-dismissed:${userId}`;

function isSnoozed(userId: string, now: number): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const dismissedAt = raw ? Number(raw) : NaN;
    return (
      Number.isFinite(dismissedAt) && now - dismissedAt < PHONE_PROMPT_SNOOZE_MS
    );
  } catch {
    return false;
  }
}

function snooze(userId: string, now: number): void {
  try {
    window.localStorage.setItem(storageKey(userId), String(now));
  } catch {
    // Hidden for this visit only.
  }
}

export interface PhoneNumberPromptProps {
  /** The profile page that holds the phone card (dashboard or learner area). */
  readonly profileHref: string;
}

export function PhoneNumberPrompt({
  profileHref,
}: PhoneNumberPromptProps): JSX.Element | null {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const [dismissed, setDismissed] = useState(() =>
    userId ? isSnoozed(userId, Date.now()) : false
  );
  const phone = useUserPhone({ enabled: !!userId && !dismissed });

  if (!userId || dismissed || !phone.isSuccess || phone.data.phone) {
    return null;
  }

  const separator = profileHref.includes('?') ? '&' : '?';

  return (
    <aside
      aria-labelledby="phone-prompt-title"
      data-testid="phone-number-prompt"
      className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Phone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 id="phone-prompt-title" className="text-sm font-semibold">
          {t('profile:phone.prompt.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('profile:phone.prompt.body')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link to={`${profileHref}${separator}phone=add`}>
              {t('profile:phone.prompt.action')}
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              snooze(userId, Date.now());
              setDismissed(true);
            }}
          >
            {t('profile:phone.prompt.dismiss')}
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          snooze(userId, Date.now());
          setDismissed(true);
        }}
        aria-label={t('profile:phone.prompt.dismiss')}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </aside>
  );
}
