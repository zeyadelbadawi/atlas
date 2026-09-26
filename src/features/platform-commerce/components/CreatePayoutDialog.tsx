/**
 * Create Payout dialog.
 *
 * Records a payout for ONE academy over ONE period. The backend computes
 * the amount from the academy's unsettled revenue — the Platform Owner never
 * types a sum — and creates one payout per currency. An empty result is an
 * honest "nothing owed for this period", shown inline rather than as an
 * error or a fabricated zero payout.
 *
 * The form mirrors `CreateAcademyPayoutDto` (academy + two ISO dates) and
 * the service's own rule that the period must end after it starts.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@hooks';
import { useToast } from '@app/providers';
import { apiErrorMessage } from '@utils';
import { usePlatformAcademies } from '@features/platform';
import { useCreateAcademyPayout } from '../hooks';
import {
  createPayoutSchema,
  toPayoutPeriod,
  type CreatePayoutFormData,
} from '../schemas/platform-commerce.schemas';

const ACADEMY_PICKER_PAGE_SIZE = 50;

export interface CreatePayoutDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreatePayoutDialog({
  open,
  onOpenChange,
}: CreatePayoutDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const createPayout = useCreateAcademyPayout();
  const [academySearch, setAcademySearch] = useState('');
  const [nothingOwed, setNothingOwed] = useState(false);
  const debouncedSearch = useDebounce(academySearch);

  const academies = usePlatformAcademies({
    query: {
      pagination: { page: 1, pageSize: ACADEMY_PICKER_PAGE_SIZE },
      search: debouncedSearch,
    },
  });

  const form = useForm<CreatePayoutFormData>({
    resolver: zodResolver(createPayoutSchema),
    defaultValues: { academyId: '', periodStart: '', periodEnd: '' },
  });

  // A reopened dialog starts clean — never a previous attempt's outcome.
  const { reset: resetForm } = form;
  const { reset: resetMutation } = createPayout;
  useEffect(() => {
    if (!open) return;
    resetForm();
    resetMutation();
    setNothingOwed(false);
    setAcademySearch('');
  }, [open, resetForm, resetMutation]);

  const onSubmit = (data: CreatePayoutFormData) => {
    setNothingOwed(false);
    createPayout.mutate(
      { academyId: data.academyId, ...toPayoutPeriod(data) },
      {
        onSuccess: (payouts) => {
          if (payouts.length === 0) {
            setNothingOwed(true);
            return;
          }
          notifySuccess(
            'platformCommerce:payouts.create.successTitle',
            'platformCommerce:payouts.create.successDescription',
            { count: payouts.length }
          );
          onOpenChange(false);
        },
      }
    );
  };

  const academyOptions = academies.data?.items ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!createPayout.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('platformCommerce:payouts.create.title')}
          </DialogTitle>
          <DialogDescription>
            {t('platformCommerce:payouts.create.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="create-payout-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <label
                htmlFor="create-payout-academy-search"
                className="text-sm font-medium"
              >
                {t('platformCommerce:payouts.create.academySearch')}
              </label>
              <Input
                id="create-payout-academy-search"
                type="search"
                value={academySearch}
                onChange={(event) => setAcademySearch(event.target.value)}
                placeholder={t(
                  'platformCommerce:payouts.create.academySearchPlaceholder'
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="academyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('platformCommerce:payouts.create.academy')}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={academies.isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            academies.isLoading
                              ? t(
                                  'platformCommerce:payouts.create.academyLoading'
                                )
                              : t(
                                  'platformCommerce:payouts.create.academyPlaceholder'
                                )
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {academyOptions.length === 0 ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t('platformCommerce:payouts.create.academyNone')}
                        </p>
                      ) : (
                        academyOptions.map((academy) => (
                          <SelectItem key={academy.id} value={academy.id}>
                            {academy.name}
                            <span className="ms-1 text-muted-foreground">
                              ({academy.organizationName})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {academies.error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {t('platformCommerce:payouts.create.academyLoadError')}{' '}
                      <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => void academies.refetch()}
                      >
                        {t('common:actions.retry')}
                      </button>
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('platformCommerce:payouts.create.periodStart')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('platformCommerce:payouts.create.periodEnd')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('platformCommerce:payouts.create.periodHint')}
            </p>

            {nothingOwed ? (
              <Alert role="status">
                <Info className="size-4" aria-hidden />
                <AlertDescription>
                  {t('platformCommerce:payouts.create.nothingOwed')}
                </AlertDescription>
              </Alert>
            ) : null}

            {createPayout.error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {apiErrorMessage(t, i18n, createPayout.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPayout.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="create-payout-form"
            disabled={createPayout.isPending}
          >
            {createPayout.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('platformCommerce:payouts.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
