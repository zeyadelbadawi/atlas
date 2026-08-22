/**
 * Website Blog & Announcements Content Tab.
 *
 * Deliberately does NOT duplicate the existing Knowledge Blog
 * (`@features/blog`, Prompt 5) or Announcements (`@features/announcements`,
 * Prompt 5) domains — both already provide full draft/published/archived
 * content management. This tab links out to them, the same "reuse,
 * don't rebuild" pattern the Website Brand tab already established for
 * Academy Branding (Prompt 9). Dynamic SEO for a Blog post is resolved
 * from its EXISTING fields via `resolveBlogPostSeo` — no new content
 * model was introduced (see `Reports/ARCHITECTURE.md`, Prompt 10,
 * "Blog / Announcements Reuse").
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Megaphone, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';

export function WebsiteBlogContentTab(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Newspaper className="size-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{t('website:content.blog.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('website:content.blog.description')}</p>
          <Button type="button" variant="outline" onClick={() => navigate(DASHBOARD_ROUTES.blog)}>
            {t('website:content.blog.manageAction')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Megaphone className="size-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{t('website:content.announcements.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('website:content.announcements.description')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(DASHBOARD_ROUTES.announcements)}
          >
            {t('website:content.announcements.manageAction')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
