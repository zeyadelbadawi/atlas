/**
 * G1 — the contact form's optional "How did you first hear about us?"
 * question. The prerendered list is in the reference order; this shuffles
 * the answers (Other stays last, the empty "Choose an answer" first), shows
 * the free-text box only while Other is chosen, and builds the request
 * fields (`heardFrom`, `heardFromOther` — nothing when unanswered).
 */
import { heardFromPayload, shuffledHeardFromOptions, type HeardFrom } from '@/shared/utils/acquisition-channel.utils';

export function initHeardFrom(form: HTMLFormElement, random: () => number = Math.random): void {
  const select = form.querySelector<HTMLSelectElement>('select[data-heard-from]');
  if (!select) return;
  const byValue = new Map(Array.from(select.options).map((option) => [option.value, option]));
  for (const value of shuffledHeardFromOptions(random) as HeardFrom[]) {
    const option = byValue.get(value);
    if (option) select.append(option);
  }
  const other = form.querySelector<HTMLElement>('[data-heard-from-other]');
  const sync = () => {
    if (other) other.hidden = select.value !== 'other';
  };
  sync();
  select.addEventListener('change', sync);
}

/** The answer's request fields, read from the form. */
export function heardFromFields(form: HTMLFormElement): ReturnType<typeof heardFromPayload> {
  const read = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
  return heardFromPayload(read('heardFrom'), read('heardFromOther'));
}
