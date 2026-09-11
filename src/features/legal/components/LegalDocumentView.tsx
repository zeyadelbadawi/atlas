/**
 * Renders a `LegalDocument`.
 *
 * ACCESSIBILITY AND RTL are the two things that actually matter here.
 * Legal text is long, so it needs real heading structure to be navigable
 * by a screen reader rather than one undifferentiated wall of prose: a
 * single `h1`, one `h2` per section, and a table of contents that is a
 * real list of in-page links.
 *
 * Direction comes from the document's language, not from the surrounding
 * app: the Arabic policy must render right-to-left even if it were ever
 * embedded somewhere left-to-right. `max-w-[65ch]` keeps line length in
 * the readable range that long-form text needs and the rest of the
 * product does not.
 */
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@components/layout';
import type { LegalBlock, LegalDocument } from '../content/legal-content.types';

export interface LegalDocumentViewProps {
  readonly document: LegalDocument;
  /** Drives both `lang` and `dir` — the document's own language, not the app's. */
  readonly language: 'en' | 'ar';
}

function renderBlock(block: LegalBlock, index: number): JSX.Element {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p key={index} className="text-muted-foreground">
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul
          key={index}
          className="list-disc space-y-2 ps-6 text-muted-foreground"
        >
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'definitions':
      return (
        <dl key={index} className="space-y-3">
          {block.items.map((item) => (
            <div key={item.term}>
              <dt className="font-medium text-foreground">{item.term}</dt>
              <dd className="mt-1 text-muted-foreground">{item.detail}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

export function LegalDocumentView({
  document,
  language,
}: LegalDocumentViewProps): JSX.Element {
  const { t } = useTranslation();
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <PageContainer>
      <article
        lang={language}
        dir={direction}
        className="mx-auto w-full max-w-[65ch] py-8"
      >
        <header className="space-y-3 border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            {document.title}
          </h1>
          <p className="text-muted-foreground">{document.summary}</p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <dt>{t('legal:effectiveDate')}:</dt>
              <dd>{document.effectiveDate}</dd>
            </div>
            <div className="flex gap-2">
              <dt>{t('legal:lastUpdated')}:</dt>
              <dd>{document.lastUpdated}</dd>
            </div>
          </dl>
        </header>

        {/* A real navigation landmark, not a decorative list — these
            documents are long enough that jumping matters. */}
        <nav aria-label={t('legal:tableOfContents')} className="my-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('legal:tableOfContents')}
          </h2>
          <ol className="space-y-1">
            {document.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              // Keeps an anchored heading clear of any sticky header.
              className="scroll-mt-24 space-y-4"
              aria-labelledby={`${section.id}-heading`}
            >
              <h2
                id={`${section.id}-heading`}
                className="text-xl font-semibold"
              >
                {section.heading}
              </h2>
              {section.blocks.map(renderBlock)}
            </section>
          ))}
        </div>
      </article>
    </PageContainer>
  );
}
