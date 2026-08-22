/**
 * Website Pages Page.
 *
 * Lists core + custom pages, toggles visibility (a presentation/config
 * state — never authorization; a hidden page's content is preserved, only
 * navigation/visibility changes, see `Reports/ARCHITECTURE.md`, Prompt 9,
 * "Page Visibility Is Not Security"), and manages custom pages.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@app/providers';
import { useDisclosure, usePermissions } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useCreateWebsitePage,
  useDeleteWebsitePage,
  useUpdateWebsitePage,
  useWebsitePages,
} from '../hooks';
import {
  createWebsitePageSchema,
  type CreateWebsitePageFormData,
} from '../schemas/website.schemas';
import type { WebsitePage } from '@types';

function CreatePageDialog({
  academyId,
  open,
  onOpenChange,
}: {
  readonly academyId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createPage = useCreateWebsitePage();

  const form = useForm<CreateWebsitePageFormData>({
    resolver: zodResolver(createWebsitePageSchema),
    defaultValues: { title: '', slug: '' },
  });
  useServerValidation(form, createPage.error);

  const onSubmit = (data: CreateWebsitePageFormData) => {
    createPage.mutate(
      { academyId, payload: data },
      {
        onSuccess: (page) => {
          onOpenChange(false);
          form.reset();
          navigate(buildPath(DASHBOARD_ROUTES.websitePageEditor, { academyId, pageId: page.id }));
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('website:pages.createTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('website:pages.titleLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('website:pages.slugLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {createPage.error ? <ErrorState onRetry={form.handleSubmit(onSubmit)} /> : null}
            <DialogFooter>
              <Button type="submit" disabled={createPage.isPending}>
                {createPage.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('website:pages.createAction')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WebsitePagesPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const createDialog = useDisclosure();

  const { data, isLoading, error, refetch } = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  const updatePage = useUpdateWebsitePage();
  const deletePage = useDeleteWebsitePage();
  const [pendingId, setPendingId] = useState<string>();

  useEffect(() => {
    if (!updatePage.isPending) setPendingId(undefined);
  }, [updatePage.isPending]);

  const canManage = hasPermission('academy.website.manage');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data || !academyId) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:pages.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const pages = data.items;

  const toggleVisibility = (page: WebsitePage) => {
    setPendingId(page.id);
    updatePage.mutate({
      academyId,
      pageId: page.id,
      payload: { visible: !page.visible },
    });
  };

  const handleDelete = async (page: WebsitePage) => {
    const confirmed = await confirm({
      titleKey: 'website:pages.deleteConfirmTitle',
      descriptionKey: 'website:pages.deleteConfirmDescription',
      confirmLabelKey: 'website:pages.deleteAction',
      intent: 'destructive',
      values: { title: page.title },
    });
    if (!confirmed) return;
    deletePage.mutate({ academyId, pageId: page.id });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:pages.title"
        descriptionKey="website:pages.subtitle"
        actions={
          canManage ? (
            <Button type="button" onClick={createDialog.open}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t('website:pages.createAction')}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                className="flex-1 text-start"
                onClick={() =>
                  navigate(buildPath(DASHBOARD_ROUTES.websitePageEditor, { academyId, pageId: page.id }))
                }
              >
                <p className="font-medium text-foreground">{page.title}</p>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
              </button>

              <div className="flex items-center gap-3">
                {page.pageType === 'core' ? (
                  <StatusBadge labelKey="website:pages.coreBadge" tone="neutral" />
                ) : null}
                {page.coreType === 'courseDetails' ? (
                  <Lock className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <Switch
                    checked={page.visible}
                    disabled={!canManage || (updatePage.isPending && pendingId === page.id)}
                    onCheckedChange={() => toggleVisibility(page)}
                    aria-label={t('website:pages.visibilityToggle')}
                  />
                )}
                {page.pageType === 'custom' && canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(page)}
                    aria-label={t('website:pages.deleteAction')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <CreatePageDialog
          academyId={academyId}
          open={createDialog.isOpen}
          onOpenChange={createDialog.setOpen}
        />
      ) : null}
    </PageContainer>
  );
}
