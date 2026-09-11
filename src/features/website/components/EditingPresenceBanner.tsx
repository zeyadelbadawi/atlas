/**
 * "Ahmed is currently editing this page."
 *
 * Deliberately quiet: an informational strip above the editor, not a modal
 * and not a warning. Nothing here is blocking — the person can carry on
 * editing and saving, and if they lose a race the save conflict explains
 * it properly. Treating presence as an alarm would train people to dismiss
 * it, which is exactly when they would miss the one that mattered.
 *
 * Renders nothing when nobody else is editing, so it costs no vertical
 * space in the ordinary case.
 */
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import type { EditingParticipant } from '@types';

export interface EditingPresenceBannerProps {
  readonly participants: readonly EditingParticipant[];
}

export function EditingPresenceBanner({
  participants,
}: EditingPresenceBannerProps): JSX.Element | null {
  const { t } = useTranslation();

  if (participants.length === 0) return null;

  const [first] = participants;
  const others = participants.length - 1;

  return (
    <div
      // `role="status"` rather than `alert`: this is ambient information
      // that should be announced politely when it changes, not something
      // that interrupts a screen-reader user mid-sentence.
      role="status"
      data-testid="editing-presence-banner"
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      <Users className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <p>
        {others === 0
          ? t('website:presence.oneEditing', {
              name: first.name,
              role: t(`website:presence.roles.${first.role}`, {
                defaultValue: first.role,
              }),
            })
          : t('website:presence.manyEditing', {
              name: first.name,
              count: others,
            })}
      </p>
    </div>
  );
}
