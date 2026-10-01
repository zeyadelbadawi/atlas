/**
 * Shared primitives (Theme 1 plan §F.1, Phase 1): semantics, accessibility
 * and the motion rules (§G) — reduced motion and missing
 * IntersectionObserver always give the final, readable state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { Chip } from './Chip';
import { EmptyPanel } from './EmptyPanel';
import { Heading } from './Heading';
import { splitHighlight } from './split-highlight';
import { Reveal } from './Reveal';
import { SectionShell } from './SectionShell';

function inScope(children: ReactNode) {
  return render(
    <WebsiteThemeScope theme={getWebsiteTheme('modern-education')}>
      {children}
    </WebsiteThemeScope>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SectionShell', () => {
  it('is a section landmark named by its heading, with the tone as data', () => {
    inScope(
      <SectionShell labelledBy="why-title" tone="soft">
        <Heading level={2} id="why-title">
          Why us
        </Heading>
      </SectionShell>
    );
    const region = screen.getByRole('region', { name: 'Why us' });
    expect(region.tagName).toBe('SECTION');
    expect(region.getAttribute('data-tone')).toBe('soft');
  });
});

describe('Heading', () => {
  it('keeps the semantic level independent of the visual size', () => {
    inScope(
      <Heading level={2} size="display">
        Big but second-level
      </Heading>
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Big but second-level'
    );
  });

  it('highlights the first occurrence of the phrase, reading as one heading', () => {
    inScope(
      <Heading level={1} highlight="something new">
        Learn something new at Horizon
      </Heading>
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Learn something new at Horizon');
    expect(heading.querySelector('[data-highlight]')?.textContent).toBe(
      'something new'
    );
  });

  it('works for Arabic text and ignores a phrase that is no longer in the title', () => {
    expect(splitHighlight('تعلّم شيئًا جديدًا', 'شيئًا')).toEqual([
      'تعلّم ',
      'شيئًا',
      ' جديدًا',
    ]);
    expect(splitHighlight('Edited title', 'old phrase')).toBeNull();
    expect(splitHighlight('Title', '  ')).toBeNull();
  });
});

describe('Reveal', () => {
  let observers: {
    callback: IntersectionObserverCallback;
    disconnect: ReturnType<typeof vi.fn>;
  }[];

  beforeEach(() => {
    observers = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        disconnect = vi.fn();
        constructor(callback: IntersectionObserverCallback) {
          observers.push({ callback, disconnect: this.disconnect });
        }
        observe() {}
      }
    );
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  function belowTheFold() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 5000,
      bottom: 5200,
    } as DOMRect);
  }

  it('waits below the fold, reveals once when seen, then stops observing', () => {
    belowTheFold();
    const { container } = render(<Reveal>Later</Reveal>);
    const element = container.firstElementChild!;
    expect(element.getAttribute('data-reveal')).toBe('pending');
    act(() => {
      observers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(element.getAttribute('data-reveal')).toBe('revealed');
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(element.textContent).toBe('Later');
  });

  it('never hides content already in view', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 200,
    } as DOMRect);
    const { container } = render(<Reveal>Now</Reveal>);
    expect(container.firstElementChild!.getAttribute('data-reveal')).toBe(
      'revealed'
    );
  });

  it('shows the final state under prefers-reduced-motion', () => {
    belowTheFold();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
    }));
    const { container } = render(<Reveal>Calm</Reveal>);
    expect(container.firstElementChild!.getAttribute('data-reveal')).toBe(
      'revealed'
    );
    expect(observers).toHaveLength(0);
  });

  it('shows the final state without IntersectionObserver', () => {
    belowTheFold();
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Reveal>Old browser</Reveal>);
    expect(container.firstElementChild!.getAttribute('data-reveal')).toBe(
      'revealed'
    );
  });
});

describe('Chip', () => {
  it('is static text when not interactive', () => {
    const { container } = render(<Chip>Design</Chip>);
    expect(container.querySelector('button')).toBeNull();
    expect(container.firstElementChild!.className).toContain(
      'whitespace-nowrap'
    );
  });

  it('is a toggle button with aria-pressed when interactive', () => {
    const onClick = vi.fn();
    render(
      <Chip pressed={false} onClick={onClick}>
        Business
      </Chip>
    );
    const button = screen.getByRole('button', { name: 'Business' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('type')).toBe('button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('EmptyPanel', () => {
  it('gives a heading, a sentence and a next step; the icon is decorative', () => {
    render(
      <EmptyPanel
        title="Courses launching soon"
        description="Check back shortly."
        icon={<svg data-testid="icon" />}
        action={<a href="/contact">Get notified</a>}
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Courses launching soon' })
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Get notified' })).toBeTruthy();
    expect(
      screen.getByTestId('icon').parentElement!.getAttribute('aria-hidden')
    ).toBe('true');
  });
});
