/**
 * The explicit confirmation before an add-on's catalog publication state
 * changes.
 *
 * WHY A CONFIRMATION AT ALL. This is a customer-facing switch: the target
 * state decides whether an add-on is invisible, announced-but-locked, or
 * fully installable across every academy in Atlas. That is not something a
 * mis-clicked row should do silently, so the dialog states the exact
 * customer impact of the chosen target before it happens.
 *
 * IT DOES NOT INSTALL OR ENABLE ANYTHING. Publishing exposes the add-on in
 * the store under the existing entitlement rules; it never installs it for
 * a tenant. The copy says so, because the opposite is the assumption an
 * operator would otherwise make.
 */
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AddOnCatalogStatus, PlatformAddOnRow } from '../types';

const IMPACT_ICON: Record<AddOnCatalogStatus, LucideIcon> = {
  draft: EyeOff,
  coming_soon: Clock,
  published: Eye,
};

export interface ChangeCatalogStatusDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The add-on whose state is changing, and the state it is changing TO. */
  readonly addOn: PlatformAddOnRow | null;
  readonly targetStatus: AddOnCatalogStatus | null;
  readonly isSubmitting: boolean;
  readonly onConfirm: () => void;
}

export function ChangeCatalogStatusDialog({
  open,
  onOpenChange,
  addOn,
  targetStatus,
  isSubmitting,
  onConfirm,
}: ChangeCatalogStatusDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!addOn || !targetStatus) return null;

  const Icon = IMPACT_ICON[targetStatus];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('platformAddOns:dialog.title', { name: addOn.name })}
          </DialogTitle>
          <DialogDescription>
            {t('platformAddOns:dialog.subtitle', {
              from: t(`platformAddOns:status.${addOn.catalogStatus}`),
              to: t(`platformAddOns:status.${targetStatus}`),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
          <span className="text-muted-foreground">
            {t(`platformAddOns:impact.${targetStatus}`)}
          </span>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting
              ? t('platformAddOns:dialog.applying')
              : t('platformAddOns:dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
