/**
 * DNS instructions for a custom domain (P63) — the CNAME the customer must
 * create (target: the platform's fallback origin, read live from the
 * provider) plus every verification record the provider returned. All
 * values are technical and stay LTR regardless of UI direction; each has
 * a one-click copy.
 */
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@hooks';
import type { DomainDnsInstructions } from '@types';

interface CopyValueButtonProps {
  readonly value: string;
  readonly label: string;
}

function CopyValueButton({ value, label }: CopyValueButtonProps): JSX.Element {
  const { hasCopied, copy } = useCopyToClipboard();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      aria-label={label}
      onClick={() => void copy(value)}
    >
      {hasCopied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </Button>
  );
}

export interface DnsRecordsTableProps {
  readonly hostname: string;
  readonly dns: DomainDnsInstructions;
}

export function DnsRecordsTable({ hostname, dns }: DnsRecordsTableProps): JSX.Element {
  const { t } = useTranslation();
  const rows: readonly { readonly type: string; readonly name: string; readonly value: string }[] = [
    ...(dns.cnameTarget
      ? [{ type: 'CNAME', name: hostname, value: dns.cnameTarget }]
      : []),
    ...dns.records.map((record) => ({
      type: record.type.toUpperCase(),
      name: record.name,
      value: record.value,
    })),
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {t('website:domain.custom.dnsInstructionsTitle')}
      </p>
      <p className="text-sm text-muted-foreground">
        {t('website:domain.custom.dnsInstructionsHelp')}
      </p>
      {!dns.cnameTarget ? (
        <p className="text-sm text-warning" role="status">
          {t('website:domain.custom.cnameTargetUnavailable')}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm" dir="ltr">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">{t('website:domain.custom.dnsType')}</th>
              <th className="p-2 text-left">{t('website:domain.custom.dnsName')}</th>
              <th className="p-2 text-left">{t('website:domain.custom.dnsValue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.type}-${row.name}-${index}`} className="border-t border-border align-top">
                <td className="p-2 font-mono">{row.type}</td>
                <td className="p-2 font-mono break-all">
                  <span className="inline-flex items-start gap-1">
                    <span>{row.name}</span>
                    <CopyValueButton value={row.name} label={t('website:domain.custom.copyValue')} />
                  </span>
                </td>
                <td className="p-2 font-mono break-all">
                  <span className="inline-flex items-start gap-1">
                    <span>{row.value}</span>
                    <CopyValueButton value={row.value} label={t('website:domain.custom.copyValue')} />
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={3} className="p-3 text-center text-muted-foreground" dir="auto">
                  {t('website:domain.custom.dnsRecordsPending')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
