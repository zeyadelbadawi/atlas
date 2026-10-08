/**
 * Website Settings → Social links: one row per link, a platform chosen from
 * the shared catalogue (never typed) and its address.
 *
 * The platform is stored as an identifier (`platform: 'instagram'`); the
 * link's `label` — still required by the saved contract — follows the
 * platform's name. A link saved before the picker (label and URL only)
 * shows the platform its label or address identifies, and is saved with
 * that platform the next time the row is edited; one that identifies none
 * keeps its label (shown under the row) until a platform is chosen.
 * Nothing is dropped or rewritten without an edit.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { WebsiteFooterLink } from '@types';
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_NAMES,
  SOCIAL_URL_EXAMPLES,
  isValidSocialUrl,
  resolveSocialPlatform,
  type SocialPlatform,
} from '../social/social-platforms';
import { SocialIcon } from '../social/SocialIcon';

function withPlatform(
  link: WebsiteFooterLink,
  platform: SocialPlatform
): WebsiteFooterLink {
  const name = SOCIAL_PLATFORM_NAMES[platform];
  return { ...link, platform, label: { en: name, ar: name } };
}

/** The link as it will be saved: a legacy link gains the platform it identifies. */
function normalised(link: WebsiteFooterLink): WebsiteFooterLink {
  if (link.platform) return link;
  const platform = resolveSocialPlatform(link);
  return platform ? withPlatform(link, platform) : link;
}

export interface SocialLinksEditorProps {
  readonly links: readonly WebsiteFooterLink[];
  readonly onChange: (links: readonly WebsiteFooterLink[]) => void;
}

export function SocialLinksEditor({
  links,
  onChange,
}: SocialLinksEditorProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();

  const isDuplicate = (candidate: WebsiteFooterLink) =>
    !!candidate.url &&
    links.some(
      (other) =>
        other.id !== candidate.id &&
        resolveSocialPlatform(other) === resolveSocialPlatform(candidate) &&
        (other.url ?? '').replace(/\/+$/, '').toLowerCase() ===
          candidate.url!.replace(/\/+$/, '').toLowerCase()
    );

  const replace = (next: WebsiteFooterLink) => {
    if (isDuplicate(next)) {
      toast({
        title: t('website:navigation.social.duplicate'),
        variant: 'destructive',
      });
      return;
    }
    onChange(links.map((link) => (link.id === next.id ? next : link)));
  };

  const add = () => {
    // The first platform not used yet; any, if all are.
    const used = new Set(links.map((link) => resolveSocialPlatform(link)));
    const platform =
      SOCIAL_PLATFORMS.find((candidate) => !used.has(candidate)) ??
      SOCIAL_PLATFORMS[0];
    onChange([
      ...links,
      withPlatform(
        { id: crypto.randomUUID(), label: { en: '', ar: '' }, url: '' },
        platform
      ),
    ]);
  };

  const updateUrl = (link: WebsiteFooterLink, raw: string) => {
    const url = raw.trim();
    if (url === (link.url ?? '')) return;
    if (url && !isValidSocialUrl(url)) {
      toast({ title: t('validation:invalidUrl'), variant: 'destructive' });
      return;
    }
    replace(normalised({ ...link, url }));
  };

  return (
    <div className="space-y-3" role="group" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <Label id={headingId}>{t('website:navigation.socialLinks')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" aria-hidden />
          {t('website:navigation.addSocialLink')}
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('website:navigation.social.empty')}
        </p>
      ) : null}

      <ul className="space-y-3">
        {links.map((link, index) => {
          const platform = resolveSocialPlatform(link);
          const platformId = `social-platform-${link.id}`;
          const urlId = `social-url-${link.id}`;
          const number = index + 1;
          return (
            <li
              key={link.id}
              data-testid="social-link-row"
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end sm:border-0 sm:p-0"
            >
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={platformId}
                  className="text-xs text-muted-foreground"
                >
                  {t('website:navigation.social.platform')}
                </Label>
                <Select
                  value={platform ?? ''}
                  onValueChange={(value) =>
                    replace(withPlatform(link, value as SocialPlatform))
                  }
                >
                  <SelectTrigger
                    id={platformId}
                    aria-label={t('website:navigation.social.platformFor', {
                      number,
                    })}
                    data-testid="social-platform-select"
                  >
                    <SelectValue
                      placeholder={t(
                        'website:navigation.social.choosePlatform'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map((option) => (
                      <SelectItem key={option} value={option}>
                        <span className="flex items-center gap-2">
                          <SocialIcon
                            platform={option}
                            className="size-4 shrink-0"
                          />
                          {SOCIAL_PLATFORM_NAMES[option]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={urlId}
                  className="text-xs text-muted-foreground"
                >
                  {t('website:navigation.social.url')}
                </Label>
                <Input
                  // Re-mount on an external change so the field shows it.
                  key={`${link.id}-${link.url ?? ''}`}
                  id={urlId}
                  type="url"
                  inputMode="url"
                  dir="ltr"
                  autoComplete="url"
                  placeholder={
                    platform ? SOCIAL_URL_EXAMPLES[platform] : 'https://'
                  }
                  defaultValue={link.url ?? ''}
                  onBlur={(event) => updateUrl(link, event.target.value)}
                  data-testid="social-url-input"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="justify-self-end"
                onClick={() =>
                  onChange(links.filter((other) => other.id !== link.id))
                }
                aria-label={t('website:navigation.social.remove', {
                  name: platform
                    ? SOCIAL_PLATFORM_NAMES[platform]
                    : link.label.en || number,
                })}
              >
                <X className="size-4" aria-hidden />
              </Button>
              {!platform ? (
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  {t('website:navigation.social.legacy', {
                    label: link.label.en || link.label.ar,
                  })}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
