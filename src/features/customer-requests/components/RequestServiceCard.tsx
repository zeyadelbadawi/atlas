/**
 * A contextual "Request a …" card, placed next to the feature it extends
 * (the logo upload, the domain settings, the theme picker, the dashboard's
 * quick actions): an icon, one question, one line of pitch and a quiet
 * outline button that opens `CreateCustomerRequestDialog` preset to the
 * type.
 *
 * Deliberately subtle — a native Atlas surface, not a banner: it sits
 * beside real settings and must never compete with them.
 *
 * Rendered only for an owner/administrator of the academy in the URL (the
 * API's own rule), so a manager is never offered a door that answers 403.
 * The dialog mounts on first use, so a host page pays nothing for it
 * until someone asks.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import { CR_NS } from '../constants/customer-request.constants';
import { useCanRequestCustomerServices } from '../hooks';
import { customerRequestTypeIcon } from '../utils/customer-request.utils';
import type { CustomerRequestType } from '../types/customer-request.types';
import { CreateCustomerRequestDialog } from './CreateCustomerRequestDialog';

type HeadingLevel = 'h2' | 'h3' | 'h4';

export interface RequestServiceCardProps {
  readonly type: CustomerRequestType;
  /** Heading level for where the card sits in the page outline. Default `h3`. */
  readonly headingLevel?: HeadingLevel;
  /**
   * Skip the role check — for screens that are themselves gated to
   * owners/administrators (the Requests center).
   */
  readonly skipAccessCheck?: boolean;
  readonly className?: string;
}

export function RequestServiceCard({
  skipAccessCheck = false,
  ...props
}: RequestServiceCardProps): JSX.Element | null {
  const canRequest = useCanRequestCustomerServices();
  if (!skipAccessCheck && !canRequest) return null;
  return <RequestServiceCardBody {...props} />;
}

function RequestServiceCardBody({
  type,
  headingLevel: Heading = 'h3',
  className,
}: Omit<RequestServiceCardProps, 'skipAccessCheck'>): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const Icon = customerRequestTypeIcon(type);

  return (
    <>
      <section
        aria-labelledby={headingId}
        data-testid={`request-service-card-${type}`}
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:gap-4',
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <Heading
              id={headingId}
              className="text-sm font-medium leading-snug text-foreground"
            >
              {t(`${CR_NS}:types.${type}.cardTitle`)}
            </Heading>
            <p className="text-sm text-muted-foreground">
              {t(`${CR_NS}:types.${type}.cardPitch`)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => {
            setHasOpened(true);
            setOpen(true);
          }}
        >
          {t(`${CR_NS}:types.${type}.cardAction`)}
        </Button>
      </section>
      {hasOpened ? (
        <CreateCustomerRequestDialog
          open={open}
          onOpenChange={setOpen}
          initialType={type}
        />
      ) : null}
    </>
  );
}
