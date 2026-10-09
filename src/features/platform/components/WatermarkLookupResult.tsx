/**
 * A successful watermark lookup (docs/FORENSIC_WATERMARK.md): a summary
 * banner, then the viewer at issue time, what was watched, the session,
 * the device and network, the watermark's own activity, and the other
 * codes issued to the same session.
 *
 * Everything shown is the server's: the identity is the snapshot taken
 * when the code was issued (it survives account deletion), and the
 * current account state is read at lookup time. Nothing here is cached
 * beyond the page (the hook uses `gcTime: 0` and is never persisted).
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  EyeOff,
  Eye,
  HelpCircle,
  Info,
  Monitor,
  PlayCircle,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Tablet,
  UserRound,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionCard } from '@components/layout';
import { StatusBadge } from '@components/data-display';
import { EmptyState } from '@components/feedback';
import { CountryFlag, formatInternational } from '@components/phone';
import { useDateFormatter, useLanguage } from '@hooks';
import {
  cn,
  formatCountryName,
  formatNumber,
  formatRelativeTime,
} from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type {
  WatermarkDeviceType,
  WatermarkLookupResponse,
  WatermarkRelatedCode,
  WatermarkSurface,
} from '../services/PlatformWatermarkService';
import {
  ACCOUNT_STATE_TONE,
  accountStateLabelKey,
  relatedContentTitle,
  surfaceLabelKey,
} from '../utils/watermark-lookup.utils';
import {
  CountryValue,
  DateValue,
  Field,
  FieldList,
  LtrValue,
  NotRecorded,
  TextValue,
  WatermarkCopyButton,
} from './WatermarkLookupPrimitives';

const K = 'platform:watermarkLookup';

const SURFACE_ICON: Readonly<Record<WatermarkSurface, LucideIcon>> = {
  lesson_video: PlayCircle,
  course_preview: Eye,
  live_session: Radio,
};

const DEVICE_ICON: Readonly<Record<WatermarkDeviceType, LucideIcon>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  unknown: HelpCircle,
};

/* ------------------------------------------------------------------ *
 * Small pieces
 * ------------------------------------------------------------------ */

function SurfaceBadge({
  surface,
}: {
  readonly surface: WatermarkSurface;
}): JSX.Element {
  const { t } = useTranslation();
  const Icon = SURFACE_ICON[surface];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {t(surfaceLabelKey(surface))}
    </span>
  );
}

type CalloutTone = 'warning' | 'info' | 'destructive';

const CALLOUT_CLASS: Readonly<Record<CalloutTone, string>> = {
  warning: 'border-warning/40 bg-warning-surface [&_svg]:text-warning',
  info: 'border-info/40 bg-info-surface [&_svg]:text-info',
  destructive:
    'border-destructive/40 bg-destructive-surface [&_svg]:text-destructive',
};

function Callout({
  tone,
  icon: Icon,
  title,
  children,
  testId,
}: {
  readonly tone: CalloutTone;
  readonly icon: LucideIcon;
  readonly title?: string;
  readonly children: ReactNode;
  readonly testId?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border p-3 text-sm',
        CALLOUT_CLASS[tone]
      )}
      data-testid={testId}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5 text-foreground">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

