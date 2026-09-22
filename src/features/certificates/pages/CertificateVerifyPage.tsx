/**
 * `/verify/:code` — the public certificate verification page (P64 Phase 3, D6).
 *
 * One component, two hosts. On the platform host it renders inside
 * `PublicLayout` with its own narrow container; on an academy host
 * `PublicWebsiteRouter` passes `renderFrame` so the very same sheet sits
 * inside that academy's website chrome. What is shown never differs — the
 * fact sheet carries no identity beyond the academy name the server
 * returns — only the chrome around it does.
 *
 * Works without a session: the code is the credential.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CertificateVerifySheet } from '../components/CertificateVerifySheet';

export interface CertificateVerifyFrame {
  /**
   * Localized page title — an ELEMENT that translates itself where the
   * frame renders it, not a string translated here. The academy site's
   * shell switches the active language from its own `useEffect`, and
   * React runs child effects before parent effects: a string computed by
   * this page would be produced before the switch and never refreshed
   * (the page had not subscribed yet when the event fired), leaving an
   * English heading over an Arabic sheet — observed on production, 22 Sep
   * 2026. An element rendered inside the frame subscribes deeper than the
   * shell and follows the language exactly like the sheet does.
   */
  readonly title: ReactNode;
  /** Localized one-line explanation of the page; same contract as `title`. */
  readonly subtitle: ReactNode;
  /** This page's own bare path, e.g. `/verify/ABCD…` — for locale switchers that rebuild the URL. */
  readonly path: string;
  readonly content: ReactNode;
}

export interface CertificateVerifyPageProps {
  /**
   * Wraps the sheet in host-specific chrome. Omitted on the platform host,
   * where the page frames itself.
   */
  readonly renderFrame?: (frame: CertificateVerifyFrame) => ReactNode;
}

/** Translates one key at the point where the frame renders it (see `CertificateVerifyFrame.title`). */
function FrameText({ translationKey }: { readonly translationKey: string }): JSX.Element {
  const { t } = useTranslation();
  return <>{t(translationKey)}</>;
}

export default function CertificateVerifyPage({
  renderFrame,
}: CertificateVerifyPageProps): JSX.Element {
  const { code = '' } = useParams<{ code: string }>();
  const normalizedCode = code.trim();

  const title = <FrameText translationKey="certificates:verify.title" />;
  const subtitle = <FrameText translationKey="certificates:verify.subtitle" />;
  const content = <CertificateVerifySheet code={normalizedCode} />;

  if (renderFrame) {
    return (
      <>
        {renderFrame({
          title,
          subtitle,
          path: `/verify/${encodeURIComponent(normalizedCode)}`,
          content,
        })}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </header>
      {content}
    </div>
  );
}
