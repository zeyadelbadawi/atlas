/**
 * "Request a …" — files a Customer Request with the Atlas team.
 *
 * TYPE-AWARE. Opened from a contextual card the type is preset and only
 * that type's own detail fields are shown (a logo asks for a brand name
 * and colours, a domain for the address and whether it is already owned);
 * opened from "New request" a type picker comes first. Every bound mirrors
 * the server (`CreateCustomerRequestDto`, `CUSTOMER_REQUEST_DETAIL_FIELDS`)
 * so a problem is shown next to its field before anything is sent.
 *
 * ONE REQUEST PER OPEN. A `clientRequestId` is generated when the dialog
 * opens and reused by every submit until it closes: a double click, or a
 * retry after a dropped connection whose first attempt actually landed,
 * returns the request already created instead of filing a second one.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@app/providers';
import { useDirtyGuard } from '@features/unsaved-changes';
import { useServerValidation } from '@forms';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { cn } from '@utils';
import {
  CR_NS,
  CUSTOMER_REQUEST_DESCRIPTION_MAX,
  CUSTOMER_REQUEST_DESCRIPTION_MIN,
  CUSTOMER_REQUEST_DETAIL_FIELDS,
  CUSTOMER_REQUEST_PRIORITIES,
  CUSTOMER_REQUEST_TITLE_MAX,
  CUSTOMER_REQUEST_TITLE_MIN,
  CUSTOMER_REQUEST_TYPES,
  DEFAULT_CUSTOMER_REQUEST_PRIORITY,
} from '../constants/customer-request.constants';
import { useCreateCustomerRequest, useCustomerRequestAccess } from '../hooks';
import {
  customerRequestErrorKey,
  customerRequestTypeIcon,
  customerRequestTypeLabelKey,
  newClientRequestId,
} from '../utils/customer-request.utils';
import type {
  CustomerRequestDetail,
  CustomerRequestPriority,
  CustomerRequestType,
} from '../types/customer-request.types';

type OwnedAnswer = 'yes' | 'no' | 'unsure';

const formSchema = z
  .object({
    type: z.enum([
      'logo',
      'domain',
      'theme',
      'custom_section',
      'custom_feature',
    ]),
    title: z
      .string()
      .trim()
      .min(CUSTOMER_REQUEST_TITLE_MIN)
      .max(CUSTOMER_REQUEST_TITLE_MAX),
    description: z
      .string()
      .trim()
      .min(CUSTOMER_REQUEST_DESCRIPTION_MIN)
      .max(CUSTOMER_REQUEST_DESCRIPTION_MAX),
    priority: z.enum(['low', 'normal', 'high']),
    details: z.record(z.string()),
    alreadyOwned: z.enum(['yes', 'no', 'unsure']),
  })
  .superRefine((values, context) => {
    // Only the CHOSEN type's fields count — the others are never sent.
    for (const field of CUSTOMER_REQUEST_DETAIL_FIELDS[values.type]) {
      if (field.kind !== 'text' || !field.maxLength) continue;
      const value = (values.details[field.key] ?? '').trim();
      if (value.length > field.maxLength) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: field.maxLength,
          type: 'string',
          inclusive: true,
          path: ['details', field.key],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

function defaultsFor(type: CustomerRequestType | undefined): FormValues {
  return {
    type: type ?? 'custom_feature',
    title: '',
    description: '',
    priority: DEFAULT_CUSTOMER_REQUEST_PRIORITY,
    details: {},
    alreadyOwned: 'unsure',
  };
}

/** The `details` object the API takes: only this type's non-empty answers. */
function toDetailsPayload(
  values: FormValues
): Record<string, string | boolean> | undefined {
  const out: Record<string, string | boolean> = {};
  for (const field of CUSTOMER_REQUEST_DETAIL_FIELDS[values.type]) {
    if (field.kind === 'boolean') {
      if (values.alreadyOwned !== 'unsure')
        out[field.key] = values.alreadyOwned === 'yes';
      continue;
    }
    const value = (values.details[field.key] ?? '').trim();
    if (value) out[field.key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface CreateCustomerRequestDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Preset type (contextual cards). Without it, a type picker comes first. */
  readonly initialType?: CustomerRequestType;
  /** Defaults to the academy the URL addresses. */
  readonly academyId?: string;
  readonly onCreated?: (request: CustomerRequestDetail) => void;
}

export function CreateCustomerRequestDialog({
  open,
  onOpenChange,
  initialType,
  academyId: academyIdProp,
  onCreated,
}: CreateCustomerRequestDialogProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { academyId: scopeAcademyId } = useCustomerRequestAccess();
  const academyId = academyIdProp ?? scopeAcademyId;
  const createRequest = useCreateCustomerRequest();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFor(initialType),
    mode: 'onTouched',
  });
  const { errors, isDirty, isSubmitting } = form.formState;

  /*
    A fresh id (and a fresh form) every time the dialog opens; the SAME id
    for every submit while it stays open — see the file comment.
  */
  const [clientRequestId, setClientRequestId] = useState(newClientRequestId);
  const { reset } = form;
  useEffect(() => {
    if (!open) return;
    setClientRequestId(newClientRequestId());
    reset(defaultsFor(initialType));
    createRequest.reset();
    // `createRequest` is a new object every render; only an open matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialType, reset]);

  const dirtyGuard = useDirtyGuard(isDirty);
  useServerValidation(form, createRequest.error ?? null);

  const type = form.watch('type');
  const fields = CUSTOMER_REQUEST_DETAIL_FIELDS[type];
  const isBusy = isSubmitting || createRequest.isPending;
  const descriptionLength = form.watch('description').length;

  const close = () => {
    reset(defaultsFor(initialType));
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    // Never close mid-submit: the response would land on a closed dialog.
    if (isBusy) return;
    void dirtyGuard.requestClose(close);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    // The disabled button is the visible guard; this is the real one
    // (a keyboard repeat can fire twice before React re-renders).
    if (!academyId || createRequest.isPending) return;
    const details = toDetailsPayload(values);
    try {
      const created = await createRequest.mutateAsync({
        academyId,
        payload: {
          type: values.type,
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority,
          ...(details ? { details } : {}),
          clientRequestId,
        },
      });
      // Reset BEFORE anything else so the dirty guard never fires on a
      // request that was just filed successfully.
      close();
      onCreated?.(created);
      notify({
        intent: 'success',
        titleKey: `${CR_NS}:create.successTitle`,
        descriptionKey: `${CR_NS}:create.successDescription`,
        action: {
          labelKey: `${CR_NS}:create.viewRequest`,
          onAction: () =>
            navigate(
              buildPath(DASHBOARD_ROUTES.academyRequestDetail, {
                academyId,
                requestId: created.id,
              })
            ),
        },
      });
    } catch (error) {
      // The id is kept: retrying returns the request if the first attempt
      // did land.
      const reasonKey = customerRequestErrorKey(error);
      notify({
        intent: 'error',
        titleKey: `${CR_NS}:create.failed`,
        ...(reasonKey ? { descriptionKey: reasonKey } : {}),
      });
    }
  });

  const titleKey = initialType
    ? `${CR_NS}:types.${initialType}.dialogTitle`
    : `${CR_NS}:create.title`;
  const descriptionKey = initialType
    ? `${CR_NS}:types.${initialType}.dialogDescription`
    : `${CR_NS}:create.description`;

  const errorText = (name: 'title' | 'description'): string | undefined => {
    if (!errors[name]) return undefined;
    return name === 'title'
      ? t(`${CR_NS}:fields.titleInvalid`, {
          min: CUSTOMER_REQUEST_TITLE_MIN,
          max: CUSTOMER_REQUEST_TITLE_MAX,
        })
      : t(`${CR_NS}:fields.descriptionInvalid`, {
          min: CUSTOMER_REQUEST_DESCRIPTION_MIN,
          max: CUSTOMER_REQUEST_DESCRIPTION_MAX,
        });
  };

  const titleError = errorText('title');
  const descriptionError = errorText('description');

  const priorityOptions = useMemo(
    () =>
      CUSTOMER_REQUEST_PRIORITIES.map((priority) => ({
        value: priority,
        label: t(`${CR_NS}:priority.${priority}`),
      })),
    [t]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] overflow-y-auto sm:max-w-xl"
        data-testid="create-customer-request-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(descriptionKey)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {initialType ? null : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                {t(`${CR_NS}:fields.type`)}
              </legend>
              <RadioGroup
                value={type}
                onValueChange={(value) =>
                  form.setValue('type', value as CustomerRequestType, {
                    shouldDirty: true,
                  })
                }
                className="grid gap-2 sm:grid-cols-2"
              >
                {CUSTOMER_REQUEST_TYPES.map((option) => {
                  const Icon = customerRequestTypeIcon(option);
                  const id = fieldId(`type-${option}`);
                  const selected = option === type;
                  return (
                    <Label
                      key={option}
                      htmlFor={id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 font-normal transition-colors hover:bg-muted/50',
                        selected && 'border-primary bg-primary/5'
                      )}
                    >
                      <RadioGroupItem
                        id={id}
                        value={option}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Icon
                            className="size-4 shrink-0 text-primary"
                            aria-hidden
                          />
                          {t(customerRequestTypeLabelKey(option))}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t(`${CR_NS}:types.${option}.description`)}
                        </span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </fieldset>
          )}

          <div className="space-y-2">
            <Label htmlFor={fieldId('title')}>
              {t(`${CR_NS}:fields.title`)}
            </Label>
            <Input
              id={fieldId('title')}
              data-testid="customer-request-title"
              placeholder={t(`${CR_NS}:fields.titlePlaceholder`)}
              maxLength={CUSTOMER_REQUEST_TITLE_MAX + 40}
              dir="auto"
              aria-invalid={!!titleError}
              aria-describedby={fieldId(
                titleError ? 'title-error' : 'title-help'
              )}
              {...form.register('title')}
            />
            {titleError ? (
              <p
                id={fieldId('title-error')}
                className="text-sm text-destructive"
              >
                {titleError}
              </p>
            ) : (
              <p
                id={fieldId('title-help')}
                className="text-xs text-muted-foreground"
              >
                {t(`${CR_NS}:fields.titleHelp`, {
                  min: CUSTOMER_REQUEST_TITLE_MIN,
                  max: CUSTOMER_REQUEST_TITLE_MAX,
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={fieldId('description')}>
              {t(`${CR_NS}:fields.description`)}
            </Label>
            <Textarea
              id={fieldId('description')}
              data-testid="customer-request-description"
              rows={5}
              dir="auto"
              placeholder={t(`${CR_NS}:fields.descriptionPlaceholder`)}
              aria-invalid={!!descriptionError}
              aria-describedby={fieldId(
                descriptionError ? 'description-error' : 'description-help'
              )}
              {...form.register('description')}
            />
            {descriptionError ? (
              <p
                id={fieldId('description-error')}
                className="text-sm text-destructive"
              >
                {descriptionError}
              </p>
            ) : (
              <p
                id={fieldId('description-help')}
                className="flex justify-between gap-3 text-xs text-muted-foreground"
              >
                <span>
                  {t(`${CR_NS}:fields.descriptionHelp`, {
                    min: CUSTOMER_REQUEST_DESCRIPTION_MIN,
                  })}
                </span>
                <span data-atlas-numeric="true" aria-hidden>
                  {t(`${CR_NS}:fields.characterCount`, {
                    count: descriptionLength,
                    max: CUSTOMER_REQUEST_DESCRIPTION_MAX,
                  })}
                </span>
              </p>
            )}
          </div>

          <fieldset
            className="space-y-3"
            data-testid="customer-request-details"
          >
            <legend className="mb-1 text-sm font-medium text-foreground">
              {t(`${CR_NS}:details.heading`)}{' '}
              <span className="font-normal text-muted-foreground">
                ({t(`${CR_NS}:fields.optional`)})
              </span>
            </legend>
            {fields.map((field) => {
              const base = `${CR_NS}:details.${type}.${field.key}`;
              const id = fieldId(`detail-${type}-${field.key}`);
              if (field.kind === 'boolean') {
                return (
                  <div key={field.key} className="space-y-2">
                    <p id={`${id}-label`} className="text-sm font-medium">
                      {t(`${base}.label`)}
                    </p>
                    <RadioGroup
                      aria-labelledby={`${id}-label`}
                      value={form.watch('alreadyOwned')}
                      onValueChange={(value) =>
                        form.setValue('alreadyOwned', value as OwnedAnswer, {
                          shouldDirty: true,
                        })
                      }
                      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4"
                    >
                      {(['yes', 'no', 'unsure'] as const).map((answer) => (
                        <div key={answer} className="flex items-center gap-2">
                          <RadioGroupItem
                            id={`${id}-${answer}`}
                            value={answer}
                          />
                          <Label
                            htmlFor={`${id}-${answer}`}
                            className="font-normal"
                          >
                            {t(`${base}.${answer}`)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              }
              const fieldError = errors.details?.[field.key];
              const controlProps = {
                id,
                'data-testid': `customer-request-detail-${field.key}`,
                dir: 'auto',
                placeholder: t(`${base}.placeholder`),
                'aria-invalid': !!fieldError,
                'aria-describedby': fieldError ? `${id}-error` : undefined,
                ...form.register(`details.${field.key}`),
              } as const;
              return (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={id}>{t(`${base}.label`)}</Label>
                  {field.multiline ? (
                    <Textarea rows={3} {...controlProps} />
                  ) : (
                    <Input {...controlProps} />
                  )}
                  {fieldError ? (
                    <p id={`${id}-error`} className="text-sm text-destructive">
                      {t(`${CR_NS}:fields.tooLong`, { max: field.maxLength })}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              {t(`${CR_NS}:fields.priority`)}
            </legend>
            <RadioGroup
              value={form.watch('priority')}
              onValueChange={(value) =>
                form.setValue('priority', value as CustomerRequestPriority, {
                  shouldDirty: true,
                })
              }
              aria-describedby={fieldId('priority-help')}
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              {priorityOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    id={fieldId(`priority-${option.value}`)}
                    value={option.value}
                  />
                  <Label
                    htmlFor={fieldId(`priority-${option.value}`)}
                    className="font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p
              id={fieldId('priority-help')}
              className="text-xs text-muted-foreground"
            >
              {t(`${CR_NS}:fields.priorityHelp`)}
            </p>
          </fieldset>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => handleOpenChange(false)}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="customer-request-submit"
              disabled={isBusy || !academyId}
              aria-busy={isBusy}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {isBusy
                ? t(`${CR_NS}:create.submitting`)
                : t(`${CR_NS}:create.submit`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
