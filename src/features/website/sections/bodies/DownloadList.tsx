/**
 * CMS phase 3d (batch D) — the downloads section's shared body: PDF notes,
 * revision sheets and other files, each a whole-row link at least 44px tall
 * with a file icon, the title, an optional description and the type/size.
 *
 * - The link's accessible name starts with the visible title and says the
 *   type ("Revision sheet — PDF, 2.4 MB") and what will happen: a file from
 *   the academy's own media library downloads in place (`download`, same
 *   origin only); anything else opens in a new tab with
 *   `rel="noopener noreferrer"`. The description is its description.
 * - Previews draw the rows unlinked (section previews never navigate) and
 *   keep a row without a link yet, saying so; the public site leaves it out.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@utils';
import type { DownloadKind, ResolvedDownload } from './journey-proof.logic';

const KIND_ICONS: Readonly<Record<DownloadKind, LucideIcon>> = {
  pdf: FileText,
  document: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  image: FileImage,
  archive: FileArchive,
  file: File,
};

export interface DownloadListClasses {
  readonly list?: string;
  /** The row (the link on the public site): surface, border, focus ring. */
  readonly row?: string;
  /** The square plate behind the file icon. */
  readonly icon?: string;
  readonly title?: string;
  readonly description?: string;
  /** The type and size line. */
  readonly meta?: string;
  /** The trailing download / new-tab mark. */
  readonly action?: string;
  /** A preview's "no link yet" line. */
  readonly missing?: string;
}

function DownloadRow({
  download,
  interactive,
  classes,
}: {
  readonly download: ResolvedDownload;
  readonly interactive: boolean;
  readonly classes: DownloadListClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const descriptionId = useId();
  const Icon = KIND_ICONS[download.kind];
  const ActionIcon = download.sameOrigin ? Download : ExternalLink;
  const spokenType =
    download.typeLabel ||
    t(`website:renderer.downloads.kinds.${download.kind}`);
  const meta = [download.typeLabel, download.size].filter(Boolean);
  const rowClass = cn(
    'flex min-h-[4rem] w-full items-center gap-4 p-4 text-start',
    classes.row
  );

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center',
          classes.icon
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block break-words', classes.title)}>
          {download.title}
        </span>
        {download.description ? (
          <span
            id={descriptionId}
            className={cn('mt-0.5 block break-words', classes.description)}
          >
            {download.description}
          </span>
        ) : null}
        {meta.length > 0 ? (
          <span
            data-download-meta=""
            className={cn('mt-1 block', classes.meta)}
          >
            {meta.map((part, index) => (
              <span key={part}>
                {index > 0 ? ' · ' : null}
                <bdi>{part}</bdi>
              </span>
            ))}
          </span>
        ) : null}
        {!download.href ? (
          <span className={cn('mt-1 block', classes.missing)}>
            {t('website:renderer.downloads.previewNoLink')}
          </span>
        ) : null}
      </span>
      {download.href ? (
        <ActionIcon
          aria-hidden
          className={cn('size-5 shrink-0', classes.action)}
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  if (!interactive || !download.href) {
    return <div className={rowClass}>{content}</div>;
  }

  const name = [
    download.size
      ? t('website:renderer.downloads.nameWithSize', {
          title: download.title,
          type: spokenType,
          size: download.size,
        })
      : t('website:renderer.downloads.name', {
          title: download.title,
          type: spokenType,
        }),
    download.sameOrigin
      ? t('website:renderer.downloads.downloads')
      : t('website:renderer.opensInNewTab'),
  ].join(' ');

  return (
    <a
      href={download.href}
      {...(download.sameOrigin
        ? { download: '' }
        : { target: '_blank', rel: 'noopener noreferrer' })}
      aria-label={name}
      aria-describedby={download.description ? descriptionId : undefined}
      className={rowClass}
    >
      {content}
    </a>
  );
}

export function DownloadList({
  downloads,
  interactive,
  classes = {},
}: {
  readonly downloads: readonly ResolvedDownload[];
  /** The public site links; previews draw the rows unlinked. */
  readonly interactive: boolean;
  readonly classes?: DownloadListClasses;
}): JSX.Element {
  return (
    <ul
      role="list"
      data-downloads=""
      className={cn(
        'grid gap-3',
        downloads.length > 1 && 'md:grid-cols-2',
        classes.list
      )}
    >
      {downloads.map((download) => (
        <li key={download.id} className="flex min-w-0">
          <DownloadRow
            download={download}
            interactive={interactive}
            classes={classes}
          />
        </li>
      ))}
    </ul>
  );
}
