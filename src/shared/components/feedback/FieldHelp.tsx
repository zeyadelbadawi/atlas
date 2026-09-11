/**
 * FieldHelp — a small contextual-help affordance for a form field
 * (Phase 9, roadmap finding G10).
 *
 * Sits next to a `FormLabel` and explains one genuinely non-obvious
 * field. Built on the existing `Tooltip` primitive already used elsewhere
 * in the shell rather than introducing a second help mechanism.
 *
 * ACCESSIBILITY. The trigger is a real `<button type="button">`, so it is
 * reachable and dismissible by keyboard and announces itself to a screen
 * reader; Radix shows the tooltip on focus as well as hover. `type` is
 * set explicitly because a bare `<button>` inside a form defaults to
 * `submit` — without it, tabbing to this control and pressing Enter would
 * submit the form. The icon is `aria-hidden` and the accessible name
 * comes from the label text, so the control never announces as "button".
 *
 * The tooltip text is advisory only: it never carries information the
 * user needs in order to complete the field correctly, so nothing is lost
 * to a user who never opens it.
 */
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FieldHelpProps {
  /** Translation key for the help text. */
  readonly contentKey: string;
  /** Translation key for the trigger's accessible name. Defaults to a generic "More information about this field". */
  readonly labelKey?: string;
}

export function FieldHelp({
  contentKey,
  labelKey = 'common:fieldHelp.trigger',
}: FieldHelpProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={t(labelKey)}
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-start">
          {t(contentKey)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
