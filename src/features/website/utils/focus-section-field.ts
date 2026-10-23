/**
 * CMS phase 4 — takes the author to one field of a section's settings
 * (the pre-publish check's "go to"). The section editor names each field's
 * control `section-field-<path with dashes>` (`SectionConfigForm`), and a
 * bilingual one adds `-en` / `-ar` (`LocalizedTextField`). The settings
 * open a moment after the section is selected, so this looks for the
 * control for a short while; a field it never finds (inside a collapsed
 * item, say) leaves the author on the section, which is already open.
 */
export function sectionFieldDomId(path: string): string {
  return `section-field-${path.replace(/\./g, '-')}`;
}

export function focusSectionField(
  path: string | undefined,
  locale?: string,
  { attempts = 20, intervalMs = 50 } = {}
): void {
  if (!path || typeof document === 'undefined') return;
  const base = sectionFieldDomId(path);
  const ids = locale ? [`${base}-${locale}`, base] : [base];
  let tries = 0;
  const look = () => {
    // The page may be gone by now (navigated away, a test torn down).
    if (typeof document === 'undefined') return;
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ block: 'center' });
        element.focus({ preventScroll: true });
        return;
      }
    }
    tries += 1;
    if (tries < attempts) window.setTimeout(look, intervalMs);
  };
  window.setTimeout(look, intervalMs);
}
