/**
 * The preferences dialog — the "granular choice" half of consent.
 *
 * TWO CATEGORIES, BOTH REAL. Strictly necessary is shown as permanently
 * on and is genuinely not togglable; Preferences is a real switch that
 * really gates storage. There is deliberately no Analytics or Marketing
 * row, because Atlas has neither, and a toggle wired to nothing would be
 * a lie in the one dialog where honesty is the entire point.
 *
 * The local switch state is seeded from the decision in force each time
 * the dialog opens, so cancelling leaves the previous choice untouched.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PUBLIC_ROUTES } from '@app/routes/route-paths';
import { useCookieConsent } from '../consent/CookieConsentProvider';

export function CookiePreferencesDialog() {
  const { t } = useTranslation(['legal']);
  const { consent, isPreferencesOpen, closePreferences, decide } =
    useCookieConsent();

  const [allowPreferences, setAllowPreferences] = useState(
    consent?.preferences ?? false
  );

  // Re-seed on open so the switch always reflects the decision actually
  // in force, not whatever it was left at last time.
  useEffect(() => {
    if (isPreferencesOpen) setAllowPreferences(consent?.preferences ?? false);
  }, [isPreferencesOpen, consent]);

  return (
    <Dialog
      open={isPreferencesOpen}
      onOpenChange={(open) => {
        if (!open) closePreferences();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('legal:consent.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('legal:consent.dialogBody')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t('legal:consent.necessaryTitle')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('legal:consent.necessaryBody')}
                </p>
              </div>
              {/* Not a disabled switch that looks togglable —
                                a plain label, because there is no choice. */}
              <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {t('legal:consent.necessaryAlways')}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label
                  htmlFor="cookie-consent-preferences"
                  className="text-sm font-medium"
                >
                  {t('legal:consent.preferencesTitle')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('legal:consent.preferencesBody')}
                </p>
              </div>
              <Switch
                id="cookie-consent-preferences"
                className="shrink-0"
                checked={allowPreferences}
                onCheckedChange={setAllowPreferences}
              />
            </div>
          </div>

          <Link
            to={PUBLIC_ROUTES.privacyPolicy}
            className="inline-block text-sm underline underline-offset-4"
            onClick={closePreferences}
          >
            {t('legal:consent.learnMore')}
          </Link>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closePreferences}>
            {t('legal:consent.cancel')}
          </Button>
          <Button onClick={() => decide(allowPreferences)}>
            {t('legal:consent.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
