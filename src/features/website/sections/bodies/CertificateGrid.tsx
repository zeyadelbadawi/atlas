/**
 * CMS phase 3d (batch D) — the certificates section's shared body: framed
 * images of certificates and awards, each with its title, issuer and year.
 * Distinct from `logos` (small partner marks in equal tiles): a certificate
 * is a document, shown whole in a mat at a fixed 4:3 frame.
 *
 * - The frame reserves its box (no layout shift) and the image loads lazily,
 *   contained, never cropped.
 * - The full-size view is a plain link to the image in a new tab — no
 *   lightbox, no script. Its name says what it opens; the caption names the
 *   certificate, so the image itself is not announced twice.
 * - Previews draw it unlinked (section previews never navigate).
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { ThemeImage } from '@/features/website/theme-assets';
import type { ResolvedCertificate } from './journey-proof.logic';

/** Columns by how many certificates there are. */
const COLUMNS: Record<number, string> = {
  1: 'mx-auto w-full max-w-md',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
};

export interface CertificateGridClasses {
  readonly list?: string;
  readonly card?: string;
  /** The mat around the image (background, border, padding, radius). */
  readonly frame?: string;
  /** The full-size link around the frame (focus ring). */
  readonly link?: string;
  readonly title?: string;
  /** The issuer and year line. */
  readonly meta?: string;
}

export function CertificateGrid({
  certificates,
  interactive,
  classes = {},
}: {
  readonly certificates: readonly ResolvedCertificate[];
  /** The public site links to the full-size image; previews do not. */
  readonly interactive: boolean;
  readonly classes?: CertificateGridClasses;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul
      role="list"
      data-certificates=""
      className={cn(
        'grid grid-cols-1 gap-6 lg:gap-8',
        COLUMNS[Math.min(certificates.length, 3)],
        classes.list
      )}
    >
      {certificates.map((certificate) => {
        const frame = (
          <div
            data-certificate-frame=""
            className={cn(
              'relative aspect-[4/3] overflow-hidden p-3 sm:p-4',
              classes.frame
            )}
          >
            <ThemeImage
              value={certificate.image}
              // The caption below names the certificate.
              alt=""
              sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
        );
        return (
          <li key={certificate.id} className="min-w-0">
            <figure className={cn('flex h-full flex-col', classes.card)}>
              {interactive && certificate.fullSizeHref ? (
                <a
                  href={certificate.fullSizeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t('website:renderer.certificates.viewFull', {
                    title: certificate.title,
                  })} ${t('website:renderer.opensInNewTab')}`}
                  className={cn('block', classes.link)}
                >
                  {frame}
                </a>
              ) : (
                frame
              )}
              <figcaption className="mt-4">
                <h3 className={cn('break-words', classes.title)}>
                  {certificate.title}
                </h3>
                {certificate.issuer || certificate.year ? (
                  <p className={cn('mt-1 break-words', classes.meta)}>
                    {certificate.issuer}
                    {certificate.issuer && certificate.year
                      ? t('website:renderer.certificates.separator')
                      : null}
                    {certificate.year ? (
                      <time dateTime={certificate.yearValue}>
                        {certificate.year}
                      </time>
                    ) : null}
                  </p>
                ) : null}
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
