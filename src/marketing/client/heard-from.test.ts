// @vitest-environment jsdom
/**
 * G1 — the contact form's optional "How did you first hear about us?":
 * answers shuffled with Other last and the placeholder first, the free text
 * shown only for Other, and the request fields built from the form.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { heardFromFields, initHeardFrom } from './heard-from';

const OPTIONS = ['facebook', 'youtube', 'tiktok', 'instagram', 'whatsapp', 'teacher_referral', 'assistant_or_agency', 'google_search', 'ai_assistant', 'event', 'other'];

function form(): HTMLFormElement {
  document.body.innerHTML = `
    <form data-contact-form>
      <select name="heardFrom" data-heard-from>
        <option value="">Choose an answer</option>
        ${OPTIONS.map((o) => `<option value="${o}">${o}</option>`).join('')}
      </select>
      <div data-heard-from-other hidden><input name="heardFromOther" maxlength="100"></div>
    </form>`;
  return document.querySelector('form') as HTMLFormElement;
}

const values = (f: HTMLFormElement) =>
  Array.from((f.elements.namedItem('heardFrom') as HTMLSelectElement).options).map((o) => o.value);

describe('heard-from field', () => {
  let f: HTMLFormElement;
  beforeEach(() => {
    f = form();
  });

  it('shuffles the answers, keeping the placeholder first and Other last', () => {
    initHeardFrom(f, () => 0);
    const order = values(f);
    expect(order[0]).toBe('');
    expect(order[order.length - 1]).toBe('other');
    expect(new Set(order)).toEqual(new Set(['', ...OPTIONS]));
    expect(order.slice(1, -1)).not.toEqual(OPTIONS.slice(0, -1));
  });

  it('shows the free text only while Other is chosen', () => {
    initHeardFrom(f);
    const select = f.elements.namedItem('heardFrom') as HTMLSelectElement;
    const other = f.querySelector<HTMLElement>('[data-heard-from-other]')!;
    expect(other.hidden).toBe(true);
    select.value = 'other';
    select.dispatchEvent(new Event('change'));
    expect(other.hidden).toBe(false);
    select.value = 'youtube';
    select.dispatchEvent(new Event('change'));
    expect(other.hidden).toBe(true);
  });

  it('sends nothing when unanswered, the text only with Other, never an email', () => {
    const select = f.elements.namedItem('heardFrom') as HTMLSelectElement;
    const text = f.elements.namedItem('heardFromOther') as HTMLInputElement;
    expect(heardFromFields(f)).toEqual({});
    select.value = 'whatsapp';
    text.value = 'ignored';
    expect(heardFromFields(f)).toEqual({ heardFrom: 'whatsapp' });
    select.value = 'other';
    text.value = '  a poster at the centre ';
    expect(heardFromFields(f)).toEqual({ heardFrom: 'other', heardFromOther: 'a poster at the centre' });
    text.value = 'me@mail.test';
    expect(heardFromFields(f)).toEqual({ heardFrom: 'other' });
  });
});