function SubHeading({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function InlineLink({
  to,
  children,
}: {
  readonly to: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

function PhoneValue({
  phone,
  country,
}: {
  readonly phone: string | null;
  readonly country: string | null;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (!phone) return <NotRecorded />;
  const code = country?.toUpperCase() ?? null;
  const countryName = code ? formatCountryName(code, language) : undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1">
        {code && countryName ? <CountryFlag country={code} /> : null}
        <span
          dir="ltr"
          data-ltr-content
          className="tabular-nums"
          data-testid="watermark-phone"
        >
          {formatInternational(phone)}
        </span>
        <WatermarkCopyButton value={phone} label={t(`${K}.viewer.copyPhone`)} />
      </span>
      {countryName ? (
        <span className="text-xs text-muted-foreground">{countryName}</span>
      ) : null}
    </span>
  );
}

function issuedForCode(code: string): string {
  return `${DASHBOARD_ROUTES.platformWatermarks}?code=${encodeURIComponent(code)}`;
}

/* ------------------------------------------------------------------ *
 * Summary banner
 * ------------------------------------------------------------------ */

function SummaryBanner({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { account } = data;
  const canOpenAccount =
    account.userId !== null &&
    (account.state === 'active' || account.state === 'suspended');

  return (
    <section
      aria-labelledby="watermark-summary-heading"
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs sm:p-6"
      data-testid="watermark-summary"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <h2
            id="watermark-summary-heading"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t(`${K}.summary.label`)}
          </h2>
          <div className="flex items-center gap-1">
            <span
              dir="ltr"
              data-ltr-content
              data-testid="watermark-summary-code"
              className="font-mono text-2xl font-semibold tracking-[0.18em] text-foreground sm:text-3xl"
            >
              {data.code}
            </span>
            <WatermarkCopyButton
              value={data.code}
              label={t(`${K}.summary.copyCode`)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceBadge surface={data.surface} />
            <StatusBadge
              labelKey={accountStateLabelKey(account.state)}
              tone={ACCOUNT_STATE_TONE[account.state]}
            />
            {data.tamperEvents > 0 ? (
              <StatusBadge
                labelKey={`${K}.summary.tamperCount`}
                values={{ count: formatNumber(data.tamperEvents, language) }}
                tone="warning"
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">
              {t(`${K}.summary.issued`)}
            </dt>
            <dt className="text-muted-foreground">
              {t(`${K}.summary.lastSeen`)}
            </dt>
            <dd className="font-medium text-foreground">
              <time dateTime={data.issuedAt}>
                {fmt.dateTime(data.issuedAt)}
              </time>
            </dd>
            <dd className="font-medium text-foreground">
              <time dateTime={data.lastSeenAt}>
                {fmt.dateTime(data.lastSeenAt)}
              </time>
            </dd>
          </dl>
          {canOpenAccount && account.userId ? (
            <Button asChild variant="outline" size="sm">
              <Link
                to={buildPath(DASHBOARD_ROUTES.platformUserDetail, {
                  userId: account.userId,
                })}
              >
                <UserRound aria-hidden />
                {t(`${K}.summary.openAccount`)}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {account.state === 'deleted' ? (
        <Callout
          tone="destructive"
          icon={UserX}
          title={t(`${K}.summary.deleted.title`)}
          testId="watermark-deleted-notice"
        >
          {t(`${K}.summary.deleted.body`)}
        </Callout>
      ) : null}
      {account.state === 'missing' ? (
        <Callout
          tone="warning"
          icon={UserX}
          title={t(`${K}.summary.missing.title`)}
        >
          {t(`${K}.summary.missing.body`)}
        </Callout>
      ) : null}
      {account.state === 'anonymous' ? (
        <Callout
          tone="info"
          icon={Info}
          title={t(`${K}.summary.anonymous.title`)}
          testId="watermark-anonymous-notice"
        >
          {t(`${K}.summary.anonymous.body`)}
        </Callout>
      ) : null}
      {data.snapshotStatus === 'unreadable' ? (
        <Callout
          tone="warning"
          icon={AlertTriangle}
          title={t(`${K}.summary.unreadable.title`)}
          testId="watermark-unreadable-notice"
        >
          {t(`${K}.summary.unreadable.body`)}
        </Callout>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

function ViewerCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { account, identityAtIssue, snapshotStatus } = data;

  const identity = (() => {
    if (snapshotStatus === 'absent' || account.state === 'anonymous') {
      return (
        <p className="text-sm text-muted-foreground">
          {t(`${K}.viewer.anonymous`)}
        </p>
      );
    }
    if (snapshotStatus === 'unreadable' || !identityAtIssue) {
      return (
        <Callout tone="warning" icon={AlertTriangle}>
          {t(`${K}.viewer.unreadable`)}
        </Callout>
      );
    }
    return (
      <FieldList>
        <Field label={t(`${K}.viewer.name`)}>
          <span className="font-medium">
            <TextValue value={identityAtIssue.name} />
          </span>
        </Field>
        <Field label={t(`${K}.viewer.email`)}>
          <LtrValue
            value={identityAtIssue.email}
            copyLabel={t(`${K}.viewer.copyEmail`)}
            testId="watermark-identity-email"
          />
        </Field>
        <Field label={t(`${K}.viewer.phone`)}>
          <PhoneValue
            phone={identityAtIssue.phone}
            country={identityAtIssue.phoneCountry}
          />
        </Field>
      </FieldList>
    );
  })();

  return (
    <SectionCard
      titleKey={`${K}.viewer.title`}
      descriptionKey={`${K}.viewer.description`}
    >
      <div className="space-y-5">
        {identity}

        {account.state !== 'anonymous' ? (
          <div className="space-y-3 border-t border-border pt-4">
            <SubHeading>{t(`${K}.viewer.current.title`)}</SubHeading>
            <FieldList>
              <Field label={t(`${K}.viewer.current.status`)}>
                <StatusBadge
                  labelKey={accountStateLabelKey(account.state)}
                  tone={ACCOUNT_STATE_TONE[account.state]}
                />
              </Field>
              {account.state === 'active' || account.state === 'suspended' ? (
                <>
                  <Field label={t(`${K}.viewer.current.name`)}>
                    <TextValue value={account.currentName} />
                  </Field>
                  <Field label={t(`${K}.viewer.current.email`)}>
                    <LtrValue
                      value={account.currentEmail}
                      copyLabel={t(`${K}.viewer.copyEmail`)}
                    />
                  </Field>
                </>
              ) : null}
              {account.deletedAt ? (
                <Field label={t(`${K}.viewer.current.deletedAt`)}>
                  <DateValue value={account.deletedAt} format={fmt.dateTime} />
                </Field>
              ) : null}
              {account.userId ? (
                <Field label={t(`${K}.viewer.current.userId`)}>
                  <LtrValue
                    value={account.userId}
                    mono
                    copyLabel={t(`${K}.viewer.current.copyUserId`)}
                  />
                </Field>
              ) : null}
            </FieldList>
            {account.state === 'deleted' ? (
              <p className="text-sm text-muted-foreground">
                {t(`${K}.viewer.current.deletedNotice`)}
              </p>
            ) : null}
            {account.state === 'missing' ? (
              <p className="text-sm text-muted-foreground">
                {t(`${K}.viewer.current.missingNotice`)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function ContentCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { organization, academy, course, lesson, liveSession } = data.content;
  const untitled = t(`${K}.values.untitled`);

  return (
    <SectionCard
      titleKey={`${K}.content.title`}
      descriptionKey={`${K}.content.description`}
    >
      <FieldList>
        <Field label={t(`${K}.content.surface`)}>
          <SurfaceBadge surface={data.surface} />
        </Field>
        <Field label={t(`${K}.content.organization`)}>
          {organization.id ? (
            <InlineLink
              to={buildPath(DASHBOARD_ROUTES.platformOrganizationDetail, {
                organizationId: organization.id,
              })}
            >
              <TextValue value={organization.name ?? untitled} />
            </InlineLink>
          ) : (
            <TextValue value={organization.name} />
          )}
        </Field>
        <Field label={t(`${K}.content.academy`)}>
          <InlineLink
            to={buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
              academyId: academy.id,
            })}
          >
            <TextValue value={academy.name ?? untitled} />
          </InlineLink>
        </Field>
        {course ? (
          <Field label={t(`${K}.content.course`)}>
            <TextValue value={course.title ?? untitled} />
          </Field>
        ) : null}
        {lesson ? (
          <Field label={t(`${K}.content.lesson`)}>
            <TextValue value={lesson.title ?? untitled} />
          </Field>
        ) : null}
        {liveSession ? (
          <>
            <Field label={t(`${K}.content.liveSession`)}>
              <TextValue value={liveSession.title ?? untitled} />
            </Field>
            <Field label={t(`${K}.content.scheduledFor`)}>
              <DateValue
                value={liveSession.scheduledStartAt}
                format={fmt.dateTime}
              />
            </Field>
          </>
        ) : null}
      </FieldList>
    </SectionCard>
  );
}

function SessionCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { session } = data;
  const isAnonymous = data.account.state === 'anonymous' && !session.id;

  return (
    <SectionCard
      titleKey={`${K}.session.title`}
      descriptionKey={`${K}.session.description`}
    >
      {isAnonymous ? (
        <p className="text-sm text-muted-foreground">
          {t(`${K}.session.none`)}
        </p>
      ) : (
        <FieldList>
          <Field label={t(`${K}.session.id`)}>
            <LtrValue
              value={session.id}
              mono
              copyLabel={t(`${K}.session.copyId`)}
              testId="watermark-session-id"
            />
          </Field>
          <Field label={t(`${K}.session.startedAt`)}>
            <DateValue value={session.startedAt} format={fmt.dateTime} />
          </Field>
          <Field label={t(`${K}.session.signInIp`)}>
            <LtrValue
              value={session.signInIp}
              mono
              copyLabel={t(`${K}.session.copySignInIp`)}
            />
          </Field>
          <Field label={t(`${K}.session.signInCountry`)}>
            <CountryValue country={session.signInCountry} />
          </Field>
          <Field label={t(`${K}.session.signInDevice`)}>
            <TextValue value={session.signInDevice} />
          </Field>
        </FieldList>
      )}
    </SectionCard>
  );
}

function DeviceCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const [showAgent, setShowAgent] = useState(false);
  const { device, network } = data;
  const DeviceIcon = DEVICE_ICON[device.type];

  return (
    <SectionCard
      titleKey={`${K}.device.title`}
      descriptionKey={`${K}.device.description`}
    >
      <div className="space-y-4">
        <FieldList>
          <Field label={t(`${K}.device.type`)}>
            <span className="inline-flex items-center gap-2">
              <DeviceIcon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              {t(`${K}.device.types.${device.type}`)}
            </span>
          </Field>
          <Field label={t(`${K}.device.label`)}>
            <TextValue value={device.label} />
          </Field>
          <Field label={t(`${K}.device.browser`)}>
            <TextValue value={device.browser} />
          </Field>
          <Field label={t(`${K}.device.os`)}>
            <TextValue value={device.os} />
          </Field>
          <Field label={t(`${K}.device.ip`)}>
            <LtrValue
              value={network.ip}
              mono
              copyLabel={t(`${K}.device.copyIp`)}
              testId="watermark-network-ip"
            />
          </Field>
          <Field label={t(`${K}.device.country`)}>
            <CountryValue country={network.country} />
          </Field>
          {device.id ? (
            <Field label={t(`${K}.device.deviceId`)}>
              <LtrValue value={device.id} mono />
            </Field>
          ) : null}
        </FieldList>

        {device.userAgent ? (
          <Collapsible open={showAgent} onOpenChange={setShowAgent}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ms-2 text-muted-foreground"
              >
                <ChevronDown
                  className={cn(
                    'transition-transform',
                    showAgent && 'rotate-180'
                  )}
                  aria-hidden
                />
                {showAgent
                  ? t(`${K}.device.hideUserAgent`)
                  : t(`${K}.device.showUserAgent`)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre
                dir="ltr"
                data-ltr-content
                aria-label={t(`${K}.device.userAgent`)}
                className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs text-foreground"
              >
                {device.userAgent}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </SectionCard>
  );
}

function ActivityCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const tampered = data.tamperEvents > 0;

  return (
    <SectionCard
      titleKey={`${K}.activity.title`}
      descriptionKey={`${K}.activity.description`}
      className={cn('lg:col-span-2', tampered && 'border-warning/50')}
    >
      {/* Full width on large screens: the facts beside the verdict. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <FieldList>
          <Field label={t(`${K}.activity.issuedAt`)}>
            <DateValue value={data.issuedAt} format={fmt.dateTime} />
          </Field>
          <Field label={t(`${K}.activity.lastSeenAt`)}>
            <span>
              <DateValue value={data.lastSeenAt} format={fmt.dateTime} />{' '}
              <span className="text-muted-foreground">
                ({formatRelativeTime(data.lastSeenAt, language)})
              </span>
            </span>
          </Field>
          <Field label={t(`${K}.activity.tamperEvents`)}>
            <span
              data-testid="watermark-tamper-count"
              className={cn(
                'font-semibold tabular-nums',
                tampered ? 'text-warning' : 'text-foreground'
              )}
            >
              {formatNumber(data.tamperEvents, language)}
            </span>
          </Field>
          {data.lastTamperAt ? (
            <Field label={t(`${K}.activity.lastTamperAt`)}>
              <DateValue value={data.lastTamperAt} format={fmt.dateTime} />
            </Field>
          ) : null}
        </FieldList>
        {tampered ? (
          <Callout
            tone="warning"
            icon={ShieldAlert}
            title={t(`${K}.activity.tamperTitle`)}
            testId="watermark-tamper-warning"
          >
            {t(`${K}.activity.tamperBody`)}
          </Callout>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden />
            {t(`${K}.activity.noTamper`)}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function RelatedContent({
  related,
}: {
  readonly related: WatermarkRelatedCode;
}): JSX.Element {
  const { t } = useTranslation();
  const { primary, secondary } = relatedContentTitle(related);
  return (
    <span className="block min-w-0">
      <span className="block truncate text-foreground" dir="auto">
        {primary ?? t(`${K}.values.untitled`)}
      </span>
      {secondary ? (
        <span
          className="block truncate text-xs text-muted-foreground"
          dir="auto"
        >
          {secondary}
        </span>
      ) : null}
    </span>
  );
}

function RelatedCodeLink({ code }: { readonly code: string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <Link
      to={issuedForCode(code)}
      aria-label={t(`${K}.related.open`, { code })}
      className="rounded-sm font-mono font-medium tracking-wider text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span dir="ltr" data-ltr-content>
        {code}
      </span>
    </Link>
  );
}

function RelatedCodesCard({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const rows = data.relatedInSession;

  const tamperCell = (count: number) => (
    <span
      className={cn(
        'tabular-nums',
        count > 0 ? 'font-semibold text-warning' : 'text-muted-foreground'
      )}
    >
      {formatNumber(count, language)}
    </span>
  );

  return (
    <SectionCard
      titleKey={`${K}.related.title`}
      descriptionKey={`${K}.related.description`}
      flushBody={rows.length > 0}
      className="lg:col-span-2"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={EyeOff}
          titleKey={`${K}.related.empty.title`}
          descriptionKey={`${K}.related.empty.description`}
          className="py-8"
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table aria-label={t(`${K}.related.caption`)}>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">
                    {t(`${K}.related.code`)}
                  </TableHead>
                  <TableHead>{t(`${K}.related.surface`)}</TableHead>
                  <TableHead>{t(`${K}.related.content`)}</TableHead>
                  <TableHead>{t(`${K}.related.issued`)}</TableHead>
                  <TableHead>{t(`${K}.related.lastSeen`)}</TableHead>
                  <TableHead className="pe-6 text-end">
                    {t(`${K}.related.tamper`)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="whitespace-nowrap ps-6">
                      <RelatedCodeLink code={row.code} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SurfaceBadge surface={row.surface} />
                    </TableCell>
                    <TableCell className="max-w-[16rem]">
                      <RelatedContent related={row} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <time dateTime={row.issuedAt}>
                        {fmt.dateTime(row.issuedAt)}
                      </time>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <time dateTime={row.lastSeenAt}>
                        {fmt.dateTime(row.lastSeenAt)}
                      </time>
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      {tamperCell(row.tamperEvents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul
            aria-label={t(`${K}.related.caption`)}
            className="divide-y divide-border md:hidden"
          >
            {rows.map((row) => (
              <li key={row.code} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <RelatedCodeLink code={row.code} />
                  <SurfaceBadge surface={row.surface} />
                </div>
                <RelatedContent related={row} />
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t(`${K}.related.issued`)}:{' '}
                    <time dateTime={row.issuedAt}>
                      {fmt.dateTime(row.issuedAt)}
                    </time>
                  </span>
                  <span>
                    {t(`${K}.related.tamper`)}: {tamperCell(row.tamperEvents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ *
 * The result
 * ------------------------------------------------------------------ */

export function WatermarkLookupResult({
  data,
}: {
  readonly data: WatermarkLookupResponse;
}): JSX.Element {
  return (
    <div className="space-y-4" data-testid="watermark-result">
      <SummaryBanner data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ViewerCard data={data} />
        <ContentCard data={data} />
        <SessionCard data={data} />
        <DeviceCard data={data} />
        <ActivityCard data={data} />
        <RelatedCodesCard data={data} />
      </div>
    </div>
  );
}
