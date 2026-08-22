/**
 * Website Content Page (Prompt 10).
 *
 * The CMS surface: reusable FAQ/Testimonial library content, plus a link
 * out to the existing Blog/Announcements management surfaces. Does NOT
 * reuse `WebsitePageEditorPage`'s Section Editor — this page manages
 * standalone library content, never a page's section composition (see
 * `Reports/ARCHITECTURE.md`, Prompt 10, "CMS vs. Page Composer").
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WebsiteFaqContentTab } from '../components/WebsiteFaqContentTab';
import { WebsiteTestimonialContentTab } from '../components/WebsiteTestimonialContentTab';
import { WebsiteBlogContentTab } from '../components/WebsiteBlogContentTab';

export default function WebsiteContentPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();

  if (!academyId) return <PageContainer><PageHeader titleKey="website:content.title" /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader titleKey="website:content.title" descriptionKey="website:content.subtitle" />

      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">{t('website:content.tabs.faqs')}</TabsTrigger>
          <TabsTrigger value="testimonials">{t('website:content.tabs.testimonials')}</TabsTrigger>
          <TabsTrigger value="blog">{t('website:content.tabs.blog')}</TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="pt-4">
          <WebsiteFaqContentTab academyId={academyId} />
        </TabsContent>
        <TabsContent value="testimonials" className="pt-4">
          <WebsiteTestimonialContentTab academyId={academyId} />
        </TabsContent>
        <TabsContent value="blog" className="pt-4">
          <WebsiteBlogContentTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
