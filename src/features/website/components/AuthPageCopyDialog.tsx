/**
 * Auth Page Copy Dialog.
 *
 * The Pages list's entry point for editing Sign In/Sign Up's heading
 * copy — Sign In and Sign Up are fixed, dedicated pages (not `WebsitePage`
 * records; see `PublicWebsiteSignInPage`/`PublicWebsiteSignUpPage`), so
 * they can't open the real page editor. This is the same two-field
 * editor already available on Website Settings' Navigation tab, exposed
 * here too so an admin looking at the Pages list finds them where they'd
 * expect to, without a second, drifting copy of the save logic — see
 * `buildAuthPageCopyHeaderPatch`'s own doc comment.
 */
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { LocalizedTextField } from './LocalizedTextField';
import {
  buildAuthPageCopyHeaderPatch,
  type AuthPageKey,
} from '../utils/auth-page-copy.utils';
import type { LocalizedText, WebsiteConfiguration } from '@types';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

export interface AuthPageCopyDialogProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  readonly page: AuthPageKey;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function AuthPageCopyDialog({
  academyId,
  configuration,
  page,
  open,
  onOpenChange,
}: AuthPageCopyDialogProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();

  const copy = configuration.header.authPages?.[page];
  const titleKey =
    page === 'signIn'
      ? 'website:navigation.ctaTargetSignIn'
      : 'website:navigation.ctaTargetSignUp';
  const defaultTitleKey =
    page === 'signIn'
      ? 'publicWebsite:auth.signIn.title'
      : 'publicWebsite:auth.signUp.title';
  const defaultSubtitleKey =
    page === 'signIn'
      ? 'publicWebsite:auth.signIn.subtitle'
      : 'publicWebsite:auth.signUp.subtitle';

  const save = (field: 'title' | 'subtitle', value: LocalizedText) => {
    updateConfig.mutate(
      {
        academyId,
        payload: {
          header: buildAuthPageCopyHeaderPatch(
            configuration,
            page,
            field,
            value
          ),
        },
      },
      {
        onError: () =>
          toast({
            title: t('website:navigation.saveError'),
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('website:navigation.authPagesDescription')}
        </p>
        <div className="space-y-4">
          <LocalizedTextField
            id={`auth-page-${page}-title`}
            labelKey="website:navigation.authPageHeading"
            placeholderEn={t(defaultTitleKey, { academyName: '' }).trim()}
            value={copy?.title ?? EMPTY_LOCALIZED}
            onBlur={(value) => save('title', value)}
          />
          <LocalizedTextField
            id={`auth-page-${page}-subtitle`}
            labelKey="website:navigation.authPageSubheading"
            placeholderEn={t(defaultSubtitleKey, { academyName: '' }).trim()}
            value={copy?.subtitle ?? EMPTY_LOCALIZED}
            onBlur={(value) => save('subtitle', value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('common:actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
